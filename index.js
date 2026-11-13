/**
 * Host half of the Card Tree bundle.
 *
 * Owns the persistent card trees (one JSON file under the DSH home), assembles
 * the branch-aware conversation context for one card, and streams model calls
 * through the Host `llm` service. The Client half (client.js) renders the view
 * and talks to this module over a private set of Web routes registered on the
 * `webServer` service.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const ROUTE_PREFIX = '/dsh-card-tree';
const STATE_VERSION = 1;
const MAX_CHAIN = 200;
const MAX_TOOL_ROUNDS = 6;
const MAX_TOOL_RESULT_CHARS = 8000;
const MAX_TOOL_TOTAL_CHARS = 24000;

/** Context budget: share of the model window we allow our own messages to fill. */
const CONTEXT_SHARE = 0.55;
const FALLBACK_CONTEXT_WINDOW = 32000;
/** An ancestor older than this keeps only its first answer chunk when folded. */
const FOLDED_ANSWER_CHARS = 320;
const MAX_REF_ANSWER_CHARS = 2400;

/** Reference edges point at other cards; their answers join the context. */
const MAX_REFS = 8;
const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const MAX_BODY_BYTES = 96 * 1024 * 1024;
const MAX_INLINE_TEXT_CHARS = 120000;

/**
 * Tools a card may call without asking. Everything here is portable: it exists
 * on any DSH install, reads the workspace or a plugin's data, and never changes
 * anything. Tools that write (write, edit, pwsh, terminal_*, task_board_create,
 * ...) stay out on purpose, so a card can never mutate the machine on its own.
 *
 * 精确枚举，而不是整前缀信任：插件以后新增一个「会写」的工具，不会因为落在同一个
 * 前缀里就自动获得调用权限。名单外的工具即使被模型凭空调用，也会在执行前被拒绝
 * （见 toolCallAllowed）。
 *
 * 这个文件只放**通用**名单。个人机器上装的插件（微信读取、学校服务之类）写进
 * `tools.json`（和 state.json 同目录，默认不进仓库），见 readLocalToolConfig。 */
const READONLY_TOOLS = new Set([
  'read',
  'glob',
  'grep',
  'web_search',
  'web_fetch',
  'working_directory',
  'list_agents',
  'session_search',
  'session_event_search',
  'session_trace',
  'session_event_trace',
  'session_event_read',
  'task_board_list',
  'task_board_get',
]);

/**
 * `tools.json` — machine-local read-only extras. Kept outside the bundle so a
 * public source tree never advertises which personal plugins the author runs.
 *
 *   { "tools": ["my_plugin_status"], "prefixes": ["my_plugin_"],
 *     "params": { "my_plugin_read": ["info", "list"] } }
 */
let localToolConfig = null;

function localToolConfigPath() {
  return path.join(path.dirname(stateFilePath()), 'tools.json');
}

function emptyToolConfig() {
  return { tools: [], prefixes: [], params: {} };
}

/** Normalize one tools.json payload; malformed entries are dropped, never fatal. */
function normalizeToolConfig(raw) {
  const out = emptyToolConfig();
  if (!raw || typeof raw !== 'object') return out;
  if (Array.isArray(raw.tools)) {
    for (const name of raw.tools) {
      if (typeof name === 'string' && name && !out.tools.includes(name)) out.tools.push(name);
    }
  }
  if (Array.isArray(raw.prefixes)) {
    for (const prefix of raw.prefixes) {
      if (typeof prefix === 'string' && prefix && !out.prefixes.includes(prefix)) out.prefixes.push(prefix);
    }
  }
  if (raw.params && typeof raw.params === 'object') {
    for (const [name, actions] of Object.entries(raw.params)) {
      if (!name || !Array.isArray(actions)) continue;
      const clean = actions.filter((action) => typeof action === 'string' && action);
      if (clean.length > 0) out.params[name] = clean;
    }
  }
  return out;
}

function readLocalToolConfig() {
  if (localToolConfig) return localToolConfig;
  const file = localToolConfigPath();
  try {
    localToolConfig = normalizeToolConfig(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[card-tree] 读取 ' + file + ' 失败，按空配置继续：' + error.message);
    }
    localToolConfig = emptyToolConfig();
  }
  return localToolConfig;
}

function reloadLocalToolConfig() {
  localToolConfig = null;
  return readLocalToolConfig();
}

/** Read-only statistics for /health: built-in vs. machine-local. */
function readonlyStats() {
  const local = readLocalToolConfig();
  return { builtin: READONLY_TOOLS.size, local: local.tools.length, prefixes: local.prefixes.length };
}

function isReadonlyTool(name) {
  if (typeof name !== 'string' || !name) return false;
  if (READONLY_TOOLS.has(name)) return true;
  const local = readLocalToolConfig();
  if (local.tools.includes(name)) return true;
  return local.prefixes.some((prefix) => name.startsWith(prefix));
}

/** 带 mode/action 参数的工具：只放行查询类取值（由本地配置声明）。 */
function allowedParamsFor(name) {
  const configured = readLocalToolConfig().params[name];
  return configured ? new Set(configured) : null;
}

/** Parse one tool call's arguments; null means malformed JSON. */
function toolCallArgs(call) {
  const raw = call && call.arguments;
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return null;
  }
}

/**
 * 执行前的最后一道闸：白名单命中 + 参数级允许清单。模型的调用不经过 schema
 * 校验，所以不能只靠「我们只把只读工具放进 tools」来保证安全。 */
function toolCallAllowed(call) {
  if (!call || typeof call.name !== 'string' || !call.name) {
    return { ok: false, reason: '工具调用缺少 name' };
  }
  if (!isReadonlyTool(call.name)) {
    return { ok: false, reason: '工具 ' + call.name + ' 不在只读白名单内，已拒绝执行' };
  }
  const allowed = allowedParamsFor(call.name);
  if (!allowed) return { ok: true };
  const args = toolCallArgs(call);
  if (args === null) return { ok: false, reason: call.name + ' 的参数不是合法 JSON，已拒绝执行' };
  const action = typeof args.action === 'string' ? args.action : '';
  if (!allowed.has(action)) {
    return {
      ok: false,
      reason:
        call.name +
        ' 的 action=' +
        (action || '(空)') +
        '」不在只读放行列表内（只允许查询类操作），已拒绝执行',
    };
  }
  return { ok: true };
}


const DEFAULT_SYSTEM = [
  '你是一个知识探索助手。用户在「卡片树」里把对话拆成一张张卡片，逐张阅读。',
  '- 直接回答当前问题，结构清晰、自成一体；不要复述此前的对话内容。',
  '- 用简体中文回答，除非问题本身使用其他语言。',
  '- 需要时使用小标题、有序列表和代码块来组织答案，让这张卡片可以独立阅读。',
].join('\n');

const MODE_TEXT = {
  root: '根卡片：这是整棵树的第一张卡片。',
  child: '深入卡片：用户希望以上一张卡片的主题继续往下深入。',
  diverge: '发散卡片：与上一张卡片同层，用户开了一条新的支线。',
  branch: '分支重答：用户回到上一张卡片的问题，希望换一个角度重新作答。',
  isolated: '独立卡片：这张卡片有意不与树里其它卡片相连，只围绕它自己的问题作答，不要引用别的卡片。',
};

/**
 * What the model should know about the tree it is writing inside. Cards are
 * not chat turns: each one is an independent node whose ancestors arrive as
 * (question, answer) pairs.
 */
function buildSystem(project, card, options) {
  const parts = [DEFAULT_SYSTEM];
  if (project && project.system && String(project.system).trim()) {
    parts.push('项目背景与规则：\n' + String(project.system).trim());
  }
  if (!project || !card) return parts.join('\n\n');

  const chain = ancestorChain(project, card);
  const depth = chain.length + 1;
  const followUp = Boolean(options && options.followUp);
  const lines = [
    '【你在对话树里的位置】',
    '这个会话不是聊天窗口，而是一棵卡片树：每个问题是一张独立卡片，卡片通过父子关系连成树，整棵树属于项目《' +
      (project.title || '未命名') +
      '》。',
    '当前卡片是第 ' + depth + ' 层，共 ' + (project.cards ? project.cards.length : 0) + ' 张卡片。',
    MODE_TEXT[card.mode] || '',
  ];
  if (followUp) {
    lines.push(
      '这次不是新卡片，而是用户对「当前这张卡片」的追问：回答要接着这张卡片已有的结论往下说，可以直接引用卡片里的内容，但不要重复它已经讲过的段落。',
    );
  }
  const parent = card.parentId ? findCard(project, card.parentId) : null;
  if (parent && parent.prompt) {
    lines.push('上级卡片的问题：' + String(parent.prompt).replace(/\s+/g, ' ').slice(0, 160));
  }
  if (chain.length > 0) {
    lines.push('上游上下文是以「用户问 / 你的回答」成对出现的卡片链，按从根到父的顺序排列。');
  }
  if ((card.attachments || []).length > 0) {
    lines.push('这张卡片带有图片或文件附件，附件内容已经随用户消息一起给出，请直接阅读使用，不要说「没有收到附件」。');
  }
  const refs = resolvedRefs(project, card);
  if (refs.length > 0) {
    lines.push(
      '这张卡片还引用了 ' +
        refs.length +
        ' 张其它卡片（它们不在你的父链上）。它们的「问 / 回答」会以【引用卡片·…】的形式出现在用户消息里，按需参考，不要整段复述。',
    );
  }
  if (followUp && (options.followUp.attachments || []).length > 0) {
    lines.push('这条追问带有新的图片或文件附件，也已经随消息给出，请直接使用。');
  }
  lines.push(
    followUp
      ? '回答要求：只回答这条追问；接着卡片已有的结论展开，不要重新介绍背景，也不要写「如前所述」这类依赖聊天顺序的话。'
      : '回答要求：只回答当前这张卡片的问题；写成一个可以独立阅读的结论，不要写「如前所述」「上面提到」「接着上文」这类依赖聊天顺序的话；需要引用上游内容时，用一句话复述要点。',
  );
  parts.push(lines.filter((line) => line && line.trim()).join('\n'));
  return parts.join('\n\n');
}

/* ------------------------------------------------------------------ state */

function stateFilePath() {
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  return path.join(home, 'card-tree', 'state.json');
}

function emptyState() {
  return { version: STATE_VERSION, activeProjectId: null, projects: [], sessions: {}, model: null };
}

function nowIso() {
  return new Date().toISOString();
}

function nid(prefix) {
  return prefix + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

/**
 * A dashed edge is undirected for display purposes: two cards may share at most
 * one line. Old state snapshots (or a hand edit) could carry both A -> B and
 * B -> A, so collapse every pair to its first occurrence and drop dead ids.
 */
function pruneRefs(project) {
  const ids = new Set(project.cards.map((card) => card && card.id));
  const pairs = new Set();
  for (const card of project.cards) {
    if (!card || !Array.isArray(card.refs)) continue;
    card.refs = card.refs.filter((id) => {
      if (typeof id !== 'string' || id === card.id || !ids.has(id)) return false;
      const key = id < card.id ? id + '|' + card.id : card.id + '|' + id;
      if (pairs.has(key)) return false;
      pairs.add(key);
      return true;
    });
  }
}

function loadState() {
  const file = stateFilePath();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyState();
    if (!Array.isArray(parsed.projects)) parsed.projects = [];
    parsed.version = STATE_VERSION;
    parsed.revision = Number(parsed.revision) || 0;
    // sessionId -> projectId bindings for sessions that run in tree mode.
    if (!parsed.sessions || typeof parsed.sessions !== 'object' || Array.isArray(parsed.sessions)) {
      parsed.sessions = {};
    }
    // The user's own model choice for the tree (null = follow the DSH default).
    if (
      !parsed.model ||
      typeof parsed.model !== 'object' ||
      typeof parsed.model.provider !== 'string' ||
      typeof parsed.model.model !== 'string'
    ) {
      parsed.model = null;
    }
    const known = new Set(parsed.projects.map((project) => project && project.id));
    for (const sessionId of Object.keys(parsed.sessions)) {
      if (!known.has(parsed.sessions[sessionId])) delete parsed.sessions[sessionId];
    }
    // A card caught mid-stream by a crash or a reload is not still running.
    for (const project of parsed.projects) {
      if (!Array.isArray(project.cards)) project.cards = [];
      for (const card of project.cards) {
        if (!Array.isArray(card.followUps)) card.followUps = [];
        // Dashed references survive a reload as plain id lists.
        if (!Array.isArray(card.refs)) card.refs = [];
        for (const followUp of card.followUps) {
          if (followUp && followUp.status === 'running') {
            const partial = String(followUp.answer || '').trim();
            followUp.status = partial ? 'partial' : 'error';
            followUp.error = partial
              ? '上一次生成被中断，已保留已生成的部分。'
              : '上一次生成被中断（DSH 重启或页面刷新）。';
          }
        }
        if (card.status === 'running') {
          const partial = String(card.answer || '').trim();
          card.status = partial ? 'partial' : 'error';
          card.error = partial
            ? '上一次生成被中断，已保留已生成的部分。'
            : '上一次生成被中断（DSH 重启或页面刷新）。';
          card.runId = null;
        }
      }
      pruneRefs(project);
    }
    return parsed;
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      // Keep the damaged file for inspection instead of silently losing it.
      try {
        fs.renameSync(file, file + '.' + Date.now() + '.broken');
      } catch (renameError) {
        /* best effort */
      }
      console.warn('[card-tree] state file unreadable, starting empty:', error.message);
    }
    return emptyState();
  }
}

const BACKUP_KEEP = 30;
const BACKUP_MIN_INTERVAL_MS = 5 * 60 * 1000;

function backupDir() {
  return path.join(path.dirname(stateFilePath()), 'backups');
}

// Keep a rolling history next to the live file so a bad edit (or a bug like a
// wrong delete) can be undone by hand. Throttled to one snapshot per interval.
function backupState(file) {
  try {
    if (!fs.existsSync(file)) return;
    const dir = backupDir();
    fs.mkdirSync(dir, { recursive: true });
    const names = () =>
      fs
        .readdirSync(dir)
        .filter((name) => name.startsWith('state-') && name.endsWith('.json'))
        .sort();
    const existing = names();
    const newest = existing.length ? existing[existing.length - 1] : null;
    if (newest) {
      const stat = fs.statSync(path.join(dir, newest));
      if (Date.now() - stat.mtimeMs < BACKUP_MIN_INTERVAL_MS) return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(file, path.join(dir, 'state-' + stamp + '.json'));
    const all = names();
    for (const name of all.slice(0, Math.max(0, all.length - BACKUP_KEEP))) {
      try {
        fs.unlinkSync(path.join(dir, name));
      } catch (error) {
        /* best effort */
      }
    }
  } catch (error) {
    console.warn('[card-tree] could not write a state backup:', error && error.message);
  }
}

/**
 * Persist the whole state. Throws when the write fails so the HTTP layer can
 * answer 500 instead of silently pretending the content was saved.
 */
function saveState(state) {
  const file = stateFilePath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    backupState(file);
    state.revision = (Number(state.revision) || 0) + 1;
    state.savedAt = nowIso();
    const tmp = file + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    return state.revision;
  } catch (error) {
    console.error('[card-tree] could not persist state:', error && error.message);
    const failure = new Error(
      '写入磁盘失败，改动没有保存：' + String((error && error.message) || error),
    );
    failure.persist = true;
    throw failure;
  }
}

function findProject(state, projectId) {
  return state.projects.find((project) => project.id === projectId) || null;
}

function findCard(project, cardId) {
  return project.cards.find((card) => card.id === cardId) || null;
}

/* ------------------------------------------------------------------ model */

function resolveModel(ctx) {
  try {
    const service = ctx.get('agentDefaultModel');
    if (service && typeof service.currentSelection === 'function') {
      const selection = service.currentSelection();
      if (
        selection &&
        typeof selection === 'object' &&
        typeof selection.provider === 'string' &&
        typeof selection.model === 'string'
      ) {
        return {
          provider: selection.provider,
          model: selection.model,
          reasoningEffort: selection.reasoningEffort,
        };
      }
    }
  } catch (error) {
    console.warn('[card-tree] could not read the default model:', error && error.message);
  }
  return null;
}

/* ---------------------------------------------------------------- context */

/** The model a tree uses: the user's pick, else the DSH default. */
/**
 * Effective model: a project override wins, then the global user choice, then
 * whatever DSH itself would use.
 */
function currentModel(ctx, state, project) {
  const scoped = project && project.model;
  const chosen =
    scoped && typeof scoped.provider === 'string' && typeof scoped.model === 'string'
      ? scoped
      : state && state.model;
  if (chosen && typeof chosen.provider === 'string' && typeof chosen.model === 'string') {
    return {
      provider: chosen.provider,
      model: chosen.model,
      reasoningEffort: chosen.reasoningEffort,
      source: chosen === scoped ? 'project' : 'user',
    };
  }
  const fallback = resolveModel(ctx);
  return fallback ? Object.assign({}, fallback, { source: 'default' }) : null;
}

/** Provider/model catalog for the composer's model picker. */
async function modelCatalog(ctx) {
  const llm = ctx.get('llm');
  if (!llm || typeof llm.listProviders !== 'function') return [];
  const providers = await llm.listProviders();
  const out = [];
  for (const provider of Array.isArray(providers) ? providers : []) {
    const id = provider && (provider.id || provider.name);
    if (!id) continue;
    let models = [];
    try {
      const list = typeof llm.listModels === 'function' ? await llm.listModels(id) : [];
      models = (Array.isArray(list) ? list : []).map((entry) =>
        typeof entry === 'string'
          ? { id: entry, name: entry }
          : { id: entry && (entry.id || entry.model), name: entry && (entry.name || entry.id || entry.model) },
      );
    } catch (error) {
      console.warn('[card-tree] could not list models for', id, error && error.message);
    }
    if (models.length) out.push({ id, name: (provider && provider.name) || id, models });
  }
  return out;
}

/** Anchor a user pick to the model's own default reasoning effort. */
async function withDefaultEffort(ctx, provider, model) {
  const llm = ctx.get('llm');
  try {
    if (llm && typeof llm.resolveModelInfo === 'function') {
      const info = await llm.resolveModelInfo(provider, model);
      const reasoning = info && info.reasoning;
      if (reasoning && reasoning.defaultEffort) return { reasoningEffort: reasoning.defaultEffort };
    }
  } catch (error) {
    console.warn('[card-tree] could not inspect model:', error && error.message);
  }
  return {};
}

/**
 * The model to run one card with. When the card carries images and the tree's
 * model cannot see them, fall back to the first vision-capable model in the
 * catalog so the attachment is not silently useless.
 */
async function resolveImageModel(ctx, state, project) {
  const llm = ctx.get('llm');
  const preferred = currentModel(ctx, state, project);
  if (!llm) return preferred;
  const seesImages = async (choice) => {
    if (!choice || typeof llm.resolveModelInfo !== 'function') return true;
    try {
      const info = await llm.resolveModelInfo(choice.provider, choice.model);
      const modalities = info && Array.isArray(info.inputModalities) ? info.inputModalities : null;
      if (!modalities || modalities.length === 0) return true;
      return modalities.indexOf('image') !== -1;
    } catch (error) {
      return true;
    }
  };
  if (await seesImages(preferred)) return preferred;
  let providers = [];
  try {
    providers = typeof llm.listProviders === 'function' ? await llm.listProviders() : [];
  } catch (error) {
    providers = [];
  }
  for (const provider of Array.isArray(providers) ? providers : []) {
    const id = provider && (provider.id || provider.name);
    if (!id) continue;
    let models = [];
    try {
      models = typeof llm.listModels === 'function' ? await llm.listModels(id) : [];
    } catch (error) {
      models = [];
    }
    for (const entry of Array.isArray(models) ? models : []) {
      const modalities = entry && Array.isArray(entry.inputModalities) ? entry.inputModalities : null;
      const modelId = entry && (entry.id || entry.model);
      if (!modelId) continue;
      if (!modalities || modalities.indexOf('image') === -1) continue;
      const effort = await withDefaultEffort(ctx, id, modelId);
      return {
        provider: id,
        model: modelId,
        reasoningEffort: effort.reasoningEffort,
        source: 'vision-fallback',
      };
    }
  }
  return null;
}

/**
 * Reasoning levels a model exposes, for the composer's effort picker. The
 * catalog itself stays cheap: this is only asked when the picker is opened or
 * the model changes.
 */
async function effortInfo(ctx, state, provider, model, projectId) {
  const llm = ctx.get('llm');
  const project = projectId ? findProject(state, projectId) : null;
  const fallback = currentModel(ctx, state, project);
  const chosenProvider = provider || (fallback && fallback.provider) || '';
  const chosenModel = model || (fallback && fallback.model) || '';
  const scope = project && project.model ? project.model : state.model;
  const payload = {
    ok: true,
    provider: chosenProvider,
    model: chosenModel,
    efforts: [],
    defaultEffort: null,
    current: (scope && scope.reasoningEffort) || null,
    source: fallback ? fallback.source : null,
  };
  if (!llm || typeof llm.resolveModelInfo !== 'function' || !chosenProvider || !chosenModel) return payload;
  try {
    const info = await llm.resolveModelInfo(chosenProvider, chosenModel);
    const reasoning = info && info.reasoning;
    if (reasoning && Array.isArray(reasoning.efforts)) {
      payload.efforts = reasoning.efforts
        .map((entry) => ({
          id: String((entry && entry.id) || ''),
          name: (entry && (entry.name || entry.id)) || '',
          description: (entry && entry.description) || '',
        }))
        .filter((entry) => entry.id);
      payload.defaultEffort = reasoning.defaultEffort || null;
    }
  } catch (error) {
    console.warn('[card-tree] could not read reasoning levels:', error && error.message);
  }
  return payload;
}

/* ------------------------------------------------------------ attachments */

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const TEXTUAL_EXTENSIONS =
  /\.(txt|md|markdown|csv|tsv|json|jsonl|yaml|yml|toml|ini|cfg|conf|log|xml|html|css|js|mjs|cjs|ts|tsx|jsx|py|rb|go|rs|java|c|h|cpp|hpp|cs|php|sh|ps1|sql|tex)$/i;

function looksTextual(name, mime) {
  const lower = String(mime || '').toLowerCase();
  if (lower.startsWith('text/')) return true;
  if (/json|xml|yaml|csv|javascript|typescript|x-sh|x-python|x-shellscript/.test(lower)) return true;
  return TEXTUAL_EXTENSIONS.test(String(name || ''));
}

function normalizeImageMediaType(mime) {
  const value = String(mime || '').toLowerCase();
  if (IMAGE_TYPES.has(value)) return value;
  if (value === 'image/jpg') return 'image/jpeg';
  throw new Error('图片只支持 PNG / JPEG / WebP / GIF');
}

function attachmentsDir() {
  return path.join(path.dirname(stateFilePath()), 'attachments');
}

/**
 * Text files live on disk instead of inside state.json, so a big note cannot
 * bloat the state file. The record keeps a relative path plus the read cap.
 */
function storeTextAttachment(name, data) {
  const dir = attachmentsDir();
  fs.mkdirSync(dir, { recursive: true });
  const id = 'att-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const fileName = id + '.txt';
  const text = data.toString('utf8').slice(0, MAX_INLINE_TEXT_CHARS);
  fs.writeFileSync(path.join(dir, fileName), text, 'utf8');
  return {
    kind: 'text',
    name,
    bytes: data.length,
    chars: text.length,
    truncated: text.length < data.length,
    file: 'attachments/' + fileName,
  };
}

/** Read back a spilled text attachment (older states kept it inline). */
function readTextAttachment(item) {
  if (item && typeof item.text === 'string') return item.text;
  if (item && typeof item.file === 'string') {
    try {
      const full = path.join(path.dirname(stateFilePath()), item.file);
      return fs.readFileSync(full, 'utf8').slice(0, MAX_INLINE_TEXT_CHARS);
    } catch (error) {
      return '';
    }
  }
  return '';
}

/**
 * Turn the client's `{name, mime, dataB64}` list into durable attachment
 * records: images and binary files go through the Host attachment service,
 * text files are spilled to disk so any model can read them.
 */
async function prepareAttachments(ctx, raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (raw.length > MAX_ATTACHMENTS) throw new Error('一次最多附加 ' + MAX_ATTACHMENTS + ' 个文件');
  let service = null;
  try {
    service = ctx.get('attachments') || null;
  } catch (error) {
    service = null;
  }

  const prepared = [];
  for (const item of raw) {
    const name = String((item && item.name) || 'file').slice(0, 160);
    const mime = String((item && item.mime) || '');
    const encoded = String((item && item.dataB64) || '');
    if (!encoded) throw new Error('附件内容为空：' + name);
    const data = Buffer.from(encoded, 'base64');
    if (!data.length) throw new Error('附件内容为空：' + name);
    if (data.length > MAX_ATTACHMENT_BYTES) throw new Error('附件过大（单个上限 12 MB）：' + name);

    const wantsImage = /^image\//i.test(mime) || /\.(png|jpe?g|webp|gif)$/i.test(name);
    if (wantsImage) {
      if (!service || typeof service.saveImage !== 'function') throw new Error('DSH 的图片附件服务不可用');
      const mediaType = normalizeImageMediaType(mime);
      const ref = await service.saveImage({ data, mediaType, name });
      prepared.push({ kind: 'image', name, bytes: data.length, mediaType, ref });
    } else if (looksTextual(name, mime)) {
      prepared.push(storeTextAttachment(name, data));
    } else {
      if (!service || typeof service.admitEncodedFile !== 'function') throw new Error('DSH 的文件附件服务不可用');
      const ref = await service.admitEncodedFile({ data: data.toString('base64'), name });
      prepared.push({ kind: 'file', name, bytes: data.length, ref });
    }
  }
  return prepared;
}

/** Model content blocks for one stored attachment list. */
function attachmentBlocks(attachments) {
  const blocks = [];
  for (const item of attachments || []) {
    if (!item) continue;
    if (item.kind === 'image' && item.ref) blocks.push({ type: 'image', attachment: item.ref });
    else if (item.kind === 'file' && item.ref) blocks.push({ type: 'file', attachment: item.ref });
    else if (item.kind === 'text') {
      const body = readTextAttachment(item);
      if (body) {
        blocks.push({
          type: 'text',
          text: '【卡片附件：' + item.name + '】' + (item.truncated ? '（内容过长，已截取前 ' + item.chars + ' 字符）\n' : '\n') + body,
        });
      }
    }
  }
  return blocks;
}

/** A card's user content: its question plus whatever the user attached. */
function cardBlocks(card) {
  const blocks = [];
  if (card && card.prompt) blocks.push({ type: 'text', text: String(card.prompt) });
  for (const block of attachmentBlocks(card && card.attachments)) blocks.push(block);
  return blocks;
}

/** Ancestor cards from the root down to the card's parent, oldest first. */
function ancestorChain(project, card) {
  const byId = new Map(project.cards.map((entry) => [entry.id, entry]));
  const chain = [];
  let cursor = card.parentId ? byId.get(card.parentId) : null;
  let guard = 0;
  while (cursor && guard < MAX_CHAIN) {
    guard += 1;
    chain.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : null;
  }
  return chain.filter((entry) => entry && entry.answer);
}

/**
 * Cards this one deliberately references (the dashed edges in the overview).
 * Only answered cards are useful, and the list is capped so a hub cannot blow
 * up every prompt below it.
 */
function resolvedRefs(project, card) {
  if (!card || !Array.isArray(card.refs)) return [];
  const byId = new Map(project.cards.map((entry) => [entry.id, entry]));
  const out = [];
  for (const id of card.refs) {
    if (out.length >= MAX_REFS) break;
    const target = byId.get(id);
    if (target && target.id !== card.id && target.answer) out.push(target);
  }
  return out;
}

/** A follow-up's user content: its prompt plus its own attachments. */
function followUpBlocks(followUp) {
  const blocks = [];
  if (followUp && followUp.prompt) blocks.push({ type: 'text', text: String(followUp.prompt) });
  for (const block of attachmentBlocks(followUp && followUp.attachments)) blocks.push(block);
  return blocks;
}

/** Answered follow-ups of a card, oldest first, stopping before `untilId`. */
function answeredFollowUps(card, untilId) {
  const list = card && Array.isArray(card.followUps) ? card.followUps : [];
  const done = [];
  for (const item of list) {
    if (untilId && item.id === untilId) break;
    if (item && item.answer) done.push(item);
  }
  return done;
}

/* ---------------------------------------------------------- context budget */

/** Rough token estimate: CJK ≈ 1 token/char, Latin ≈ 1 token per 4 chars. */
function estimateTokens(text) {
  const value = String(text || '');
  let cjk = 0;
  let other = 0;
  for (const ch of value) {
    if (ch.codePointAt(0) >= 0x2e80) cjk += 1;
    else other += 1;
  }
  return cjk + Math.ceil(other / 4);
}

function messageTokens(message) {
  let total = 0;
  for (const block of (message && message.content) || []) {
    if (block.type === 'text') total += estimateTokens(block.text);
    else if (block.type === 'image') total += 900;
    else if (block.type === 'file') total += 400;
  }
  return total;
}

function foldAnswer(text, limit) {
  const value = String(text || '');
  if (value.length <= limit) return value;
  return value.slice(0, limit) + '\n…（后面的内容已省略以节省上下文，完整回答仍在卡片里。）';
}

/**
 * Decide how much of the ancestor chain and of the referenced cards fits into
 * this model's window. Old ancestors keep their question and a folded answer;
 * the oldest are dropped first, refs are capped separately.
 */
function planContext(project, card, options) {
  const budget = Math.max(1200, Math.floor(Number(options && options.budget) || 0));
  const stats = { budget, approxTokens: 0, foldedCards: 0, droppedCards: 0, droppedRefs: 0, refs: 0 };

  const refBudget = Math.max(500, Math.floor(budget * 0.25));
  const refs = [];
  let refTokens = 0;
  for (const ref of resolvedRefs(project, card)) {
    const answer = foldAnswer(ref.answer, MAX_REF_ANSWER_CHARS);
    const cost = estimateTokens(ref.prompt) + estimateTokens(answer);
    if (refTokens + cost > refBudget) {
      stats.droppedRefs += 1;
      continue;
    }
    refTokens += cost;
    refs.push({ card: ref, answer, folded: answer.length < String(ref.answer || '').length });
  }
  stats.refs = refs.length;

  const entries = ancestorChain(project, card).map((ancestor) => ({
    card: ancestor,
    answer: String(ancestor.answer || ''),
    folded: false,
    dropped: false,
  }));
  let used = entries.reduce(
    (sum, entry) => sum + estimateTokens(entry.card.prompt) + estimateTokens(entry.answer),
    refTokens,
  );
  for (let index = 0; index < entries.length && used > budget; index += 1) {
    const entry = entries[index];
    const before = estimateTokens(entry.card.prompt) + estimateTokens(entry.answer);
    const foldedAnswer = foldAnswer(entry.answer, FOLDED_ANSWER_CHARS);
    const after = estimateTokens(entry.card.prompt) + estimateTokens(foldedAnswer);
    if (after < before) {
      entry.answer = foldedAnswer;
      entry.folded = true;
      used -= before - after;
      stats.foldedCards += 1;
    } else {
      entry.dropped = true;
      used -= before;
      stats.droppedCards += 1;
    }
  }
  stats.approxTokens =
    used +
    estimateTokens(card && card.prompt) +
    estimateTokens(card && card.answer) +
    estimateTokens(options && options.system);
  return { entries: entries.filter((entry) => !entry.dropped), refs, stats };
}

/** Role-separated history: the ideal shape, when the adapter accepts it. */
function buildMessages(project, card, model, options) {
  const plan = planContext(project, card, options);
  if (options && options.stats) Object.assign(options.stats, plan.stats);
  const chain = plan.entries;
  const refs = plan.refs;
  const messages = [];
  const source = { kind: 'model', provider: model.provider, model: model.model };
  for (const ancestor of chain) {
    const content = cardBlocks(ancestor.card);
    if (content.length > 0) messages.push({ role: 'user', content });
    messages.push({
      role: 'assistant',
      content: [{ type: 'text', text: ancestor.answer }],
      source,
    });
  }
  const followUp = (options && options.followUp) || null;
  if (!followUp) {
    for (const ref of refs) {
      messages.push({
        role: 'user',
        content: [{ type: 'text', text: '【引用卡片·' + (ref.card.prompt || '') + '】' }],
      });
      messages.push({ role: 'assistant', content: [{ type: 'text', text: ref.answer }], source });
    }
    messages.push({ role: 'user', content: cardBlocks(card) });
    return messages;
  }
  for (const ref of refs) {
    messages.push({
      role: 'user',
      content: [{ type: 'text', text: '【引用卡片·' + (ref.card.prompt || '') + '】' }],
    });
    messages.push({ role: 'assistant', content: [{ type: 'text', text: ref.answer }], source });
  }
  messages.push({ role: 'user', content: cardBlocks(card) });
  if (card.answer) {
    messages.push({ role: 'assistant', content: [{ type: 'text', text: String(card.answer) }], source });
  }
  for (const item of answeredFollowUps(card, followUp.id)) {
    messages.push({ role: 'user', content: followUpBlocks(item) });
    messages.push({ role: 'assistant', content: [{ type: 'text', text: String(item.answer) }], source });
  }
  messages.push({ role: 'user', content: followUpBlocks(followUp) });
  return messages;
}

/** One user turn carrying the transcript: always accepted. */
function buildFlattenedMessages(project, card, options) {
  const plan = planContext(project, card, options);
  if (options && options.stats) Object.assign(options.stats, plan.stats);
  const parts = [];
  if (plan.entries.length > 0) {
    parts.push('以下是这次探索此前的卡片记录，供你理解背景（不要在回答里复述它们）：');
    for (const ancestor of plan.entries) {
      parts.push('【问题】' + (ancestor.card.prompt || '') + '\n【回答】' + ancestor.answer);
    }
    parts.push('---');
  }
  if (plan.refs.length > 0) {
    parts.push('【引用的其它卡片（可参考，不要整段复述）】');
    for (const ref of plan.refs) {
      parts.push('【引用卡片·' + (ref.card.prompt || '') + '】\n【回答】' + ref.answer);
    }
    parts.push('---');
  }
  const followUp = (options && options.followUp) || null;
  const tail = [];
  if (followUp) {
    parts.push('【这张卡片的问题】' + (card.prompt || '') + '\n【这张卡片的回答】' + (card.answer || ''));
    for (const item of answeredFollowUps(card, followUp.id)) {
      parts.push('【追问】' + (item.prompt || '') + '\n【回答】' + (item.answer || ''));
    }
    parts.push('【现在的追问】' + (followUp.prompt || ''));
    for (const block of attachmentBlocks(followUp.attachments)) tail.push(block);
  } else {
    parts.push('【现在的问题】' + (card.prompt || ''));
  }
  const content = [{ type: 'text', text: parts.join('\n\n') }];
  if (followUp) for (const block of tail) content.push(block);
  else for (const block of attachmentBlocks(card.attachments)) content.push(block);
  return [{ role: 'user', content }];
}

/* ------------------------------------------------------------------- http */

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('请求体过大（上限 96 MB）'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
  });
}

function openStream(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
  return (event) => {
    try {
      res.write('data: ' + JSON.stringify(event) + '\n\n');
    } catch (error) {
      /* the peer went away */
    }
  };
}

/** Version recorded in this bundle's package.json ('' when it cannot be read). */
function pluginVersion() {
  try {
    const raw = fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8');
    return String(JSON.parse(raw).version || '');
  } catch (error) {
    return '';
  }
}

/** Which Host services this plugin needs are actually mounted. */
function serviceHealth(ctx) {
  const names = ['llm', 'tools', 'attachments', 'agentDefaultModel'];
  const result = {};
  for (const name of names) {
    let available = false;
    try {
      available = Boolean(ctx.get(name));
    } catch (error) {
      available = false;
    }
    result[name] = available;
  }
  return result;
}

function snapshot(ctx, state) {
  const active = findProject(state, state.activeProjectId) || state.projects[0] || null;
  return {
    ok: true,
    state,
    model: currentModel(ctx, state, active),
    revision: Number(state.revision) || 0,
    savedAt: state.savedAt || null,
    system: DEFAULT_SYSTEM,
  };
}

/** Abort every live generation whose run entry matches `predicate`. */
function abortRuns(controllers, predicate) {
  let stopped = 0;
  for (const entry of controllers.values()) {
    if (!entry || !predicate(entry)) continue;
    if (entry.controller) {
      try {
        entry.controller.abort();
      } catch (error) {
        /* ignore */
      }
    }
    stopped += 1;
  }
  return stopped;
}

/* -------------------------------------------------------------- operations */

function normalizeImportedCard(raw, fallbackParent) {
  const card = raw && typeof raw === 'object' ? raw : {};
  const id = typeof card.id === 'string' && /^c_/.test(card.id) ? card.id : nid('c');
  const parentId = typeof card.parentId === 'string' && card.parentId ? card.parentId : fallbackParent || null;
  const mode = ['root', 'child', 'diverge', 'branch', 'isolated'].includes(card.mode) ? card.mode : 'child';
  const status = ['idle', 'done', 'partial', 'error', 'running'].includes(card.status)
    ? (card.status === 'running' ? 'error' : card.status)
    : card.answer
      ? 'done'
      : 'idle';
  return {
    id,
    parentId: parentId === id ? null : parentId,
    mode,
    prompt: typeof card.prompt === 'string' ? card.prompt : '',
    answer: typeof card.answer === 'string' ? card.answer : '',
    status,
    error: typeof card.error === 'string' ? card.error : null,
    createdAt: typeof card.createdAt === 'string' ? card.createdAt : nowIso(),
    updatedAt: typeof card.updatedAt === 'string' ? card.updatedAt : nowIso(),
    attachments: Array.isArray(card.attachments) ? card.attachments : [],
    steps: Array.isArray(card.steps) ? card.steps : [],
    tools: Array.isArray(card.tools) ? card.tools : [],
    followUps: Array.isArray(card.followUps)
      ? card.followUps
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            id: typeof item.id === 'string' && /^f_/.test(item.id) ? item.id : nid('f'),
            prompt: typeof item.prompt === 'string' ? item.prompt : '',
            answer: typeof item.answer === 'string' ? item.answer : '',
            status: item.status === 'running' ? 'error' : item.status || (item.answer ? 'done' : 'idle'),
            error: typeof item.error === 'string' ? item.error : null,
            createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso(),
            updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : nowIso(),
            attachments: Array.isArray(item.attachments) ? item.attachments : [],
            steps: Array.isArray(item.steps) ? item.steps : [],
            tools: Array.isArray(item.tools) ? item.tools : [],
          }))
      : [],
    refs: Array.isArray(card.refs) ? card.refs.filter((id2) => typeof id2 === 'string') : [],
    pos: card.pos && Number.isFinite(card.pos.x) && Number.isFinite(card.pos.y) ? { x: card.pos.x, y: card.pos.y } : undefined,
  };
}

function projectImport(state, body) {
  const raw = body && body.project;
  if (!raw || typeof raw !== 'object') throw new Error('导入内容不是项目');
  const taken = new Set(state.projects.map((project) => project.id));
  const project = {
    id: typeof raw.id === 'string' && /^p_/.test(raw.id) && !taken.has(raw.id) ? raw.id : nid('p'),
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 120) : '导入的项目',
    system: typeof raw.system === 'string' ? raw.system.slice(0, 8000) : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : nowIso(),
    updatedAt: nowIso(),
    cards: Array.isArray(raw.cards) ? raw.cards.map((card) => normalizeImportedCard(card)) : [],
    model: raw.model && typeof raw.model === 'object' ? raw.model : undefined,
  };
  /* A card may point at a parent that did not survive — hang it on the nearest survivor. */
  const ids = new Set(project.cards.map((card) => card.id));
  for (const card of project.cards) {
    if (card.parentId && !ids.has(card.parentId)) card.parentId = null;
    if (!card.parentId && card.mode !== 'isolated') card.mode = 'root';
  }
  pruneRefs(project);
  state.projects.unshift(project);
  state.activeProjectId = project.id;
  return project;
}

function projectCreate(state, body) {
  const project = {
    id: nid('p'),
    title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : '新项目',
    system: typeof body.system === 'string' ? body.system : '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    cards: [],
  };
  state.projects.unshift(project);
  state.activeProjectId = project.id;
  return project;
}

function projectUpdate(state, body) {
  const project = findProject(state, body.projectId);
  if (!project) throw new Error('项目不存在');
  if (typeof body.title === 'string') project.title = body.title.slice(0, 120);
  if (typeof body.system === 'string') project.system = body.system.slice(0, 8000);
  project.updatedAt = nowIso();
  return project;
}

function projectDelete(state, body) {
  const index = state.projects.findIndex((project) => project.id === body.projectId);
  if (index < 0) throw new Error('项目不存在');
  state.projects.splice(index, 1);
  if (state.sessions) {
    for (const sessionId of Object.keys(state.sessions)) {
      if (state.sessions[sessionId] === body.projectId) delete state.sessions[sessionId];
    }
  }
  if (state.activeProjectId === body.projectId) {
    state.activeProjectId = state.projects.length > 0 ? state.projects[0].id : null;
  }
  return null;
}

/* ------------------------------------------------------- session binding */

/** Bind a Session to a tree; creates the tree when the Session has none yet. */
function sessionBind(state, body) {
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId) throw new Error('缺少会话标识');
  if (!state.sessions) state.sessions = {};
  let project = body.projectId ? findProject(state, body.projectId) : null;
  if (!project) {
    project = projectCreate(state, {
      title: typeof body.title === 'string' && body.title.trim() ? body.title : '对话树',
    });
  }
  state.sessions[sessionId] = project.id;
  state.activeProjectId = project.id;
  return { sessionId, projectId: project.id };
}

function sessionUnbind(state, body) {
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId) throw new Error('缺少会话标识');
  if (state.sessions) delete state.sessions[sessionId];
  return null;
}

function cardCreate(state, body) {
  const project = findProject(state, body.projectId);
  if (!project) throw new Error('项目不存在');
  const isolated = body.mode === 'isolated';
  if (body.parentId && !findCard(project, body.parentId)) throw new Error('父卡片不存在');
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) throw new Error('问题不能为空');
  const card = {
    id: nid('c'),
    parentId: isolated ? null : body.parentId || null,
    mode: isolated ? 'isolated' : typeof body.mode === 'string' ? body.mode : 'child',
    prompt,
    answer: '',
    followUps: [],
    status: 'idle',
    error: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  project.cards.push(card);
  project.updatedAt = card.createdAt;
  state.activeProjectId = project.id;
  return card;
}

/** Add a follow-up question to an existing card. It is not a new node. */
function cardFollowCreate(state, body) {
  const project = findProject(state, body.projectId);
  if (!project) throw new Error('项目不存在');
  const card = findCard(project, body.cardId);
  if (!card) throw new Error('卡片不存在');
  if (card.status === 'running') throw new Error('这张卡片正在生成中');
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) throw new Error('追问不能为空');
  if (!Array.isArray(card.followUps)) card.followUps = [];
  const followUp = {
    id: nid('f'),
    prompt,
    answer: '',
    status: 'idle',
    error: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  card.followUps.push(followUp);
  card.updatedAt = followUp.createdAt;
  project.updatedAt = followUp.createdAt;
  return { card, followUp };
}

function findFollowUp(card, followUpId) {
  const list = card && Array.isArray(card.followUps) ? card.followUps : [];
  return list.find((item) => item && item.id === followUpId) || null;
}

function cardUpdate(state, body) {
  const project = findProject(state, body.projectId);
  if (!project) throw new Error('项目不存在');
  const card = findCard(project, body.cardId);
  if (!card) throw new Error('卡片不存在');
  if (card.status === 'running') throw new Error('这张卡片正在生成中');
  if (typeof body.prompt === 'string') card.prompt = body.prompt.slice(0, 20000);
  if (typeof body.answer === 'string') card.answer = body.answer;
  if (typeof body.status === 'string') card.status = body.status;
  if (typeof body.error === 'string' || body.error === null) card.error = body.error;
  card.updatedAt = nowIso();
  return card;
}

function cardDelete(state, body) {
  const project = findProject(state, body.projectId);
  if (!project) throw new Error('项目不存在');
  const doomed = new Set([body.cardId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const card of project.cards) {
      if (card.parentId && doomed.has(card.parentId) && !doomed.has(card.id)) {
        doomed.add(card.id);
        grew = true;
      }
    }
  }
  project.cards = project.cards.filter((card) => !doomed.has(card.id));
  // Dashed references into a deleted branch die with it.
  for (const card of project.cards) {
    if (Array.isArray(card.refs)) card.refs = card.refs.filter((id) => !doomed.has(id));
  }
  project.updatedAt = nowIso();
  return { removed: Array.from(doomed) };
}

/* ------------------------------------------------------ tree restructuring */

/** True when `cardId` sits somewhere below `ancestorId`. */
function isDescendant(project, ancestorId, cardId) {
  const byId = new Map(project.cards.map((card) => [card.id, card]));
  const seen = new Set();
  let cursor = byId.get(cardId) || null;
  while (cursor && cursor.parentId) {
    if (cursor.parentId === ancestorId) return true;
    if (seen.has(cursor.parentId)) return false;
    seen.add(cursor.parentId);
    cursor = byId.get(cursor.parentId) || null;
  }
  return false;
}

/** Move a card (and its subtree) under another card; null makes it a root. */
function cardReparent(state, body) {
  const project = findProject(state, body.projectId);
  if (!project) throw new Error('项目不存在');
  const card = findCard(project, body.cardId);
  if (!card) throw new Error('卡片不存在');
  if (card.status === 'running') throw new Error('这张卡片正在生成中');
  const parentId = body.parentId == null || body.parentId === '' ? null : String(body.parentId);
  if (parentId === card.id) throw new Error('不能把卡片挂到自己下面');
  if (parentId) {
    if (!findCard(project, parentId)) throw new Error('目标卡片不存在');
    if (isDescendant(project, card.id, parentId)) throw new Error('不能挂到自己的子卡片下面');
  }
  card.parentId = parentId;
  card.mode = parentId ? 'child' : 'root';
  card.updatedAt = nowIso();
  return card;
}

/** Add or drop one dashed reference edge between two cards. */
function cardRefs(state, body) {
  const project = findProject(state, body.projectId);
  if (!project) throw new Error('项目不存在');
  const card = findCard(project, body.cardId);
  if (!card) throw new Error('卡片不存在');
  const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : '';
  if (!Array.isArray(card.refs)) card.refs = [];
  if (body.remove) {
    if (!targetId) throw new Error('缺少引用目标');
    card.refs = card.refs.filter((id) => id !== targetId);
  } else {
    if (!targetId) throw new Error('缺少引用目标');
    if (targetId === card.id) throw new Error('不能引用自己');
    const target = findCard(project, targetId);
    if (!target) throw new Error('引用目标不存在');
    // A pair of cards carries at most one dashed line: if the other side already
    // points here, this edge exists — adding it again is a no-op.
    const reversed = Array.isArray(target.refs) && target.refs.includes(card.id);
    if (!card.refs.includes(targetId) && !reversed) {
      if (card.refs.length >= MAX_REFS) throw new Error('最多引用 ' + MAX_REFS + ' 张卡片');
      card.refs.push(targetId);
    }
  }
  card.updatedAt = nowIso();
  project.updatedAt = card.updatedAt;
  return card;
}

/** Persist manual node positions for the overview; 'reset' clears them. */
function cardLayout(state, body) {
  const project = findProject(state, body.projectId);
  if (!project) throw new Error('项目不存在');
  const positions = body.positions;
  if (positions === 'reset' || positions === null) {
    for (const card of project.cards) delete card.pos;
    project.updatedAt = nowIso();
    return null;
  }
  if (!positions || typeof positions !== 'object' || Array.isArray(positions)) throw new Error('positions 不合法');
  for (const cardId of Object.keys(positions)) {
    const card = findCard(project, cardId);
    if (!card) continue;
    const point = positions[cardId];
    if (!point || point.x == null || point.y == null) {
      delete card.pos;
      continue;
    }
    const x = Number(point.x);
    const y = Number(point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    card.pos = { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) };
  }
  project.updatedAt = nowIso();
  return null;
}

/* ------------------------------------------------------------------ tools */

/** Text a tool result renders as, for both the model and the card UI. */
function toolText(result) {
  const blocks = (result && result.content) || [];
  const parts = [];
  for (const block of blocks) {
    if (block && block.type === 'text' && typeof block.text === 'string') parts.push(block.text);
    else if (block && block.type) parts.push('[' + block.type + ']');
  }
  const text = parts.join('\n').trim();
  if (text) return text;
  if (result && result.value !== undefined) {
    try {
      return JSON.stringify(result.value);
    } catch (error) {
      return String(result.value);
    }
  }
  return '';
}

/** The live Agent that owns this tree, when the tree is bound to a Session. */
function resolveSessionAgent(ctx, state, projectId, hint) {
  try {
    const agents = ctx.get('agents');
    if (!agents || typeof agents.get !== 'function') return null;
    let sessionId = typeof hint === 'string' && hint.trim() ? hint.trim() : '';
    if (!sessionId && state.sessions) {
      for (const [candidate, boundProject] of Object.entries(state.sessions)) {
        if (boundProject === projectId) {
          sessionId = candidate;
          break;
        }
      }
    }
    if (!sessionId) return null;
    return agents.get(sessionId) || null;
  } catch (error) {
    console.warn('[card-tree] could not resolve the bound agent:', error && error.message);
    return null;
  }
}

/**
 * Read-only tool schemas a card may use. Plugin tools are registered globally,
 * so they work without a Session; file and shell tools only exist inside a
 * live Session's environment, hence the Agent.
 */
function readonlySchemas(ctx, agent) {
  const tools = ctx.get('tools');
  if (!tools || typeof tools.schemas !== 'function') return [];
  let schemas = [];
  try {
    schemas = tools.schemas(agent || undefined) || [];
  } catch (error) {
    schemas = [];
  }
  if (!schemas.length) {
    try {
      schemas = tools.schemas() || [];
    } catch (error) {
      schemas = [];
    }
  }
  return schemas.filter((schema) => schema && isReadonlyTool(schema.name));
}

/* ------------------------------------------------------------------ stream */

async function runStream(ctx, state, project, card, emit, register, options) {
  const llm = ctx.get('llm');
  if (!llm || typeof llm.stream !== 'function') throw new Error('DSH 的 llm 服务不可用，无法生成回答。');
  const model = (options && options.model) || currentModel(ctx, state, project);
  if (!model) throw new Error('没有可用的默认模型，请先在 DSH 里选择模型。');

  const controller = new AbortController();
  register(controller);

  const agent = (options && options.agent) || null;
  const toolsService = (options && options.tools) || null;
  const schemas = toolsService ? readonlySchemas(ctx, agent) : [];
  const system = buildSystem(project, card, options);
  const stats = { budget: 0, approxTokens: 0, foldedCards: 0, droppedCards: 0, droppedRefs: 0, refs: 0 };
  const contextWindow = Number(options && options.contextWindow) || FALLBACK_CONTEXT_WINDOW;
  const budget = Math.max(
    1500,
    Math.floor(contextWindow * CONTEXT_SHARE) - estimateTokens(system) - 1200,
  );
  const baseOptions = Object.assign({}, options, { budget, stats, system });
  const parts = [];
  const steps = [];
  let currentText = '';
  let lastPartialAt = 0;
  const composite = () => parts.concat(currentText ? [currentText] : []).join('\n\n');
  const onPartial = options && typeof options.onPartial === 'function' ? options.onPartial : null;

  const build = (messages) => {
    const request = {
      provider: model.provider,
      model: model.model,
      ...(model.reasoningEffort ? { reasoningEffort: model.reasoningEffort } : {}),
      system,
      messages,
      signal: controller.signal,
    };
    if (schemas.length > 0) request.tools = schemas;
    return request;
  };

  /** One model call: the visible text plus the tool calls it asked for. */
  const streamOnce = async (messages) => {
    let text = '';
    currentText = '';
    const calls = [];
    let finishKind = null;
    for await (const chunk of llm.stream(build(messages))) {
      if (!chunk || typeof chunk !== 'object') continue;
      if (chunk.type === 'text-delta') {
        text += chunk.text;
        currentText = text;
        emit({ type: 'delta', text: composite() });
        if (onPartial && Date.now() - lastPartialAt > 2500) {
          lastPartialAt = Date.now();
          try {
            onPartial(composite(), false);
          } catch (error) {
            /* partial persistence is best effort */
          }
        }
      } else if (chunk.type === 'block-end') {
        if (chunk.block && chunk.block.type === 'tool-call') calls.push(chunk.block);
      } else if (chunk.type === 'finish') {
        finishKind = (chunk.reason && chunk.reason.kind) || null;
        if (finishKind === 'error') {
          const failure = (chunk.reason && chunk.reason.failure) || {};
          throw new Error(failure.message || '模型调用失败');
        }
        if (finishKind === 'aborted') {
          const error = new Error('已停止生成');
          error.aborted = true;
          throw error;
        }
      }
    }
    return { text, calls, finishKind };
  };

  let messages = buildMessages(project, card, model, baseOptions);
  emit({
    type: 'start',
    runId: (options && options.runId) || null,
    provider: model.provider,
    model: model.model,
    tools: schemas.map((schema) => schema.name),
    contextWindow,
    approxTokens: stats.approxTokens,
    budget: stats.budget,
    foldedCards: stats.foldedCards,
    droppedCards: stats.droppedCards,
    droppedRefs: stats.droppedRefs,
    refs: stats.refs,
  });

  let outcome = null;
  try {
    outcome = await streamOnce(messages);
  } catch (error) {
    if (parts.length > 0) throw error;
    console.warn('[card-tree] role-separated history rejected, using a transcript turn:', error && error.message);
    messages = buildFlattenedMessages(project, card, options);
    outcome = await streamOnce(messages);
  }

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    if (!outcome.calls.length || outcome.finishKind !== 'tool-calls') break;
    if (!toolsService || typeof toolsService.execute !== 'function') break;
    if (outcome.text) parts.push(outcome.text);

    const started = outcome.calls.map((call) => ({
      name: call.name,
      arguments: String(call.arguments || '').slice(0, 400),
    }));
    emit({ type: 'tool', phase: 'start', calls: started });

    /* 执行前二次校验：模型可能调用未上架的工具，或给只读工具塞写操作参数。 */
    const verdicts = outcome.calls.map((call) => toolCallAllowed(call));
    const blocked = verdicts.filter((verdict) => !verdict.ok);
    let results;
    if (blocked.length > 0) {
      results = outcome.calls.map((call, index) => {
        const verdict = verdicts[index];
        const reason = verdict.ok ? '（同一次调用里有被拒绝的工具，整批未执行）' : verdict.reason;
        steps.push({
          name: call.name,
          arguments: String(call.arguments || '').slice(0, 400),
          ok: false,
          preview: reason,
        });
        return { isError: true, content: [{ type: 'text', text: reason }] };
      });
      emit({ type: 'tool', phase: 'end', steps });
    } else {
      let batch = null;
      try {
        batch = await toolsService.execute({
          calls: outcome.calls,
          signal: controller.signal,
          ...(agent ? { agent } : {}),
        });
      } catch (error) {
        const message = String((error && error.message) || error);
        emit({ type: 'tool', phase: 'end', steps, error: message });
        throw new Error('工具执行失败：' + message);
      }
      results = (batch.results || []).map((item) => (item && item.result ? item.result : item));
      outcome.calls.forEach((call, index) => {
        const result = results[index] || { isError: true, content: [{ type: 'text', text: '没有返回结果' }] };
        steps.push({
          name: call.name,
          arguments: String(call.arguments || '').slice(0, 400),
          ok: !result.isError,
          preview: toolText(result).slice(0, 2000),
        });
      });
      emit({ type: 'tool', phase: 'end', steps });
    }

    /* 工具结果也吃上下文预算：单条与整轮都截断，并明确告诉模型被截断了。 */
    let toolChars = 0;
    messages = messages.concat([
      {
        role: 'assistant',
        content: outcome.calls,
        source: { kind: 'model', provider: model.provider, model: model.model },
      },
      ...outcome.calls.map((call, index) => {
        const result = results[index] || { isError: true, content: [{ type: 'text', text: '没有返回结果' }] };
        const raw = toolText(result) || '(empty)';
        const room = Math.max(0, MAX_TOOL_TOTAL_CHARS - toolChars);
        const limit = Math.min(MAX_TOOL_RESULT_CHARS, room);
        let text = raw.slice(0, limit);
        if (text.length < raw.length) {
          text += '\n…（工具结果过长已截断，原始长度 ' + raw.length + ' 字符）';
        }
        toolChars += text.length;
        return {
          role: 'tool',
          content: [{ type: 'text', text }],
          source: { kind: 'tool', callId: call.id },
          toolCallId: call.id,
          ...(result.isError ? { isError: true } : {}),
        };
      }),
    ]);

    outcome = await streamOnce(messages);
  }

  if (outcome.text) parts.push(outcome.text);
  currentText = '';

  return {
    text: composite(),
    model,
    steps,
    tools: schemas.map((schema) => schema.name),
    stats,
  };
}

/* ---------------------------------------------------------------- routing */

async function handleRequest(ctx, state, controllers, req, res) {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const route = url.pathname.slice(ROUTE_PREFIX.length) || '/';

  if (req.method === 'GET' && (route === '/state' || route === '/')) {
    return sendJson(res, 200, snapshot(ctx, state));
  }

  if (req.method === 'GET' && route === '/health') {
    const services = serviceHealth(ctx);
    const missing = Object.keys(services).filter((name) => !services[name]);
    return sendJson(res, 200, {
      ok: true,
      health: {
        version: pluginVersion(),
        node: process.versions.node,
        revision: Number(state.revision) || 0,
        services,
        missing,
        readonly: readonlyStats(),
        toolConfig: localToolConfigPath(),
      },
    });
  }

  if (req.method === 'GET' && route === '/models') {
    const scoped = findProject(state, url.searchParams.get('projectId') || '');
    return sendJson(res, 200, {
      ok: true,
      providers: await modelCatalog(ctx),
      current: currentModel(ctx, state, scoped),
      global: currentModel(ctx, state),
      projectModel: (scoped && scoped.model) || null,
      defaultModel: resolveModel(ctx),
    });
  }

  if (req.method === 'GET' && route === '/effort') {
    return sendJson(
      res,
      200,
      await effortInfo(ctx, state, url.searchParams.get('provider') || '', url.searchParams.get('model') || '', url.searchParams.get('projectId') || ''),
    );
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: '只支持 GET /state 与 POST 操作' });
  }

  const body = await readBody(req);

  if (route === '/model') {
    const op = body.op || 'set';
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const project = projectId ? findProject(state, projectId) : null;
    if (projectId && !project) throw new Error('项目不存在');
    if (op === 'reset') {
      if (project) project.model = null;
      else state.model = null;
    } else if (op === 'set') {
      const provider = String(body.provider || '');
      const model = String(body.model || '');
      if (!provider || !model) throw new Error('缺少 provider 或 model');
      const extra = body.reasoningEffort
        ? { reasoningEffort: String(body.reasoningEffort) }
        : await withDefaultEffort(ctx, provider, model);
      const choice = Object.assign({ provider, model }, extra);
      if (project) {
        project.model = choice;
        project.updatedAt = nowIso();
      } else {
        state.model = choice;
      }
    } else {
      throw new Error('未知的模型操作');
    }
    saveState(state);
    return sendJson(res, 200, snapshot(ctx, state));
  }

  if (route === '/project') {
    const op = body.op;
    if (op === 'create') projectCreate(state, body);
    else if (op === 'update') projectUpdate(state, body);
    else if (op === 'import') projectImport(state, body);
    else if (op === 'delete') {
      abortRuns(controllers, (entry) => entry.projectId === body.projectId);
      projectDelete(state, body);
    } else throw new Error('未知的项目操作');
    saveState(state);
    return sendJson(res, 200, snapshot(ctx, state));
  }

  if (route === '/session') {
    const op = body.op;
    let result = null;
    if (op === 'bind') result = sessionBind(state, body);
    else if (op === 'unbind') result = sessionUnbind(state, body);
    else throw new Error('未知的会话操作');
    saveState(state);
    return sendJson(res, 200, Object.assign(snapshot(ctx, state), { result }));
  }

  if (route === '/card') {
    const op = body.op;
    if (op === 'create') cardCreate(state, body);
    else if (op === 'update') cardUpdate(state, body);
    else if (op === 'delete') {
      abortRuns(
        controllers,
        (entry) => entry.projectId === body.projectId && entry.cardId === body.cardId,
      );
      cardDelete(state, body);
    } else if (op === 'reparent') cardReparent(state, body);
    else if (op === 'layout') cardLayout(state, body);
    else if (op === 'follow') cardFollowCreate(state, body);
    else if (op === 'ref') cardRefs(state, body);
    else throw new Error('未知的卡片操作');
    saveState(state);
    return sendJson(res, 200, snapshot(ctx, state));
  }

  if (route === '/send') {
    const project = findProject(state, body.projectId);
    if (!project) return sendJson(res, 404, { ok: false, error: '项目不存在' });
    const card = findCard(project, body.cardId);
    if (!card) return sendJson(res, 404, { ok: false, error: '卡片不存在' });
    const followUpId = typeof body.followUpId === 'string' ? body.followUpId : '';
    const followUp = followUpId ? findFollowUp(card, followUpId) : null;
    if (followUpId && !followUp) return sendJson(res, 404, { ok: false, error: '这条追问不存在' });
    const target = followUp || card;
    if (target.status === 'running') {
      return sendJson(res, 409, { ok: false, error: followUp ? '这条追问正在生成中' : '这张卡片正在生成中' });
    }
    if (!target.prompt) return sendJson(res, 400, { ok: false, error: followUp ? '追问不能为空' : '问题不能为空' });

    abortRuns(controllers, (entry) => entry.projectId === project.id && entry.cardId === card.id);

    let imageModel = null;
    if (Array.isArray(body.attachments) && body.attachments.length > 0) {
      let prepared = null;
      try {
        prepared = await prepareAttachments(ctx, body.attachments);
      } catch (error) {
        return sendJson(res, 400, { ok: false, error: String((error && error.message) || error) });
      }
      if (prepared.some((item) => item.kind === 'image')) {
        imageModel = await resolveImageModel(ctx, state, project);
        if (!imageModel) {
          return sendJson(res, 422, {
            ok: false,
            error: '没有可用的、支持图片输入的模型，请先在 DSH 里配置一个多模态模型。',
          });
        }
      }
      target.attachments = prepared;
    }

    const runId = nid('run');
    target.status = 'running';
    target.answer = '';
    target.error = null;
    target.runId = runId;
    target.steps = [];
    target.tools = [];
    target.updatedAt = nowIso();
    try {
      saveState(state);
    } catch (error) {
      target.status = 'idle';
      target.runId = null;
      return sendJson(res, 500, { ok: false, error: String((error && error.message) || error) });
    }

    const rawEmit = openStream(res);
    const emit = followUp
      ? (event) => rawEmit(Object.assign({ followUpId: followUp.id }, event))
      : rawEmit;

    if (imageModel && imageModel.source === 'vision-fallback') {
      const previous = currentModel(ctx, state, project);
      emit({
        type: 'notice',
        text:
          '当前模型不能读取图片，已改用 ' +
          imageModel.model +
          ' 生成' +
          (previous && previous.model ? '（原模型 ' + previous.model + '）' : '') +
          '。',
      });
    }

    const entry = {
      controller: null,
      projectId: project.id,
      cardId: card.id,
      followUpId: followUp ? followUp.id : null,
    };
    const register = (controller) => {
      entry.controller = controller;
      controllers.set(runId, entry);
    };
    let closed = false;
    req.on('close', () => {
      closed = true;
      if (entry.controller) {
        try {
          entry.controller.abort();
        } catch (error) {
          /* ignore */
        }
      }
    });

    const agent = resolveSessionAgent(ctx, state, project.id, body.sessionId);
    let toolsService = null;
    try {
      toolsService = ctx.get('tools') || null;
    } catch (error) {
      toolsService = null;
    }

    const onPartial = (text) => {
      if (!text) return;
      target.answer = text;
      target.status = 'running';
      try {
        saveState(state);
      } catch (error) {
        /* keep streaming: the final write is what must succeed */
      }
    };

    try {
      const result = await runStream(ctx, state, project, card, emit, register, {
        agent,
        tools: toolsService,
        model: imageModel,
        followUp,
        runId,
        onPartial,
      });
      target.answer = result.text;
      target.steps = result.steps || [];
      target.tools = result.tools || [];
      target.stats = result.stats || null;
      target.status = 'done';
      target.updatedAt = nowIso();
      saveState(state);
      emit({ type: 'done', card, model: result.model, stats: result.stats || null });
    } catch (error) {
      const aborted =
        Boolean(error && (error.aborted || error.name === 'AbortError' || error.name === 'AbortError')) ||
        (closed && !target.answer);
      const partial = String(target.answer || '').trim();
      target.status = aborted ? (partial ? 'partial' : 'idle') : 'error';
      target.error = aborted
        ? partial
          ? '生成被中断，已保留上面这部分。'
          : null
        : String((error && error.message) || error);
      target.updatedAt = nowIso();
      try {
        saveState(state);
      } catch (saveError) {
        /* already answering with a failed write */
      }
      if (!closed) {
        emit(
          aborted
            ? { type: 'aborted', card, answer: target.answer || '', status: target.status }
            : { type: 'error', card, error: target.error },
        );
      }
    } finally {
      controllers.delete(runId);
      if (!closed) res.end();
    }
    return undefined;
  }

  if (route === '/stop') {
    const runId = typeof body.runId === 'string' ? body.runId : '';
    let stopped = 0;
    if (runId) {
      const entry = controllers.get(runId);
      if (entry && entry.controller) {
        try {
          entry.controller.abort();
        } catch (error) {
          /* ignore */
        }
        stopped += 1;
      }
    } else {
      const projectId = String(body.projectId || '');
      const cardId = String(body.cardId || '');
      const followUpId = body.followUpId ? String(body.followUpId) : '';
      stopped += abortRuns(
        controllers,
        (entry) =>
          entry.projectId === projectId &&
          entry.cardId === cardId &&
          (entry.followUpId || '') === followUpId,
      );
    }
    if (stopped === 0) {
      const project = findProject(state, body.projectId);
      const card = project ? findCard(project, body.cardId) : null;
      const followUp = card && body.followUpId ? findFollowUp(card, String(body.followUpId)) : null;
      const target = followUp || card;
      if (target && target.status === 'running') {
        const partial = String(target.answer || '').trim();
        target.status = partial ? 'partial' : 'error';
        target.error = partial ? '生成被中断，已保留上面这部分。' : '上一次生成被中断（没有收到任何内容）。';
        target.updatedAt = nowIso();
        target.runId = null;
        saveState(state);
      }
    }
    return sendJson(res, 200, snapshot(ctx, state));
  }

  return sendJson(res, 404, { ok: false, error: '未知接口' });
}

export function apply(ctx) {
  const state = loadState();
  const controllers = new Map();

  ctx.inject(['webServer'], (scope) => {
    const dispose = scope.webServer.register({
      kind: 'prefix',
      path: ROUTE_PREFIX,
      handler: async (req, res) => {
        try {
          await handleRequest(ctx, state, controllers, req, res);
        } catch (error) {
          if (!res.headersSent) {
            sendJson(res, 500, { ok: false, error: String((error && error.message) || error) });
          } else {
            try {
              res.end();
            } catch (endError) {
              /* already gone */
            }
          }
        }
      },
    });
    return () => {
      for (const entry of controllers.values()) {
        try {
          if (entry && entry.controller) entry.controller.abort();
        } catch (error) {
          /* ignore */
        }
      }
      controllers.clear();
      dispose();
    };
  });
}

/**
 * Pure pieces exposed for `scripts/verify.mjs`, so the Host half can be tested
 * in plain Node without booting DSH.
 */
export const __test = {
  ROUTE_PREFIX,
  STATE_VERSION,
  DEFAULT_SYSTEM,
  ancestorChain,
  answeredFollowUps,
  attachmentBlocks,
  buildFlattenedMessages,
  buildMessages,
  buildSystem,
  cardBlocks,
  cardCreate,
  cardDelete,
  cardFollowCreate,
  cardLayout,
  cardReparent,
  cardRefs,
  cardUpdate,
  emptyState,
  findCard,
  findFollowUp,
  findProject,
  followUpBlocks,
  foldAnswer,
  estimateTokens,
  isDescendant,
  isReadonlyTool,
  loadState,
  localToolConfigPath,
  looksTextual,
  normalizeImageMediaType,
  normalizeToolConfig,
  planContext,
  prepareAttachments,
  projectCreate,
  projectDelete,
  projectImport,
  projectUpdate,
  pruneRefs,
  readLocalToolConfig,
  readonlyStats,
  reloadLocalToolConfig,
  resolvedRefs,
  saveState,
  sessionBind,
  sessionUnbind,
  stateFilePath,
  toolCallAllowed,
  toolCallArgs,
};

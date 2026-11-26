#!/usr/bin/env node
/**
 * Card Tree self-check. Runs without DSH:
 *
 *   node scripts/verify.mjs
 *
 * 1. Syntax-checks both halves.
 * 2. Checks package.json / patch / locale / icon.
 * 3. Audits the client's i18n keys and CSS classes.
 * 4. Unit-tests the Host half's pure logic (state, prompts, attachments).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

let failures = 0;
let checks = 0;

function check(name, run) {
  checks += 1;
  try {
    const detail = run();
    console.log('  ok   ' + name + (detail ? ' — ' + detail : ''));
  } catch (error) {
    failures += 1;
    console.log('  FAIL ' + name + ' — ' + String((error && error.message) || error));
  }
}

async function checkAsync(name, run) {
  checks += 1;
  try {
    const detail = await run();
    console.log('  ok   ' + name + (detail ? ' — ' + detail : ''));
  } catch (error) {
    failures += 1;
    console.log('  FAIL ' + name + ' — ' + String((error && error.message) || error));
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const read = (path) => readFileSync(join(root, path), 'utf8');

/* --------------------------------------------------------------- syntax */

console.log('\nsyntax');
for (const file of ['index.js', 'client.js']) {
  check(file, () => {
    execFileSync(process.execPath, ['--check', join(root, file)], { stdio: 'pipe' });
    return 'parses';
  });
}

/* ---------------------------------------------------------------- files */

console.log('\npackage');
const pkg = JSON.parse(read('package.json'));
check('package.json', () => {
  assert(pkg.name === 'dsh-card-tree', 'unexpected package name');
  assert(pkg.type === 'module', 'type must be module');
  assert(pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch, 'missing dsh.bundle.patch');
  assert(pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === 'web', 'missing dsh.client.platform');
  assert(Array.isArray(pkg.files) && pkg.files.length > 0, 'files must list the shipped entries');
  return pkg.name + '@' + pkg.version;
});

check('cordis.patch.yml', () => {
  const patch = read('cordis.patch.yml');
  assert(/insert:/.test(patch), 'patch has no insert');
  assert(patch.includes(pkg.name), 'patch does not insert ' + pkg.name);
  return 'inserts ' + pkg.name;
});

check('shipped docs', () => {
  for (const entry of [
    'INSTALL.md',
    'README.md',
    'LICENSE',
    'docs/ARCHITECTURE.md',
    'docs/USAGE.md',
    'docs/TUTORIAL.md',
    'docs/preview.png',
    'docs/preview-overview.png',
    'scripts/install.ps1',
  ]) {
    assert(existsSync(join(root, entry)), entry + ' missing');
  }
  assert(pkg.files.includes('INSTALL.md'), 'files must ship INSTALL.md');
  assert(pkg.files.includes('LICENSE'), 'files must ship LICENSE');
  assert(pkg.files.includes('docs/USAGE.md'), 'files must ship docs/USAGE.md');
  assert(pkg.files.includes('docs/TUTORIAL.md'), 'files must ship docs/TUTORIAL.md');
  assert(pkg.files.includes('docs/preview.png'), 'files must ship docs/preview.png');
  assert(pkg.files.includes('docs/preview-overview.png'), 'files must ship docs/preview-overview.png');
  assert(pkg.files.includes('scripts/install.ps1'), 'files must ship scripts/install.ps1');
  return 'INSTALL.md + LICENSE + USAGE.md + previews + install.ps1';
});

check('math assets', () => {
  // KaTeX is vendored so answers typeset offline; the routes and the npm files list
  // both depend on these exact paths.
  for (const entry of ['vendor/katex/katex.min.js', 'vendor/katex/katex.min.css', 'vendor/katex/LICENSE']) {
    assert(existsSync(join(root, entry)), entry + ' missing');
  }
  const fonts = readdirSync(join(root, 'vendor/katex/fonts')).filter((name) => name.endsWith('.woff2'));
  assert(fonts.length >= 15, 'expected the KaTeX woff2 fonts, found ' + fonts.length);
  assert(pkg.files.includes('vendor/katex/katex.min.js'), 'files must ship the KaTeX script');
  assert(pkg.files.includes('vendor/katex/fonts/*.woff2'), 'files must ship the KaTeX fonts');
  return fonts.length + ' woff2 fonts, ' + pkg.version;
});

check('generic sources', () => {
  // The repo must not advertise which personal plugins the author runs: those names
  // belong in the local tools.json. Patterns are assembled so this file does not
  // trip its own scan.
  const banned = new RegExp(['wechat', 'bilibili', 'douban', 'fduhole', 'elearning'].map((name) => name + '_').join('|'));
  for (const file of ['index.js', 'README.md', 'INSTALL.md', 'docs/USAGE.md', 'docs/ARCHITECTURE.md', 'scripts/verify.mjs']) {
    assert(!banned.test(read(file)), file + ' must not name machine-local plugins');
  }
  return 'no machine-local plugin names in shipped sources';
});

check('icon', () => {
  assert(existsSync(join(root, 'icon.svg')), 'icon.svg missing');
  return 'icon.svg';
});

check('locales', () => {
  for (const lang of ['en', 'zh']) {
    const meta = JSON.parse(read('locale/' + lang + '.json'));
    assert(meta.meta && meta.meta.title, lang + ' meta.title missing');
    assert(meta.meta.description, lang + ' meta.description missing');
  }
  return 'en + zh';
});

/* --------------------------------------------------------------- client */

console.log('\nclient');
const client = read('client.js');
const copyStart = client.indexOf('const COPY = {');
const copyEnd = client.indexOf('\n    function lang()', copyStart);
const copy = client.slice(copyStart, copyEnd);

function keysOf(lang) {
  const start = copy.indexOf(lang + ': {');
  const end = copy.indexOf('\n      },', start);
  const body = copy.slice(start, end);
  const keys = new Set();
  for (const match of body.matchAll(/^\s{8}([A-Za-z0-9_]+):/gm)) keys.add(match[1]);
  return keys;
}

const zh = keysOf('zh');
const en = keysOf('en');
const body = client.slice(copyEnd);
const used = new Set();
for (const match of body.matchAll(/strings\.([A-Za-z0-9_]+)/g)) used.add(match[1]);
for (const match of body.matchAll(/\bt\(\)\.([A-Za-z0-9_]+)/g)) used.add(match[1]);

check('i18n keys', () => {
  const missingZh = [...used].filter((key) => !zh.has(key));
  const missingEn = [...used].filter((key) => !en.has(key));
  assert(missingZh.length === 0, 'missing in zh: ' + missingZh.join(', '));
  assert(missingEn.length === 0, 'missing in en: ' + missingEn.join(', '));
  const dead = [...zh].filter((key) => !used.has(key));
  assert(dead.length === 0, 'unused keys (delete them): ' + dead.join(', '));
  return used.size + ' keys, zh ' + zh.size + ' / en ' + en.size;
});

check('css classes', () => {
  const cssStart = client.indexOf('const CSS = `');
  const cssEnd = client.indexOf('`;', cssStart);
  const css = client.slice(cssStart, cssEnd);
  const defined = new Set();
  for (const match of css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) defined.add(match[1]);
  const outside = client.slice(0, cssStart) + client.slice(cssEnd);
  const wanted = new Set();
  for (const match of outside.matchAll(/className: '([^']+)'/g)) {
    for (const token of match[1].split(/\s+/)) if (token) wanted.add(token);
  }
  const missing = [...wanted].filter((name) => !defined.has(name));
  assert(missing.length === 0, 'classes used but not defined: ' + missing.join(', '));
  return defined.size + ' defined';
});

check('single-file bundle', () => {
  const requires = [...client.matchAll(/require\('([^']+)'\)/g)].map((match) => match[1]);
  const foreign = requires.filter((name) => name !== 'react');
  assert(foreign.length === 0, 'client bundle only supports its single entry file, found: ' + foreign.join(', '));
  return requires.length === 1 ? 'requires react only' : 'no relative requires';
});

check('math rendering', () => {
  const escBegin = client.indexOf('/* @verify:escape-begin */');
  const escFinish = client.indexOf('/* @verify:escape-end */');
  assert(escBegin >= 0 && escFinish > escBegin, 'escapeHtml markers not found in client.js');
  const escapeSrc = client.slice(escBegin, escFinish);
  const mathStart = client.indexOf('/* @verify:math-begin */');
  const mathEnd = client.indexOf('/* @verify:math-end */');
  assert(mathStart >= 0 && mathEnd > mathStart, 'math section markers not found in client.js');
  const mathSrc = client.slice(mathStart, mathEnd);
  const factory = new Function(escapeSrc + '\n' + mathSrc + '\nreturn { mathHtml, looksLikeMath };');
  const math = factory();

  const frac = math.mathHtml('\\frac{a}{b}', true, false);
  assert(frac.indexOf('ct-mfrac') >= 0, 'fraction markup, got: ' + frac);
  assert(frac.indexOf('ct-mnum') >= 0 && frac.indexOf('ct-mden') >= 0, 'fraction numerator/denominator');

  const cal = math.mathHtml('\\mathcal{X}', false, false);
  assert(cal.indexOf('𝒳') >= 0, 'mathcal should map to a script letter, got: ' + cal);

  const bb = math.mathHtml('\\mathbb{R}^k', false, false);
  assert(bb.indexOf('ℝ') >= 0, 'mathbb R, got: ' + bb);
  assert(bb.indexOf('<sup>k</sup>') >= 0, 'superscript, got: ' + bb);

  const greek = math.mathHtml('\\theta \\in \\Theta', false, false);
  assert(greek.indexOf('θ') >= 0 && greek.indexOf('∈') >= 0 && greek.indexOf('Θ') >= 0, 'greek and relations: ' + greek);

  const sub = math.mathHtml('P_\\theta', false, false);
  assert(sub.indexOf('<sub>θ</sub>') >= 0, 'subscript, got: ' + sub);

  assert(math.looksLikeMath('\\theta') === true, 'tex should be detected');
  assert(math.looksLikeMath('k=2') === true, 'letter+operator should count as math');
  assert(math.looksLikeMath('t(k)') === true, 'distribution notation t(k) should count as math');
  assert(math.looksLikeMath('F(m,n)') === true, 'F(m,n) should count as math');
  assert(math.looksLikeMath('N(0,1)') === true, 'N(0,1) should count as math');
  assert(math.looksLikeMath('(see note)') === false, 'a spaced phrase should stay text');
  assert(math.looksLikeMath('5') === false, 'plain money should stay text');
  assert(math.looksLikeMath('3.50') === false, 'a decimal price should stay text');

  const block = math.mathHtml('SST = SSB + SSW', true, false, true);
  assert(block.indexOf('ct-math-inline-block') >= 0, 'display math keeps a block wrapper, got: ' + block);
  assert(block.indexOf('SST = SSB + SSW') >= 0, 'display math body survives');

  const evil = math.mathHtml('<img src=x onerror=alert(1)>', false, false);
  assert(evil.indexOf('<img') < 0, 'math output must stay escaped');
  return 'fractions, greek, script/blackboard, scripts, escaping';
});

/* ----------------------------------------------------------- host logic */

console.log('\nhost logic');
/* Text attachments now spill to disk: keep that out of the real ~/.dsh. */
const sandboxHome = join(tmpdir(), 'card-tree-verify-' + process.pid);
mkdirSync(sandboxHome, { recursive: true });
process.env.DSH_HOME = sandboxHome;
const host = await import(pathToFileURL(join(root, 'index.js')).href);
const T = host.__test;

check('empty state', () => {
  const state = T.emptyState();
  assert(state.version === T.STATE_VERSION, 'version mismatch');
  assert(Array.isArray(state.projects) && state.projects.length === 0, 'projects must start empty');
  assert(state.sessions && typeof state.sessions === 'object', 'sessions map missing');
  return 'version ' + state.version;
});

check('project / card / session lifecycle', () => {
  const state = T.emptyState();
  const project = T.projectCreate(state, { title: 'Verify' });
  assert(project && project.id, 'project not created');
  const root = T.cardCreate(state, { projectId: project.id, parentId: null, mode: 'root', prompt: 'root question' });
  assert(root && root.id, 'root card not created');
  T.cardUpdate(state, { projectId: project.id, cardId: root.id, answer: 'root answer', status: 'done' });
  const child = T.cardCreate(state, { projectId: project.id, parentId: root.id, mode: 'child', prompt: 'child question' });
  assert(child && child.parentId === root.id, 'child not linked');
  T.sessionBind(state, { sessionId: 'session-1', projectId: project.id });
  assert(state.sessions['session-1'] === project.id, 'session binding missing');
  T.sessionUnbind(state, { sessionId: 'session-1' });
  assert(!state.sessions['session-1'], 'session binding not removed');
  T.cardDelete(state, { projectId: project.id, cardId: child.id });
  assert(T.findCard(project, child.id) === null, 'card not deleted');
  T.projectDelete(state, { projectId: project.id });
  assert(state.projects.length === 0, 'project not deleted');
  return 'create / bind / delete';
});

check('context assembly', () => {
  const state = T.emptyState();
  const project = T.projectCreate(state, { title: 'Context' });
  const root = T.cardCreate(state, { projectId: project.id, parentId: null, mode: 'root', prompt: 'what is attention?' });
  T.cardUpdate(state, { projectId: project.id, cardId: root.id, answer: 'a weighting scheme', status: 'done' });
  const child = T.cardCreate(state, { projectId: project.id, parentId: root.id, mode: 'child', prompt: 'why softmax?' });
  T.cardUpdate(state, { projectId: project.id, cardId: child.id, answer: '', status: 'idle' });
  const model = { provider: 'p', model: 'm' };
  const messages = T.buildMessages(project, child, model);
  assert(messages.length === 3, 'expected user/assistant/user, got ' + messages.length);
  assert(messages[0].role === 'user' && messages[1].role === 'assistant', 'wrong role order');
  assert(messages[2].content[0].text === 'why softmax?', 'current prompt missing');
  const system = T.buildSystem(project, child);
  assert(system.includes('【你在对话树里的位置】'), 'system lacks tree position');
  assert(system.includes('what is attention?'), 'system lacks parent question');
  assert(system.includes('第 2 层'), 'system lacks depth');
  const flat = T.buildFlattenedMessages(project, child);
  assert(flat.length === 1 && flat[0].content[0].text.includes('why softmax?'), 'flattened fallback broken');
  return '3 messages, depth 2';
});

check('follow-up thread', () => {
  const state = T.emptyState();
  const project = T.projectCreate(state, { title: 'FollowUp' });
  const root = T.cardCreate(state, { projectId: project.id, parentId: null, mode: 'root', prompt: 'what is attention?' });
  T.cardUpdate(state, { projectId: project.id, cardId: root.id, answer: 'a weighting scheme', status: 'done' });
  const first = T.cardFollowCreate(state, { projectId: project.id, cardId: root.id, prompt: 'why softmax?' });
  assert(first && first.followUp && first.followUp.id, 'follow-up not created');
  const live = T.findCard(project, root.id);
  assert(Array.isArray(live.followUps) && live.followUps.length === 1, 'follow-up not stored on the card');
  live.followUps[0].answer = 'because it normalises';
  live.followUps[0].status = 'done';
  const second = T.cardFollowCreate(state, { projectId: project.id, cardId: root.id, prompt: 'and temperature?' });
  const messages = T.buildMessages(project, live, { provider: 'p', model: 'm' }, { followUp: second.followUp });
  assert(messages.length === 5, 'expected card Q/A + one answered follow-up + the live one, got ' + messages.length);
  const system = T.buildSystem(project, live, { followUp: second.followUp });
  assert(system.includes('追问'), 'follow-up system prompt missing');
  assert(T.answeredFollowUps(live, second.followUp.id).length === 1, 'answered follow-ups not picked up');
  assert(Array.isArray(T.followUpBlocks(second.followUp)), 'follow-up blocks missing');
  assert(T.findFollowUp(live, first.followUp.id).id === first.followUp.id, 'follow-up lookup broken');
  return '5 messages, 2 follow-ups';
});

check('standalone card', () => {
  const state = T.emptyState();
  const project = T.projectCreate(state, { title: 'Standalone' });
  const root = T.cardCreate(state, { projectId: project.id, parentId: null, mode: 'root', prompt: 'root' });
  const loose = T.cardCreate(state, { projectId: project.id, parentId: root.id, mode: 'isolated', prompt: 'unrelated' });
  assert(loose.parentId === null, 'standalone card must not be linked to a parent');
  assert(loose.mode === 'isolated', 'standalone card lost its mode');
  assert(T.ancestorChain(project, loose).length === 0, 'standalone card must have no ancestors');
  return 'unlinked card';
});

check('graph edits', () => {
  const state = T.emptyState();
  const project = T.projectCreate(state, { title: 'Graph' });
  const root = T.cardCreate(state, { projectId: project.id, parentId: null, mode: 'root', prompt: 'root' });
  const child = T.cardCreate(state, { projectId: project.id, parentId: root.id, mode: 'child', prompt: 'child' });
  const sibling = T.cardCreate(state, { projectId: project.id, parentId: root.id, mode: 'diverge', prompt: 'sibling' });

  assert(!T.isDescendant(project, sibling.id, child.id), 'child must not descend from sibling');
  T.cardReparent(state, { projectId: project.id, cardId: sibling.id, parentId: child.id });
  assert(T.findCard(project, sibling.id).parentId === child.id, 'reparent did not move the card');
  assert(T.findCard(project, sibling.id).mode === 'child', 'reparent should set child mode');
  assert(T.isDescendant(project, child.id, sibling.id), 'descendant check missed the new edge');

  let blocked = false;
  try {
    T.cardReparent(state, { projectId: project.id, cardId: root.id, parentId: sibling.id });
  } catch (error) {
    blocked = true;
  }
  assert(blocked, 'cycle was not rejected');

  T.cardLayout(state, { projectId: project.id, positions: { [child.id]: { x: 40.6, y: 12 } } });
  assert(T.findCard(project, child.id).pos.x === 41, 'layout did not persist the point');
  T.cardLayout(state, { projectId: project.id, positions: 'reset' });
  assert(T.findCard(project, child.id).pos === undefined, 'reset did not clear positions');
  return 'reparent / cycle guard / layout';
});

check('reference network', () => {
  const state = T.emptyState();
  const project = T.projectCreate(state, { title: 'Refs' });
  const root = T.cardCreate(state, { projectId: project.id, parentId: null, mode: 'root', prompt: 'root q' });
  T.cardUpdate(state, { projectId: project.id, cardId: root.id, answer: 'root a', status: 'done' });
  const leaf = T.cardCreate(state, { projectId: project.id, parentId: root.id, mode: 'child', prompt: 'leaf q' });
  const other = T.cardCreate(state, { projectId: project.id, parentId: null, mode: 'isolated', prompt: 'other q' });
  T.cardUpdate(state, { projectId: project.id, cardId: other.id, answer: 'other a', status: 'done' });

  T.cardRefs(state, { projectId: project.id, cardId: leaf.id, targetId: other.id });
  const live = T.findCard(project, leaf.id);
  assert(Array.isArray(live.refs) && live.refs.length === 1, 'reference not stored on the card');
  assert(T.resolvedRefs(project, live).length === 1, 'resolvedRefs missed the edge');
  const messages = T.buildMessages(project, live, { provider: 'p', model: 'm' });
  const text = messages
    .map((message) => (Array.isArray(message.content) ? message.content.map((block) => block.text || '').join(' ') : ''))
    .join('\n');
  assert(messages.length === 5, 'expected ancestor pair + reference pair + question, got ' + messages.length);
  assert(text.includes('【引用卡片') && text.includes('other a'), 'reference block missing from messages');
  assert(T.buildSystem(project, live).includes('引用了'), 'system prompt does not mention references');
  assert(T.buildFlattenedMessages(project, live)[0].content[0].text.includes('引用卡片'), 'flattened fallback lost the reference');

  let selfBlocked = false;
  try {
    T.cardRefs(state, { projectId: project.id, cardId: leaf.id, targetId: leaf.id });
  } catch (error) {
    selfBlocked = true;
  }
  assert(selfBlocked, 'self reference was not rejected');

  // A pair of cards carries at most one line: pointing back is the same edge.
  T.cardRefs(state, { projectId: project.id, cardId: other.id, targetId: leaf.id });
  assert(T.findCard(project, other.id).refs.length === 0, 'reverse reference created a second line');

  // Older state files could still carry both directions (or an id twice).
  T.findCard(project, leaf.id).refs.push(other.id);
  T.findCard(project, other.id).refs.push(leaf.id);
  T.pruneRefs(project);
  const lines = T.findCard(project, leaf.id).refs.length + T.findCard(project, other.id).refs.length;
  assert(lines === 1, 'pruneRefs left ' + lines + ' lines for one pair');

  T.cardRefs(state, { projectId: project.id, cardId: leaf.id, targetId: other.id, remove: true });
  assert(T.findCard(project, leaf.id).refs.length === 0, 'reference was not removed');
  return 'add / resolve / messages / untied pairs / remove';
});

await checkAsync('attachments', async () => {
  const calls = [];
  const ctx = {
    get(name) {
      if (name !== 'attachments') return null;
      return {
        saveImage: async (input) => {
          calls.push('image');
          return { attachmentId: 'sha256:1', mediaType: input.mediaType, bytes: input.data.length, width: 1, height: 1 };
        },
        admitEncodedFile: async (input) => {
          calls.push('file');
          return { attachmentId: 'sha256:2', name: input.name, bytes: 3 };
        },
      };
    },
  };
  const prepared = await T.prepareAttachments(ctx, [
    { name: 'note.md', mime: 'text/markdown', dataB64: Buffer.from('# hi').toString('base64') },
    { name: 'dot.png', mime: 'image/png', dataB64: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64') },
    { name: 'archive.zip', mime: 'application/zip', dataB64: Buffer.from('zip').toString('base64') },
  ]);
  assert(prepared.length === 3, 'expected three attachments');
  assert(prepared[0].kind === 'text' && prepared[0].file, 'text attachment was not spilled to disk');
  assert(prepared[1].kind === 'image' && prepared[1].ref, 'image attachment not saved');
  assert(prepared[2].kind === 'file' && prepared[2].ref, 'file attachment not admitted');
  const blocks = T.attachmentBlocks(prepared);
  assert(
    blocks[0].type === 'text' && String(blocks[0].text).includes('hi'),
    'text attachment not readable from disk',
  );
  assert(blocks[1].type === 'image' && blocks[2].type === 'file', 'block mapping broken');
  return calls.join(', ');
});

await checkAsync('tool guard', async () => {
  const allowed = (name, args) => T.toolCallAllowed({ id: 't1', name, arguments: JSON.stringify(args || {}) });
  assert(allowed('read', { file_path: 'x' }).ok, 'read should be allowed');
  assert(allowed('web_search', { query: 'x' }).ok, 'web_search should be allowed');
  assert(!allowed('write', { file_path: 'x', content: 'y' }).ok, 'write must be blocked');
  assert(!allowed('pwsh', { command: 'dir' }).ok, 'pwsh must be blocked');
  assert(!allowed('sidebar_open', {}).ok, 'sidebar_open should no longer be allowed');
  assert(!T.toolCallAllowed({ id: 't2', name: 'read', arguments: '{oops' }).ok, 'bad JSON must be rejected');

  // Machine-local extras come from tools.json next to state.json, never from the repo.
  const toolsFile = T.localToolConfigPath();
  mkdirSync(dirname(toolsFile), { recursive: true });
  writeFileSync(
    toolsFile,
    JSON.stringify({
      tools: ['demo_plugin_status', 'demo_plugin_read'],
      prefixes: ['demo_pipe_'],
      params: { demo_plugin_read: ['info', 'list'] },
    }),
    'utf8',
  );
  T.reloadLocalToolConfig();
  assert(T.isReadonlyTool('demo_plugin_status'), 'local exact tool should be allowed');
  assert(T.isReadonlyTool('demo_pipe_anything'), 'local prefix should be allowed');
  assert(!T.isReadonlyTool('demo_plugin_write'), 'local unlisted tool must stay blocked');
  assert(allowed('demo_plugin_read', { action: 'info' }).ok, 'local param allow should work');
  assert(!allowed('demo_plugin_read', { action: 'submit' }).ok, 'local param guard must block writes');
  assert(T.readonlyStats().local === 2, 'readonly stats should count local tools');
  writeFileSync(toolsFile, JSON.stringify({ tools: [], prefixes: [], params: {} }), 'utf8');
  T.reloadLocalToolConfig();
  assert(!T.isReadonlyTool('demo_plugin_status'), 'removing the config removes the tool');
  return 'builtin guard + local tools.json merge';
});

await checkAsync('context budget', async () => {
  const state = T.emptyState();
  const project = T.projectCreate(state, { title: 'Budget' });
  const root = T.cardCreate(state, { projectId: project.id, mode: 'root', prompt: 'root' });
  T.cardUpdate(state, { projectId: project.id, cardId: root.id, answer: '一'.repeat(4000) });
  const child = T.cardCreate(state, { projectId: project.id, parentId: root.id, mode: 'child', prompt: 'second' });
  T.cardUpdate(state, { projectId: project.id, cardId: child.id, answer: '一'.repeat(4000) });
  const leaf = T.cardCreate(state, { projectId: project.id, parentId: child.id, mode: 'child', prompt: 'leaf' });
  const plan = T.planContext(state.projects[0], T.findCard(state.projects[0], leaf.id), { budget: 2600 });
  assert(plan.stats.foldedCards >= 1, 'expected at least one folded ancestor');
  assert(plan.entries[0].answer.length < 4000, 'folded answer should be shortened');
  const messages = T.buildMessages(
    state.projects[0],
    T.findCard(state.projects[0], leaf.id),
    { provider: 'probe', model: 'probe-1' },
    { budget: 2600 },
  );
  const flat = JSON.stringify(messages);
  assert(flat.includes('已省略'), 'folded text should say it was shortened');
  return plan.stats.foldedCards + ' folded';
});

await checkAsync('card title', async () => {
  assert(T.cleanCardTitle('  ## "卡片树：一张卡片一个结论。"  ') === '卡片树：一张卡片一个结论', 'should strip markup and quotes');
  assert(T.cleanCardTitle('标题：为什么要用树\n第二行解释') === '为什么要用树', 'should keep only the first line');
  assert(T.cleanCardTitle('   ') === '', 'empty input should stay empty');
  const long = T.cleanCardTitle('一'.repeat(60));
  assert(long.length === 24, 'long titles must be capped, got ' + long.length);
  const state = T.emptyState();
  const project = T.projectCreate(state, { title: 'Naming' });
  const card = T.cardCreate(state, { projectId: project.id, mode: 'root', prompt: 'root' });
  T.cardUpdate(state, { projectId: project.id, cardId: card.id, answer: 'x' });
  T.cardUpdate(state, { projectId: project.id, cardId: card.id, title: '回答决定的名字' });
  assert(card.title === '回答决定的名字', 'cardUpdate should store a title');
  return 'clean + persisted';
});

await checkAsync('revision', async () => {
  const state = T.emptyState();
  T.projectCreate(state, { title: 'Revision' });
  T.saveState(state);
  T.projectCreate(state, { title: 'Revision 2' });
  T.saveState(state);
  const loaded = T.loadState();
  assert(loaded.revision === 2, 'revision should count saves, got ' + loaded.revision);
  assert(loaded.projects.length === 2, 'reload should keep both projects');
  return 'revision ' + loaded.revision;
});

await checkAsync('zip export / import round-trip', async () => {
  const ctx = {
    get(name) {
      if (name !== 'attachments') return null;
      return {
        saveImage: async (input) => ({
          attachmentId: 'sha256:e1',
          mediaType: input.mediaType,
          bytes: input.data.length,
          width: 1,
          height: 1,
        }),
        admitEncodedFile: async (input) => ({ attachmentId: 'sha256:f1', name: input.name, bytes: 3 }),
        readImage: async () => {
          throw new Error('no stored image in this sandbox');
        },
        imageHostPath: () => undefined,
        fileHostPath: () => undefined,
        readFileStream: async function* () {
          yield new Uint8Array([0x7a, 0x69, 0x70]);
        },
      };
    },
  };
  const state = T.emptyState();
  const project = T.projectCreate(state, { title: '携带附件的树' });
  const root = T.cardCreate(state, { projectId: project.id, mode: 'root', prompt: 'root' });
  const child = T.cardCreate(state, { projectId: project.id, parentId: root.id, mode: 'child', prompt: 'child' });
  root.title = '手动名字';
  root.titleManual = true;
  root.attachments = await T.prepareAttachments(ctx, [
    { name: 'note.md', mime: 'text/markdown', dataB64: Buffer.from('# hello zip').toString('base64') },
    { name: 'blob.bin', mime: 'application/octet-stream', dataB64: Buffer.from('zip').toString('base64') },
  ]);

  const bundle = await T.buildExportZip(ctx, project);
  assert(bundle.zip.length > 100, 'zip should not be empty');
  const files = T.readZip(bundle.zip);
  assert(files.has('project.json'), 'project.json missing from the archive');
  const payload = JSON.parse(files.get('project.json').toString('utf8'));
  let attachmentEntries = 0;
  for (const entry of files.keys()) if (entry.startsWith('attachments/')) attachmentEntries += 1;
  assert(attachmentEntries === 2, 'both attachments should ride along, got ' + attachmentEntries);
  assert(payload.project.cards[0].title === '手动名字', 'manual title should survive');
  assert(payload.project.cards[0].titleManual === true, 'titleManual flag should survive');

  // Import the bundle back: attachments go through the admission paths again.
  const target = T.emptyState();
  await T.projectImportBundle(ctx, target, { dataB64: bundle.zip.toString('base64') });
  assert(target.projects.length === 1, 'import should add one project');
  const revived = target.projects[0];
  assert(revived.cards.length === 2, 'import should keep both cards');
  const revivedRoot = revived.cards.find((card) => card.id === root.id) || revived.cards[0];
  assert(revivedRoot.title === '手动名字' && revivedRoot.titleManual === true, 'manual title lost on import');
  assert(Array.isArray(revivedRoot.attachments) && revivedRoot.attachments.length === 2, 'attachments lost on import');
  assert(revivedRoot.attachments[0].kind === 'text' && revivedRoot.attachments[0].file, 'text attachment not re-spilled');
  assert(revivedRoot.attachments[1].kind === 'file' && revivedRoot.attachments[1].ref, 'file attachment not re-admitted');
  const blocks = T.attachmentBlocks(revivedRoot.attachments);
  assert(String(blocks[0].text).includes('hello zip'), 're-imported text should read back');
  return '2 attachments + title survived';
});

await checkAsync('backup list / restore', async () => {
  const state = T.emptyState();
  T.projectCreate(state, { title: 'Before backup' });
  T.saveState(state);
  // saveState throttles snapshots to one per 5 minutes, so force one now and
  // restore exactly that file — deterministic even inside a busy sandbox.
  T.forceBackup(T.stateFilePath());
  const list = T.listBackups();
  assert(Array.isArray(list) && list.length > 0, 'forceBackup should leave a snapshot');
  const mine = list[0];
  assert(mine.projects === 1, 'the snapshot should hold exactly one project');
  T.projectCreate(state, { title: 'After backup' });
  T.saveState(state);
  const controllers = new Map();
  T.restoreBackup(controllers, state, mine.file);
  const names = state.projects.map((project) => project.title);
  assert(
    names.includes('Before backup') && !names.includes('After backup'),
    'restore should rewind the state, got: ' + names.join(', '),
  );
  const current = T.listBackups()[0];
  assert(current.file !== mine.file, 'restore should safety-copy the replaced state first');
  return 'rewound to ' + mine.file;
});

await checkAsync('manual title beats auto title', async () => {
  const state = T.emptyState();
  const project = T.projectCreate(state, { title: 'Manual' });
  const card = T.cardCreate(state, { projectId: project.id, mode: 'root', prompt: 'root' });
  T.cardUpdate(state, { projectId: project.id, cardId: card.id, answer: 'some answer' });
  T.cardUpdate(state, { projectId: project.id, cardId: card.id, title: '  我自己起的名字  ' });
  assert(card.title === '我自己起的名字' && card.titleManual === true, 'manual rename should stick');
  T.cardUpdate(state, { projectId: project.id, cardId: card.id, title: '   ' });
  assert(card.title === '' && card.titleManual === false, 'clearing the title should hand naming back');
  const loaded = T.loadState();
  void loaded;
  return 'set / clear round-trip';
});

try {
  rmSync(sandboxHome, { recursive: true, force: true });
} catch (error) {
  void error;
}

/* -------------------------------------------------------------- summary */

console.log('\n' + (failures === 0 ? 'PASS' : 'FAIL') + ' — ' + (checks - failures) + '/' + checks + ' checks');
process.exit(failures === 0 ? 0 : 1);

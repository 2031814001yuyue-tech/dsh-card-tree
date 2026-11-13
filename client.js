/**
 * Client half of the Card Tree bundle.
 *
 * Renders a Explore-style card tree as a Conversation View: a project holds a
 * tree of cards, every card is one question and one answer, and a new card can
 * deepen the current one, diverge beside it, or branch from the same point with
 * the same question. All model work happens in the Host half; this module talks
 * to it over the private `/dsh-card-tree` routes.
 */
window.__ModuleLoader__.load({
  id: 'dsh-card-tree',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const API = '/dsh-card-tree';
    const VIEW_ID = 'card-tree';
    const PANEL_KEY = 'dsh-card-tree';
    const COMPOSER_ID = 'dsh-card-tree-composer';
    const COMPACT_BELOW = 720;

    /* ----------------------------------------------------------------- copy */

    const COPY = {
      zh: {
        newProject: '新项目',
        toolsLabel: '工具调用',
        toolsFailed: '失败',
        toolsRunning: '正在调用工具…',
        projectName: '项目名称',
        projectSystem: '项目背景',
        systemHint: '这段背景会加进每一次生成，用来告诉 AI 这个项目在谈什么。',
        deleteProject: '删除项目',
        emptyComposer: '问第一个问题，开一棵新树…',
        composerChild: '深入这张卡片',
        composerDiverge: '同层发散',
        composerBranch: '分支重答',
        modeChild: '深入',
        modeDiverge: '发散',
        modeBranch: '分支',
        modeFollow: '追问',
        modeIsolated: '独立',
        modeHintFollow: '不新建卡片，在这张卡片里接着问',
        modeHintIsolated: '新建一张不与其它卡片相连的卡片',
        needCard: '追问需要先选中一张卡片',
        noSelectionHint: '没有选中卡片：新问题会成为树根；选「独立」则是树外卡片',
        followTag: '追问',
        standaloneTag: '独立',
        followPlaceholder: '在这张卡片里接着问…',
        composerIsolated: '问一个独立的问题（不连到树里）',
        send: '发送',
        stop: '停止',
        thinking: '正在生成…',
        rerun: '重答',
        rerunHint: '用同样的上下文重新生成这张卡片的回答',
        branchAnswer: '分支重答',
        branchHint: '保留现在这版回答，从同一个问题另开一张同层卡片',
        remove: '删除',
        copy: '复制',
        copied: '已复制',
        rootCard: '新主题',
        noAnswer: '这张卡片还没有回答，点「重答」重新生成。',
        errorPrefix: '出错了：',
        retry: '重试',
        loading: '正在读取卡片树…',
        confirmDeleteCard: '删除这张卡片和它的所有子卡片？',
        confirmDeleteProject: '删除整个项目？',
        tree: '卡片树',
        card: '卡片',
        countCards: '张卡片',
        panelTitle: '对话树',
        treeMode: '对话树模式',
        openTree: '展开对话树',
        exitTree: '退出对话树',
        treeIdle: '这个会话已切换为对话树：在下面提问，答案会写进一棵卡片树。',
        treeEmpty: '还没有卡片。问第一个问题，开一棵新树。',
        askTree: '在这棵树上提问…',
        heroProject: '对话树',
        overview: '全览',
        overviewClose: '收起全览',
        overviewHint: '整棵树的结构图。悬停可预览内容，点击直接进入那张卡片；拖动节点摆放位置，拖 ↗ 改父级，拖 ⇢ 建立引用。',
        collapseBranch: '收起这条分支',
        expandBranch: '展开这条分支',
        resizeTree: '拖动调整列表宽度',
        switchProject: '切换项目',
        more: '更多',
        continueAsk: '接着问',
        modeHintChild: '以这张卡片为题继续深入',
        modeHintDiverge: '继承到这里为止的上下文，在同一层开新线',
        newTree: '新树',
        emptyStartTitle: '从第一个问题开始',
        emptyStartHint: '每个项目是一棵树。先建一个项目，再在下面输入第一个问题 —— 它会成为树根，之后每张卡片都能继续长。',
        emptyCardsHint: '这棵树还是空的。在下面输入第一个问题，它会成为树根。',
        selectHint: '从左侧选一张卡片，或直接在下面开一个新问题。',
        emptyTreeHint: '树里的卡片会出现在这里',
        modelLabel: '模型',
        modelDefault: '跟随 DSH 默认',
        modelLoading: '正在读取模型列表…',
        effortLabel: '思考程度',
        effortDefault: '模型默认',
        effortHint: '这个模型支持的推理强度',
        toggleTree: '收起 / 展开卡片列表',
        attachHint: '添加图片或文件',
        removeAttachment: '移除附件',
        dismiss: '知道了',
        composerModeGroup: '卡片生成方式',
        dragNode: '拖动可以摆放这张卡片',
        linkNode: '拖动这条线，连到另一张卡片下面',
        resetLayout: '自动排列',
        layoutReset: '已恢复自动排列',
        branchDeleted: '已删除',
        deleteSubtree: '删除这张卡片和它的子卡片',
        deleteConfirm: '确认删除',
        reparented: '已调整分支',
        reparentFailed: '无法连接：',
        connectTo: '连到另一张卡片',
        cancel: '取消',
        attachOnlyPrompt: '（请看我随附的图片或文件）',
        refsLabel: '引用',
        addRef: '引用卡片',
        removeRef: '取消引用',
        refTag: '被引用的卡片',
        refDirHint: '单向：只有这张卡片的上下文会带上被引用卡片的问答',
        refAdded: '已添加引用',
        refRemoved: '已取消引用',
        noOtherCards: '没有其它卡片可引用',
        refLine: '拖动这条虚线，连到要引用的卡片',
        streamLost: '连接中断了，已重新读取服务器上的最新内容。',
        partialTag: '生成中断',
        continueLabel: '继续',
        continuePrompt: '请接着上面中断的地方继续。',
        searchPlaceholder: '搜索卡片',
        exportLabel: '导出项目 JSON',
        importLabel: '导入项目 JSON',
        importFailed: '导入失败：',
        compatTitle: '运行环境不完整：',
        compatMissingSeats: '缺少界面座位',
        compatMissingServices: '缺少服务',
        compatHealthFailed: '读不到插件的健康检查（路由可能没挂上）。',
        compatHint: 'DSH 可能已经升级导致接口变化，这个插件需要更新。',
        compatJoin: '；',
        recheckLabel: '重新检查',
        undoLabel: '撤销',
        undoDone: '已恢复项目',
        contextLabel: '上下文',
        contextFolded: '已折叠',
      },
      en: {
        newProject: 'New project',
        toolsLabel: 'Tool calls',
        toolsFailed: 'failed',
        toolsRunning: 'Calling tools…',
        projectName: 'Project name',
        projectSystem: 'Project brief',
        systemHint: 'This brief is added to every generation so the model knows what the project is about.',
        deleteProject: 'Delete project',
        emptyComposer: 'Ask the first question…',
        composerChild: 'Deepen this card',
        composerDiverge: 'Diverge beside it',
        composerBranch: 'Re-branch the question',
        modeChild: 'Deepen',
        modeDiverge: 'Diverge',
        modeBranch: 'Branch',
        modeFollow: 'Follow up',
        modeIsolated: 'Standalone',
        modeHintFollow: 'Keep asking inside this card — no new node',
        modeHintIsolated: 'Create a card that is not connected to the tree',
        needCard: 'Select a card before following up',
        noSelectionHint: 'No card selected: your question becomes a new root — pick Standalone for an unlinked card',
        followTag: 'Follow-up',
        standaloneTag: 'Standalone',
        followPlaceholder: 'Ask a follow-up inside this card…',
        composerIsolated: 'Ask a standalone question (not linked to the tree)',
        send: 'Send',
        stop: 'Stop',
        thinking: 'Generating…',
        rerun: 'Retry',
        rerunHint: 'Regenerate this card with the same context',
        branchAnswer: 'Branch answer',
        branchHint: 'Keep this answer and open a sibling card from the same question',
        remove: 'Delete',
        copy: 'Copy',
        copied: 'Copied',
        rootCard: 'New topic',
        noAnswer: 'This card has no answer yet. Press Retry to generate it.',
        errorPrefix: 'Error: ',
        retry: 'Retry',
        loading: 'Loading the card tree…',
        confirmDeleteCard: 'Delete this card and every card under it?',
        confirmDeleteProject: 'Delete the whole project?',
        tree: 'Tree',
        card: 'Card',
        countCards: 'cards',
        panelTitle: 'Card Tree',
        treeMode: 'Card tree mode',
        openTree: 'Open the tree',
        exitTree: 'Leave tree mode',
        treeIdle: 'This session runs as a card tree: questions below grow a tree of cards.',
        treeEmpty: 'No cards yet. Ask the first question to root a new tree.',
        askTree: 'Ask on this tree…',
        heroProject: 'Card Tree',
        overview: 'Overview',
        overviewClose: 'Hide overview',
        overviewHint: 'Structure of the whole tree. Hover to preview, click to open that card; drag nodes to arrange them, drag ↗ to re-hang, drag ⇢ to reference.',
        collapseBranch: 'Collapse this branch',
        expandBranch: 'Expand this branch',
        resizeTree: 'Drag to resize the list',
        switchProject: 'Switch project',
        more: 'More',
        continueAsk: 'Ask next',
        modeHintChild: 'Go deeper, using this card as the topic',
        modeHintDiverge: 'Start a new line at the same level with the same context',
        newTree: 'New tree',
        emptyStartTitle: 'Start with a question',
        emptyStartHint: 'Each project is a tree. Create one, then type the first question below — it becomes the root, and every card can keep growing.',
        emptyCardsHint: 'This tree is empty. Type the first question below to plant its root.',
        selectHint: 'Pick a card on the left, or just ask a new question below.',
        emptyTreeHint: 'Cards in this tree will show up here',
        modelLabel: 'Model',
        modelDefault: 'Follow DSH default',
        modelLoading: 'Reading the model list…',
        effortLabel: 'Reasoning',
        effortDefault: 'Model default',
        effortHint: 'How hard this model should think',
        toggleTree: 'Collapse / expand the card list',
        attachHint: 'Attach images or files',
        removeAttachment: 'Remove attachment',
        dismiss: 'Got it',
        composerModeGroup: 'How this card is generated',
        dragNode: 'Drag to place this card',
        linkNode: 'Drag this line onto another card to hang it there',
        resetLayout: 'Auto arrange',
        layoutReset: 'Back to the automatic layout',
        branchDeleted: 'Deleted',
        deleteSubtree: 'Delete this card and its children',
        deleteConfirm: 'Delete',
        reparented: 'Branch changed',
        reparentFailed: 'Cannot connect: ',
        connectTo: 'Connect to another card',
        cancel: 'Cancel',
        attachOnlyPrompt: '(see the image or file I attached)',
        refsLabel: 'References',
        addRef: 'Reference a card',
        removeRef: 'Drop reference',
        refTag: 'Referenced card',
        refDirHint: 'One-way: only this card picks up the referenced card\u2019s Q&A',
        refAdded: 'Reference added',
        refRemoved: 'Reference removed',
        noOtherCards: 'No other card to reference',
        refLine: 'Drag this dashed line onto the card to reference',
        streamLost: 'The stream dropped; reloaded the latest state from the Host.',
        partialTag: 'Interrupted',
        continueLabel: 'Continue',
        continuePrompt: 'Please continue from where the answer was cut off.',
        searchPlaceholder: 'Search cards',
        exportLabel: 'Export project as JSON',
        importLabel: 'Import a project JSON',
        importFailed: 'Import failed: ',
        compatTitle: 'Incomplete runtime: ',
        compatMissingSeats: 'missing seats',
        compatMissingServices: 'missing services',
        compatHealthFailed: 'the plugin health check did not answer.',
        compatHint: 'DSH probably changed its internal API; this plugin needs an update.',
        compatJoin: '; ',
        recheckLabel: 'Re-check',
        undoLabel: 'Undo',
        undoDone: 'Project restored',
        contextLabel: 'Context',
        contextFolded: 'folded',
      },
    };

    function lang() {
      try {
        const tag =
          (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) ||
          (typeof navigator !== 'undefined' && navigator.language) ||
          'en';
        return String(tag).toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
      } catch (error) {
        return 'en';
      }
    }

    function t() {
      return COPY[lang()];
    }

    /* ------------------------------------------------------------------ api */

    async function call(route, body) {
      const init = body === undefined
        ? { method: 'GET' }
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
      const response = await fetch(API + route, init);
      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        throw new Error('卡片树服务返回了无法解析的响应（HTTP ' + response.status + '）');
      }
      if (!payload || payload.ok !== true) {
        throw new Error((payload && payload.error) || '卡片树服务出错（HTTP ' + response.status + '）');
      }
      return payload;
    }

    /* ---------------------------------------------------------------- store */

    const TREE_OPEN_KEY = 'dsh-card-tree.tree-open';

    function readTreeOpen() {
      try {
        const raw = window.localStorage.getItem(TREE_OPEN_KEY);
        return raw === null ? true : raw === '1';
      } catch (error) {
        return true;
      }
    }

    function writeTreeOpen(open) {
      try {
        window.localStorage.setItem(TREE_OPEN_KEY, open ? '1' : '0');
      } catch (error) {
        /* localStorage is optional */
      }
    }

    const TREE_WIDTH_KEY = 'dsh-card-tree.tree-width';
    const TREE_WIDTH_DEFAULT = 268;
    const TREE_WIDTH_MIN = 190;
    const TREE_WIDTH_MAX = 620;

    const MAX_ATTACHMENTS = 6;
    const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;

    function clampTreeWidth(value) {
      const width = Math.round(Number(value));
      if (!isFinite(width)) return TREE_WIDTH_DEFAULT;
      return Math.max(TREE_WIDTH_MIN, Math.min(TREE_WIDTH_MAX, width));
    }

    function readTreeWidth() {
      try {
        const raw = window.localStorage.getItem(TREE_WIDTH_KEY);
        return raw === null ? TREE_WIDTH_DEFAULT : clampTreeWidth(raw);
      } catch (error) {
        return TREE_WIDTH_DEFAULT;
      }
    }

    function writeTreeWidth(width) {
      try {
        window.localStorage.setItem(TREE_WIDTH_KEY, String(clampTreeWidth(width)));
      } catch (error) {
        /* localStorage is optional */
      }
    }

    const COLLAPSED_KEY = 'dsh-card-tree.collapsed';

    function readCollapsed() {
      try {
        const raw = window.localStorage.getItem(COLLAPSED_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const map = {};
        for (const key of Object.keys(parsed)) {
          if (parsed[key]) map[key] = true;
        }
        return map;
      } catch (error) {
        return {};
      }
    }

    function writeCollapsed(map) {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(map || {}));
      } catch (error) {
        /* localStorage is optional */
      }
    }

    const MODE_KEY = 'dsh-card-tree.mode';
    const MODES = ['child', 'follow', 'diverge', 'isolated'];

    /** The growth direction survives reloads: most people keep using the same one. */
    function readMode() {
      try {
        const raw = window.localStorage.getItem(MODE_KEY);
        return MODES.indexOf(raw) >= 0 ? raw : 'child';
      } catch (error) {
        return 'child';
      }
    }

    function writeMode(mode) {
      try {
        window.localStorage.setItem(MODE_KEY, MODES.indexOf(mode) >= 0 ? mode : 'child');
      } catch (error) {
        /* localStorage is optional */
      }
    }

    function createStore() {
      const listeners = new Set();
      let state = {
        phase: 'loading',
        error: null,
        data: { projects: [], activeProjectId: null, sessions: {} },
        model: null,
        selectedCardId: null,
        streaming: {},
        toolSteps: {},
        draft: '',
        mode: readMode(),
        attachments: [],
        notice: null,
        systemOpen: false,
        compact: false,
        compactPane: 'tree',
        composerFocusToken: 0,
        copiedCardId: null,
        overview: false,
        treeOpen: readTreeOpen(),
        treeWidth: readTreeWidth(),
        collapsed: readCollapsed(),
        models: { loading: false, providers: null, current: null },
        efforts: { loading: false, list: [], defaultEffort: null },
        runs: {},
        contexts: {},
        search: '',
        health: { status: 'idle', version: '', services: null, missing: [] },
        seatIssues: [],
      };

      let projectSaveTimer = null;
      let projectSaveFields = null;
      let streamFrame = 0;
      const streamPending = new Map();

      function emit() {
        for (const listener of Array.from(listeners)) {
          try {
            listener();
          } catch (error) {
            console.error('[card-tree] listener failed:', error);
          }
        }
      }

      function get() {
        return state;
      }

      function patch(next) {
        state = Object.assign({}, state, next);
        emit();
      }

      function applySnapshot(payload) {
        const data = payload.state || { projects: [], activeProjectId: null };
        const active = data.projects.find((project) => project.id === data.activeProjectId) || data.projects[0] || null;
        if (active && data.activeProjectId !== active.id) data.activeProjectId = active.id;
        const stillThere = active && active.cards.some((card) => card.id === state.selectedCardId);
        patch({
          phase: 'ready',
          data,
          model: payload.model || null,
          error: null,
          selectedCardId: stillThere ? state.selectedCardId : null,
        });
      }

      function activeProject() {
        const data = state.data;
        return data.projects.find((project) => project.id === data.activeProjectId) || data.projects[0] || null;
      }

      async function load() {
        try {
          applySnapshot(await call('/state'));
        } catch (error) {
          patch({ phase: 'error', error: String((error && error.message) || error) });
        }
      }

      async function run(operation) {
        try {
          applySnapshot(await operation());
        } catch (error) {
          patch({ error: String((error && error.message) || error) });
        }
      }

      async function newProject() {
        patch({ error: null });
        await run(() => call('/project', { op: 'create', title: t().newProject + ' ' + (state.data.projects.length + 1) }));
      }

      async function updateProject(patchFields) {
        const project = activeProject();
        if (!project) return;
        const optimistic = Object.assign({}, project, patchFields);
        const data = Object.assign({}, state.data, {
          projects: state.data.projects.map((entry) => (entry.id === project.id ? optimistic : entry)),
        });
        patch({ data });
        /* Typing in the title or the brief would otherwise write on every keystroke. */
        projectSaveTimer = setTimeout(() => {
          projectSaveTimer = null;
          const pending = projectSaveFields;
          projectSaveFields = null;
          if (!pending) return;
          call('/project', Object.assign({ op: 'update', projectId: project.id }, pending))
            .then(applySnapshot)
            .catch((error) => patch({ error: String((error && error.message) || error) }));
        }, 450);
        projectSaveFields = Object.assign({}, projectSaveFields, patchFields);
      }

      function flushProjectSave() {
        if (!projectSaveTimer) return;
        clearTimeout(projectSaveTimer);
        projectSaveTimer = null;
        const pending = projectSaveFields;
        projectSaveFields = null;
        const project = activeProject();
        if (!pending || !project) return;
        call('/project', Object.assign({ op: 'update', projectId: project.id }, pending))
          .then(applySnapshot)
          .catch((error) => patch({ error: String((error && error.message) || error) }));
      }

      async function importProject(raw) {
        patch({ error: null });
        try {
          applySnapshot(await call('/project', { op: 'import', project: raw }));
          patch({ notice: t().undoDone });
          return true;
        } catch (error) {
          patch({ error: t().importFailed + String((error && error.message) || error) });
          return false;
        }
      }

      async function restoreProject(project) {
        return importProject(project);
      }

      async function deleteProject() {
        const project = activeProject();
        if (!project) return;
        await run(() => call('/project', { op: 'delete', projectId: project.id }));
      }

      async function createCard(fields) {
        const project = activeProject();
        if (!project) return null;
        const payload = await call('/card', Object.assign({ op: 'create', projectId: project.id }, fields));
        applySnapshot(payload);
        const card = (payload.state.projects.find((entry) => entry.id === project.id) || { cards: [] });
        const created = card.cards[card.cards.length - 1];
        if (created) patch({ selectedCardId: created.id });
        return created || null;
      }

      /** Add a follow-up to an existing card; it does not create a new node. */
      async function createFollow(cardId, prompt) {
        const project = activeProject();
        if (!project) return null;
        const payload = await call('/card', { op: 'follow', projectId: project.id, cardId, prompt });
        applySnapshot(payload);
        const live = (payload.state.projects.find((entry) => entry.id === project.id) || { cards: [] }).cards.find(
          (card) => card.id === cardId,
        );
        const list = (live && live.followUps) || [];
        return list.length ? list[list.length - 1] : null;
      }

      async function deleteCard(cardId) {
        const project = activeProject();
        if (!project) return;
        const payload = await call('/card', { op: 'delete', projectId: project.id, cardId });
        applySnapshot(payload);
        if (state.selectedCardId === cardId) patch({ selectedCardId: null });
      }

      /** Persist one node's dragged position in the overview. */
      async function moveCard(cardId, point) {
        const project = activeProject();
        if (!project) return;
        const positions = {};
        positions[cardId] = { x: point.x, y: point.y };
        applySnapshot(await call('/card', { op: 'layout', projectId: project.id, positions }));
      }

      /** Re-hang a card (with its subtree) under another card; null = root. */
      async function reparentCard(cardId, parentId) {
        const project = activeProject();
        if (!project) return;
        const payload = await call('/card', { op: 'reparent', projectId: project.id, cardId, parentId });
        applySnapshot(payload);
      }

      async function resetLayout() {
        const project = activeProject();
        if (!project) return;
        applySnapshot(await call('/card', { op: 'layout', projectId: project.id, positions: 'reset' }));
      }

      /** Add (or drop) one dashed reference edge from a card to another one. */
      async function addRef(cardId, targetId, remove) {
        const project = activeProject();
        if (!project) return;
        applySnapshot(
          await call('/card', {
            op: 'ref',
            projectId: project.id,
            cardId,
            targetId,
            remove: Boolean(remove),
          }),
        );
      }

      function patchCard(cardId, fields, projectIdOverride) {
        const projectId = projectIdOverride || state.data.activeProjectId;
        const data = Object.assign({}, state.data, {
          projects: state.data.projects.map((project) =>
            project.id !== projectId
              ? project
              : Object.assign({}, project, {
                  cards: project.cards.map((card) => (card.id === cardId ? Object.assign({}, card, fields) : card)),
                }),
          ),
        });
        patch({ data });
      }

      async function send(cardId, projectIdOverride, attachments, followUpId) {
        const project = projectIdOverride
          ? state.data.projects.find((entry) => entry.id === projectIdOverride) || null
          : activeProject();
        if (!project) return;
        const streamKey = followUpId ? cardId + ':' + followUpId : cardId;
        const patchFollow = (fields) => {
          const live = (state.data.projects.find((entry) => entry.id === project.id) || project).cards.find(
            (card) => card.id === cardId,
          );
          if (!live) return;
          const followUps = (live.followUps || []).map((item) =>
            item.id === followUpId ? Object.assign({}, item, fields) : item,
          );
          patchCard(cardId, { followUps }, project.id);
        };
        const body = { projectId: project.id, cardId };
        if (followUpId) body.followUpId = followUpId;
        const boundSession = Object.keys(state.data.sessions || {}).find(
          (key) => state.data.sessions[key] === project.id,
        );
        if (boundSession) body.sessionId = boundSession;
        if (Array.isArray(attachments) && attachments.length > 0) {
          body.attachments = attachments.map((item) => ({ name: item.name, mime: item.mime, dataB64: item.dataB64 }));
        }
        if (followUpId) patchFollow({ status: 'running', answer: '', error: null, steps: [] });
        else patchCard(cardId, { status: 'running', answer: '', error: null, steps: [] }, project.id);
        const toolSteps = Object.assign({}, state.toolSteps);
        delete toolSteps[streamKey];
        patch({
          streaming: Object.assign({}, state.streaming, { [streamKey]: '' }),
          toolSteps,
          selectedCardId: cardId,
        });
        try {
          const response = await fetch(API + '/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!response.ok || !response.body) {
            let message = 'HTTP ' + response.status;
            try {
              const payload = await response.json();
              if (payload && payload.error) message = payload.error;
            } catch (error) {
              /* keep the status */
            }
            throw new Error(message);
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let finished = false;
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            let split = buffer.indexOf('\n\n');
            while (split >= 0) {
              const frame = buffer.slice(0, split);
              buffer = buffer.slice(split + 2);
              split = buffer.indexOf('\n\n');
              for (const line of frame.split('\n')) {
                if (line.indexOf('data:') !== 0) continue;
                let event = null;
                try {
                  event = JSON.parse(line.slice(5).trim());
                } catch (error) {
                  continue;
                }
                if (event.type === 'start') {
                  patch({
                    runs: Object.assign({}, state.runs, { [streamKey]: event.runId || null }),
                    contexts: Object.assign({}, state.contexts, {
                      [streamKey]: {
                        approxTokens: event.approxTokens || 0,
                        budget: event.budget || 0,
                        contextWindow: event.contextWindow || 0,
                        foldedCards: event.foldedCards || 0,
                        droppedCards: event.droppedCards || 0,
                        droppedRefs: event.droppedRefs || 0,
                      },
                    }),
                  });
                } else if (event.type === 'delta') {
                  /* Deltas carry the whole answer so far: paint at most once a frame. */
                  streamPending.set(streamKey, event.text || '');
                  if (!streamFrame) {
                    streamFrame = requestAnimationFrame(() => {
                      streamFrame = 0;
                      const next = Object.assign({}, state.streaming);
                      for (const [key, text] of streamPending) {
                        if (Object.prototype.hasOwnProperty.call(state.streaming, key)) next[key] = text;
                      }
                      streamPending.clear();
                      patch({ streaming: next });
                    });
                  }
                } else if (event.type === 'tool') {
                  const next = Object.assign({}, state.toolSteps);
                  if (event.phase === 'end') {
                    next[streamKey] = Array.isArray(event.steps) ? event.steps : [];
                  } else {
                    const calls = Array.isArray(event.calls) ? event.calls : [];
                    next[streamKey] = calls.map((call) => ({
                      name: call.name,
                      arguments: call.arguments,
                      ok: null,
                      preview: '',
                    }));
                  }
                  patch({ toolSteps: next });
                } else if (event.type === 'notice') {
                  patch({ notice: event.text || '' });
                } else if (event.type === 'done') {
                  finished = true;
                  const streaming = Object.assign({}, state.streaming);
                  delete streaming[streamKey];
                  const liveTools = Object.assign({}, state.toolSteps);
                  delete liveTools[streamKey];
                  patch({ streaming, toolSteps: liveTools });
                  const saved = event.card || {};
                  if (followUpId) {
                    const item = (saved.followUps || []).find((entry) => entry.id === followUpId) || {};
                    patchFollow({
                      status: 'done',
                      answer: item.answer || '',
                      steps: item.steps || [],
                      tools: item.tools || [],
                      error: null,
                    });
                  } else {
                    patchCard(
                      cardId,
                      {
                        status: 'done',
                        answer: saved.answer || '',
                        steps: saved.steps || [],
                        tools: saved.tools || [],
                        error: null,
                      },
                      project.id,
                    );
                  }
                } else if (event.type === 'aborted') {
                  finished = true;
                  const streaming = Object.assign({}, state.streaming);
                  delete streaming[streamKey];
                  const liveTools = Object.assign({}, state.toolSteps);
                  delete liveTools[streamKey];
                  patch({ streaming, toolSteps: liveTools });
                  const keptAnswer = event.answer || '';
                  const keptStatus = event.status || (keptAnswer ? 'partial' : 'idle');
                  if (followUpId) patchFollow({ status: keptStatus, answer: keptAnswer, error: null });
                  else patchCard(cardId, { status: keptStatus, answer: keptAnswer, error: null }, project.id);
                } else if (event.type === 'error') {
                  finished = true;
                  const streaming = Object.assign({}, state.streaming);
                  delete streaming[streamKey];
                  const liveTools = Object.assign({}, state.toolSteps);
                  delete liveTools[streamKey];
                  patch({ streaming, toolSteps: liveTools });
                  if (followUpId) patchFollow({ status: 'error', error: event.error || '生成失败' });
                  else patchCard(cardId, { status: 'error', error: event.error || '生成失败' }, project.id);
                }
              }
            }
          }
          if (!finished) {
            const streaming = Object.assign({}, state.streaming);
            delete streaming[streamKey];
            const liveTools = Object.assign({}, state.toolSteps);
            delete liveTools[streamKey];
            patch({ streaming, toolSteps: liveTools, notice: t().streamLost });
            /* The stream died mid-flight: re-sync with what the Host actually saved. */
            load().catch(() => {});
          }
        } catch (error) {
          const streaming = Object.assign({}, state.streaming);
          delete streaming[streamKey];
          const liveTools = Object.assign({}, state.toolSteps);
          delete liveTools[streamKey];
          patch({ streaming, toolSteps: liveTools });
          if (followUpId) patchFollow({ status: 'error', error: String((error && error.message) || error) });
          else patchCard(cardId, { status: 'error', error: String((error && error.message) || error) }, project.id);
        }
      }

      async function stop(cardId, followUpId) {
        const project = activeProject();
        if (!project) return;
        const streamKey = followUpId ? cardId + ':' + followUpId : cardId;
        const body = { projectId: project.id, cardId };
        if (followUpId) body.followUpId = followUpId;
        const runId = state.runs[streamKey];
        if (runId) body.runId = runId;
        try {
          await call('/stop', body);
        } catch (error) {
          /* the stream closes on its own */
        }
      }

      async function submit(prompt, modeOverride) {
        const pendingAttachments = state.attachments.slice();
        const typed = String(prompt || '').trim();
        if (!typed && pendingAttachments.length === 0) return;
        const text = typed || t().attachOnlyPrompt;
        const project = activeProject();
        if (!project) return;
        const selected = project.cards.find((card) => card.id === state.selectedCardId) || null;
        const mode = modeOverride || (selected || state.mode === 'isolated' ? state.mode : 'root');
        const pending = pendingAttachments;
        if (mode === 'follow' && !selected) {
          patch({ error: t().needCard });
          return;
        }
        patch({ draft: '', error: null, attachments: [], composerFocusToken: state.composerFocusToken + 1 });
        try {
          if (mode === 'follow') {
            const followUp = await createFollow(selected.id, text);
            if (followUp) await send(selected.id, null, pending, followUp.id);
            return;
          }
          let parentId = null;
          if (selected && mode !== 'isolated') {
            if (mode === 'diverge' || mode === 'branch') parentId = selected.parentId || null;
            else parentId = selected.id;
          }
          const cardMode = mode === 'isolated' ? 'isolated' : mode;
          const card = await createCard({ parentId, mode: cardMode, prompt: text });
          if (card) await send(card.id, null, pending);
        } catch (error) {
          /* Giving the text back is more useful than leaving an empty composer. */
          patch({
            draft: typed === t().attachOnlyPrompt ? '' : (state.draft || text),
            attachments: pending,
            error: String((error && error.message) || error),
            composerFocusToken: state.composerFocusToken + 1,
          });
        }
      }

      async function rebranch(card) {
        if (!card) return;
        patch({ draft: '', error: null });
        try {
          const created = await createCard({ parentId: card.parentId || null, mode: 'branch', prompt: card.prompt });
          if (created) await send(created.id);
        } catch (error) {
          patch({ error: String((error && error.message) || error) });
        }
      }

      async function rerun(card) {
        if (!card) return;
        const project = activeProject();
        if (!project) return;
        try {
          await call('/card', { op: 'update', projectId: project.id, cardId: card.id, answer: '', status: 'idle', error: null });
          patchCard(card.id, { answer: '', status: 'idle', error: null });
          await send(card.id);
        } catch (error) {
          patch({ error: String((error && error.message) || error) });
        }
      }

      async function removeCard(card) {
        if (!card) return;
        try {
          await deleteCard(card.id);
        } catch (error) {
          patch({ error: String((error && error.message) || error) });
        }
      }

      async function copyCard(card, body) {
        try {
          await navigator.clipboard.writeText(body);
          patch({ copiedCardId: card.id });
          window.setTimeout(() => {
            if (state.copiedCardId === card.id) patch({ copiedCardId: null });
          }, 1500);
        } catch (error) {
          /* clipboard refused */
        }
      }

      /* ------------------------------------------- session <-> tree binding */

      let loading = false;

      /** Load once, from any component that needs the binding table. */
      function ensureLoaded() {
        if (state.phase !== 'loading' || loading) return;
        loading = true;
        load().finally(() => {
          loading = false;
        });
      }

      function sessions() {
        return state.data && state.data.sessions ? state.data.sessions : {};
      }

      function projectForSession(sessionId) {
        if (!sessionId) return null;
        const projectId = sessions()[sessionId];
        if (!projectId) return null;
        return state.data.projects.find((project) => project.id === projectId) || null;
      }

      function hasSession(sessionId) {
        return Boolean(sessionId && sessions()[sessionId]);
      }

      function selectProject(projectId) {
        if (!projectId) return;
        patch({
          data: Object.assign({}, state.data, { activeProjectId: projectId }),
          selectedCardId: null,
        });
      }

      async function bindSession(sessionId, title) {
        if (!sessionId) return null;
        const payload = await call('/session', { op: 'bind', sessionId, title });
        applySnapshot(payload);
        return (payload.result && payload.result.projectId) || null;
      }

      async function unbindSession(sessionId) {
        if (!sessionId) return;
        applySnapshot(await call('/session', { op: 'unbind', sessionId }));
      }

      /** Create a root card inside one tree and stream its answer. */
      async function askIn(projectId, prompt) {
        const text = String(prompt || '').trim();
        if (!text || !projectId) return null;
        const payload = await call('/card', { op: 'create', projectId, parentId: null, mode: 'root', prompt: text });
        applySnapshot(payload);
        const project = payload.state.projects.find((entry) => entry.id === projectId) || null;
        const card = project && project.cards.length > 0 ? project.cards[project.cards.length - 1] : null;
        if (card) await send(card.id, projectId);
        return card;
      }

      /* ------------------------------------------------------------- models */

      /** Provider/model catalog, loaded once and refreshed after a change. */
      async function loadModels(force) {
        if (!force && state.models.providers) return state.models.providers;
        if (!force && state.models.loading) return null;
        patch({ models: Object.assign({}, state.models, { loading: true }) });
        try {
          const project = activeProject();
          const payload = await call('/models' + (project ? '?projectId=' + encodeURIComponent(project.id) : ''));
          patch({ models: { loading: false, providers: payload.providers || [], current: payload.current || null } });
          return payload.providers || [];
        } catch (error) {
          patch({ models: Object.assign({}, state.models, { loading: false }) });
          throw error;
        }
      }

      /* ------------------------------------------------------------- compat */

      /** Ask the Host half which services are actually mounted (and its version). */
      async function loadHealth() {
        try {
          const response = await fetch(API + '/health');
          if (!response.ok) throw new Error('HTTP ' + response.status);
          const payload = await response.json();
          const health = payload && payload.health ? payload.health : null;
          if (!health) throw new Error('empty health payload');
          patch({
            health: {
              status: 'ok',
              version: String(health.version || ''),
              services: health.services || null,
              missing: Array.isArray(health.missing) ? health.missing : [],
            },
          });
          return payload.health;
        } catch (error) {
          patch({
            health: {
              status: 'error',
              version: '',
              services: null,
              missing: [],
              error: String((error && error.message) || error),
            },
          });
          return null;
        }
      }

      /** Seat names whose slot was never declared (recorded by apply()). */
      function setSeatIssues(names) {
        patch({ seatIssues: Array.isArray(names) ? names.slice() : [] });
      }

      /** Pick the model new cards in this project use (falls back to the global pick). */
      async function setModel(choice) {
        const project = activeProject();
        const body = choice
          ? { op: 'set', provider: choice.provider, model: choice.model }
          : { op: 'reset' };
        if (project) body.projectId = project.id;
        const payload = await call('/model', body);
        patch({ models: Object.assign({}, state.models, { current: payload.model || null }) });
        applySnapshot(payload);
        loadEfforts(true).catch(() => {
          /* the picker falls back to "model default" */
        });
      }

      /** Reasoning levels of the current model, for the effort picker. */
      async function loadEfforts(force) {
        const current = state.models.current || state.model;
        const project = activeProject();
        if (!current) {
          patch({ efforts: { loading: false, list: [], defaultEffort: null } });
          return [];
        }
        if (!force && state.efforts.list.length) return state.efforts.list;
        patch({ efforts: Object.assign({}, state.efforts, { loading: true }) });
        try {
          const query =
            '?provider=' + encodeURIComponent(current.provider || '') +
            '&model=' + encodeURIComponent(current.model || '') +
            (project ? '&projectId=' + encodeURIComponent(project.id) : '');
          const payload = await call('/effort' + query);
          patch({
            efforts: {
              loading: false,
              list: Array.isArray(payload.efforts) ? payload.efforts : [],
              defaultEffort: payload.defaultEffort || null,
            },
          });
          return payload.efforts || [];
        } catch (error) {
          patch({ efforts: Object.assign({}, state.efforts, { loading: false }) });
          throw error;
        }
      }

      /** Pick how hard the model should think (one of its own reasoning levels). */
      async function setEffort(effortId) {
        const current = state.models.current || state.model;
        if (!current || !current.provider || !current.model) return;
        const body = {
          op: 'set',
          provider: current.provider,
          model: current.model,
          reasoningEffort: effortId || null,
        };
        const project = activeProject();
        if (project) body.projectId = project.id;
        const payload = await call('/model', body);
        patch({ models: Object.assign({}, state.models, { current: payload.model || null }) });
        applySnapshot(payload);
      }

      /* --------------------------------------------------------------- tree */

      function toggleCollapse(cardId) {
        if (!cardId) return;
        const next = Object.assign({}, state.collapsed);
        if (next[cardId]) delete next[cardId];
        else next[cardId] = true;
        patch({ collapsed: next });
        writeCollapsed(next);
      }

      function setTreeWidth(width) {
        patch({ treeWidth: clampTreeWidth(width) });
      }

      function commitTreeWidth() {
        writeTreeWidth(state.treeWidth);
      }

      function toggleTree() {
        const treeOpen = !state.treeOpen;
        writeTreeOpen(treeOpen);
        patch({ treeOpen });
      }

      /** Pick the growth direction for the next send (persisted across reloads). */
      function setMode(mode) {
        const next = MODES.indexOf(mode) >= 0 ? mode : 'child';
        writeMode(next);
        patch({ mode: next });
      }

      /* -------------------------------------------------------- attachments */

      /** Read a picked File into the shape `/send` expects. */
      function readFile(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('读取文件失败：' + (file && file.name)));
          reader.onload = () => {
            const result = String(reader.result || '');
            const comma = result.indexOf(',');
            resolve({
              id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
              name: (file && file.name) || 'file',
              mime: (file && file.type) || '',
              bytes: (file && file.size) || 0,
              dataB64: comma >= 0 ? result.slice(comma + 1) : result,
              preview: /^image\//.test((file && file.type) || '') ? result : null,
            });
          };
          reader.readAsDataURL(file);
        });
      }

      async function addFiles(fileList) {
        const files = Array.from(fileList || []);
        if (files.length === 0) return;
        const pending = state.attachments.slice();
        const errors = [];
        for (const file of files) {
          if (pending.length >= MAX_ATTACHMENTS) {
            errors.push('最多附加 ' + MAX_ATTACHMENTS + ' 个文件');
            break;
          }
          if (file.size > MAX_ATTACHMENT_BYTES) {
            errors.push('文件太大（单个上限 12 MB）：' + file.name);
            continue;
          }
          try {
            pending.push(await readFile(file));
          } catch (error) {
            errors.push(String((error && error.message) || error));
          }
        }
        patch({ attachments: pending, error: errors.length > 0 ? errors.join('；') : null });
      }

      function removeAttachment(id) {
        patch({ attachments: state.attachments.filter((item) => item.id !== id) });
      }

      function clearAttachments() {
        patch({ attachments: [] });
      }

      return {
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        get,
        patch,
        activeProject,
        load,
        ensureLoaded,
        newProject,
        updateProject,
        flushProjectSave,
        importProject,
        restoreProject,
        deleteProject,
        createCard,
        createFollow,
        deleteCard,
        moveCard,
        reparentCard,
        resetLayout,
        addRef,
        send,
        stop,
        submit,
        rebranch,
        rerun,
        removeCard,
        copyCard,
        sessions,
        hasSession,
        projectForSession,
        selectProject,
        bindSession,
        unbindSession,
        askIn,
        loadModels,
        setModel,
        loadHealth,
        setSeatIssues,
        loadEfforts,
        setEffort,
        setMode,
        toggleTree,
        toggleCollapse,
        setTreeWidth,
        commitTreeWidth,
        addFiles,
        removeAttachment,
        clearAttachments,
      };
    }

    const store = createStore();

    /** Optional client services captured from the plugin context. */
    const services = { layout: null, ctx: null };

    function layoutService() {
      if (!services.layout && services.ctx) {
        try {
          services.layout = services.ctx.get('layout') || null;
        } catch (error) {
          services.layout = null;
        }
      }
      return services.layout;
    }

    function goToPanel() {
      const layout = layoutService();
      if (!layout || typeof layout.selectPanel !== 'function') return;
      try {
        layout.selectPanel(PANEL_KEY);
      } catch (error) {
        console.error('[card-tree] could not select the card tree panel:', error);
      }
    }

    function goToConversation() {
      const layout = layoutService();
      if (!layout || typeof layout.selectPanel !== 'function') return;
      try {
        layout.selectPanel(null);
      } catch (error) {
        try {
          layout.selectPanel('conversation');
        } catch (inner) {
          console.error('[card-tree] could not return to the conversation:', inner);
        }
      }
    }

    /** Re-mount the Conversation so the composer chain re-runs its selectors. */
    function remountConversation() {
      const layout = layoutService();
      if (!layout || typeof layout.selectPanel !== 'function') return;
      try {
        layout.selectPanel(PANEL_KEY);
      } catch (error) {
        goToConversation();
        return;
      }
      window.requestAnimationFrame(() => {
        try {
          layout.selectPanel(null);
        } catch (inner) {
          console.error('[card-tree] could not return to the conversation:', inner);
        }
      });
    }

    function useStore() {
      return React.useSyncExternalStore(store.subscribe, store.get, store.get);
    }

    /* ---------------------------------------------------------------- style */

    const CSS = `
.ct-root{display:flex;flex-direction:column;height:100%;width:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit);font-size:13px;line-height:1.55}
/* ---------- header ---------- */
.ct-top{display:flex;align-items:center;gap:8px;padding:0 12px;height:46px;flex:0 0 auto;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}
.ct-top-brand{display:flex;align-items:center;color:var(--dsw-alias-brand-primary);flex:0 0 auto;opacity:.9}
.ct-top-title{appearance:none;box-sizing:border-box;min-width:80px;max-width:300px;flex:0 1 auto;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13.5px;font-weight:600;border-radius:8px;padding:4px 8px;text-overflow:ellipsis}
.ct-top-title:hover{background:var(--dsw-alias-bg-layer-1)}
.ct-top-title:focus{outline:none;border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1)}
.ct-top-title--static{color:var(--dsw-alias-label-secondary);font-weight:500}
.ct-top-sep{width:1px;height:18px;background:var(--dsw-alias-border-l1);flex:0 0 auto;margin:0 2px}
.ct-top-actions{display:flex;align-items:center;gap:4px;margin-left:auto;flex:0 0 auto}
.ct-compat{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;flex:0 0 auto;border-bottom:1px solid var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.6}
.ct-compat-icon{color:var(--dsw-alias-state-warn-primary);flex:0 0 auto}
.ct-compat-body{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;white-space:normal}
.ct-compat-hint{color:var(--dsw-alias-label-secondary);font-size:11px}
.ct-compat .ct-btn{flex:0 0 auto}
.ct-top-meta{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:11.5px;white-space:nowrap;margin:0 4px}
.ct-top-meta b{font-weight:600;color:var(--dsw-alias-label-primary)}
/* ---------- controls ---------- */
.ct-btn{appearance:none;display:inline-flex;align-items:center;gap:5px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;border-radius:8px;padding:5px 9px;cursor:pointer;white-space:nowrap;transition:background .12s ease,color .12s ease,border-color .12s ease}
.ct-btn:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.ct-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.ct-btn:disabled{opacity:.45;cursor:default;background:transparent}
.ct-btn[data-active="1"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ct-btn--primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:500}
.ct-btn--on{color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}
.ct-btn--primary:hover{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);filter:brightness(1.07)}
.ct-btn--sm{padding:4px 9px;font-size:11.5px;border-radius:7px}
.ct-btn--danger:hover{color:var(--dsw-alias-state-error-primary)}
.ct-iconbtn{appearance:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:15px;line-height:1;cursor:pointer;flex:0 0 auto}
.ct-iconbtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ct-iconbtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.ct-iconbtn--danger:hover{color:var(--dsw-alias-state-error-primary)}
.ct-spacer{flex:1 1 auto}
/* ---------- menu ---------- */
.ct-menu{position:relative;display:inline-flex}
.ct-menu-backdrop{position:fixed;inset:0;z-index:59}
.ct-menu-pop{position:absolute;right:0;top:calc(100% + 6px);z-index:41;min-width:168px;max-width:280px;padding:5px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);box-sizing:border-box;max-height:320px;overflow:auto}
.ct-menu-pop--float{position:fixed;top:auto;right:auto;z-index:60;max-width:min(300px,calc(100vw - 16px));box-shadow:0 10px 30px rgba(0,0,0,.28)}
.ct-menu-item{appearance:none;display:flex;align-items:center;gap:6px;width:100%;text-align:left;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;border-radius:7px;padding:6px 9px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ct-menu-item:hover{background:var(--dsw-alias-bg-layer-2)}
.ct-menu-item--checked{color:var(--dsw-alias-brand-primary)}
.ct-menu-check{flex:0 0 10px;color:var(--dsw-alias-brand-primary);font-size:11px;line-height:1}
.ct-menu-label{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ct-menu-body{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;white-space:normal}
.ct-menu-body .ct-menu-label{flex:0 0 auto}
.ct-menu-desc{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.5;white-space:normal;overflow-wrap:anywhere}
.ct-mode-btn{white-space:nowrap;gap:5px}
.ct-menu-item:has(.ct-menu-desc){white-space:normal;align-items:flex-start}
.ct-menu-item:has(.ct-menu-desc) .ct-menu-check{padding-top:2px}
.ct-menu-head{padding:7px 9px 3px;color:var(--dsw-alias-label-secondary);font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ct-menu-item--danger{color:var(--dsw-alias-state-error-primary)}
.ct-menu-item--danger:hover{background:var(--dsw-alias-bg-layer-2)}
.ct-menu-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l1)}
/* ---------- body ---------- */
.ct-body{display:flex;flex:1 1 auto;min-height:0;position:relative}
.ct-body--overview>.ct-tree,.ct-body--overview>.ct-main,.ct-body--overview>.ct-resizer{display:none}
.ct-tree{flex:0 0 auto;width:268px;max-width:46%;overflow:auto;border-right:1px solid var(--dsw-alias-border-l1);padding:8px 8px 32px;box-sizing:border-box;background:var(--dsw-alias-bg-base)}
.ct-resizer{flex:0 0 7px;margin:0 -4px 0 -3px;cursor:col-resize;position:relative;z-index:6}
.ct-resizer::after{content:'';position:absolute;left:2px;top:0;bottom:0;width:2px;background:transparent;border-radius:2px;transition:background .12s}
.ct-resizer:hover::after,.ct-resizer:active::after{background:var(--dsw-alias-brand-primary);opacity:.55}
.ct-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;min-height:0}
.ct-read{flex:1 1 auto;min-height:0;overflow:auto}
.ct-read-inner{max-width:780px;margin:0 auto;padding:22px 28px 8px;box-sizing:border-box}
/* ---------- tree ---------- */
.ct-row{display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:8px;cursor:pointer;position:relative;min-height:30px;box-sizing:border-box}
.ct-row:hover{background:var(--dsw-alias-bg-layer-1)}
.ct-row--active{background:var(--dsw-alias-bg-layer-2)}
.ct-row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.ct-dot{flex:0 0 auto;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);opacity:.5}
.ct-dot[data-status="running"]{background:var(--dsw-alias-state-warn-primary);opacity:1;animation:ct-pulse 1s ease-in-out infinite}
.ct-dot[data-status="error"]{background:var(--dsw-alias-state-error-primary);opacity:1}
.ct-dot[data-status="done"]{background:var(--dsw-alias-state-success-primary);opacity:.95}
@keyframes ct-pulse{0%,100%{opacity:.35}50%{opacity:1}}
.ct-row-text{min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:12.5px}
.ct-row--active .ct-row-text{font-weight:500}
.ct-row-count{flex:0 0 auto;color:var(--dsw-alias-label-secondary);font-size:10.5px;opacity:.85}
.ct-row-tag{flex:0 0 auto;border-radius:999px;padding:0 6px;font-size:10px;line-height:16px;color:var(--dsw-alias-label-secondary);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l1);white-space:nowrap}
.ct-row-caret{appearance:none;display:flex;align-items:center;justify-content:center;width:13px;height:13px;flex:0 0 auto;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:4px}
.ct-row-caret:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1)}
.ct-row-caret svg{transition:transform .12s ease}
.ct-row-caret[data-folded="1"] svg{transform:rotate(-90deg)}
.ct-row-gap{width:13px;height:13px;flex:0 0 auto}
.ct-tree-empty{padding:16px 10px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.7;text-align:center}
/* ---------- read pane ---------- */
.ct-meta{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:11.5px;flex-wrap:wrap}
.ct-chip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:1px 8px;font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1)}
.ct-chip--brand{background:transparent;box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.ct-question{margin:12px 0 0;padding:11px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-1);white-space:pre-wrap;color:var(--dsw-alias-label-primary);font-size:13.5px;font-weight:500;line-height:1.6}
.ct-answer{margin:16px 0 0;word-break:break-word;color:var(--dsw-alias-label-primary);font-size:13.5px;line-height:1.72}
.ct-answer--muted{color:var(--dsw-alias-label-secondary);font-style:italic;font-size:13px}
.ct-caret{display:inline-block;width:6px;height:13px;background:var(--dsw-alias-brand-primary);vertical-align:-2px;margin-left:3px;animation:ct-blink 1s steps(2) infinite}
@keyframes ct-blink{0%,100%{opacity:1}50%{opacity:0}}
.ct-err{margin-top:14px;padding:9px 12px;border-radius:9px;background:var(--dsw-alias-bg-layer-1);box-shadow:inset 0 0 0 1px var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);font-size:12px;white-space:pre-wrap;line-height:1.6}
/* ---------- follow-ups inside a card ---------- */
.ct-follows{margin:18px 0 0;display:flex;flex-direction:column;gap:16px}
.ct-follow{border-left:2px solid var(--dsw-alias-border-l2);padding:2px 0 2px 14px}
.ct-follow-head{display:flex;align-items:center;gap:8px}
.ct-follow-when{color:var(--dsw-alias-label-secondary);font-size:11px}
.ct-follow-q{margin:8px 0 0;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:1.6;white-space:pre-wrap}
.ct-chip--soft{background:transparent;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2)}
/* ---------- tool steps ---------- */
.ct-tools{margin:14px 0 0;border-radius:10px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.ct-tools-head{display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:transparent;border:0;cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:11.5px;font-family:var(--dsw-font-family);text-align:left}
.ct-tools-head:hover{background:var(--dsw-alias-bg-layer-2)}
.ct-tools-caret{color:var(--dsw-alias-label-secondary);font-size:10px;width:10px}
.ct-tools-title{color:var(--dsw-alias-label-primary);font-weight:600}
.ct-tools-bad{color:var(--dsw-alias-state-error-primary)}
.ct-tools-live{color:var(--dsw-alias-brand-primary)}
.ct-tools-body{border-top:1px solid var(--dsw-alias-border-l1);padding:4px 10px 8px}
.ct-tool{padding:7px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.ct-tool:last-child{border-bottom:0}
.ct-tool-row{display:flex;align-items:center;gap:7px;font-size:12px}
.ct-tool-mark{color:var(--dsw-alias-state-success-primary);font-weight:700;width:12px}
.ct-tool-name{font-family:ui-monospace,Consolas,monospace;color:var(--dsw-alias-label-primary);font-size:12px}
.ct-tool-args,.ct-tool-out{margin:5px 0 0;padding:7px 9px;border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font-size:11.5px;font-family:ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-all;max-height:180px;overflow:auto}
/* ---------- actions ---------- */
.ct-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:22px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l1)}
.ct-actions .ct-btn{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.ct-actions .ct-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.ct-actions .ct-btn--primary{border-color:transparent}
.ct-actions .ct-btn--danger{border-color:transparent;background:transparent}
.ct-actions .ct-btn--danger:hover{background:var(--dsw-alias-bg-layer-1)}
/* ---------- composer ---------- */
.ct-compose{flex:0 0 auto;padding:8px 16px 12px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}
.ct-compose-inner{max-width:780px;margin:0 auto;width:100%;box-sizing:border-box}
.ct-compose-box{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:8px 10px 8px;box-sizing:border-box}
.ct-compose-box:focus-within{border-color:var(--dsw-alias-brand-primary)}
.ct-compose-top{display:flex;align-items:center;gap:8px;margin-bottom:6px;min-height:22px}
.ct-seg{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);flex-wrap:wrap}
.ct-seg-btn{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;border-radius:7px;padding:3px 9px;cursor:pointer;white-space:nowrap}
.ct-seg-btn:hover{color:var(--dsw-alias-label-primary)}
.ct-seg-btn[data-on="1"]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-weight:500;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l1)}
.ct-seg-btn[data-off="1"]{opacity:.38;cursor:not-allowed}
.ct-seg-btn[data-off="1"]:hover{color:var(--dsw-alias-label-secondary)}
.ct-compose-hint{color:var(--dsw-alias-label-secondary);font-size:11.5px;margin-left:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ct-textarea{box-sizing:border-box;display:block;width:100%;min-height:32px;max-height:200px;resize:none;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;padding:2px;line-height:1.6}
.ct-textarea:focus{outline:none}
.ct-textarea::placeholder{color:var(--dsw-alias-label-secondary)}
.ct-compose-foot{display:flex;align-items:center;gap:8px;margin-top:4px}
.ct-compose-foot .ct-hint{margin:0;flex:1 1 auto}
.ct-actions-spacer{flex:1 1 auto}
.ct-file-input{display:none}
.ct-attach-row{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 2px}
.ct-attach{display:inline-flex;align-items:center;gap:6px;max-width:220px;padding:3px 5px 3px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-1);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1.3}
.ct-attach--static{padding-right:8px}
.ct-attach-img{width:22px;height:22px;border-radius:5px;object-fit:cover;flex:0 0 auto}
.ct-attach-ic{display:inline-flex;align-items:center;flex:0 0 auto}
.ct-attach-name{max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ct-attach-size{flex:0 0 auto;font-size:10.5px;opacity:.75}
.ct-attach-x{appearance:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1;cursor:pointer;flex:0 0 auto}
.ct-attach-x:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ct-attach-btn{flex:0 0 auto}
.ct-model-btn{appearance:none;display:inline-flex;align-items:center;gap:4px;max-width:190px;padding:3px 6px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer;flex:0 0 auto}
.ct-model-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ct-model-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px}
.ct-hint{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.5}
.ct-send{appearance:none;display:inline-flex;align-items:center;gap:5px;border:0;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font:inherit;font-size:12px;font-weight:500;border-radius:8px;padding:6px 12px;cursor:pointer;flex:0 0 auto}
.ct-send:hover{filter:brightness(1.07)}
.ct-send:disabled{opacity:.4;cursor:default;filter:none}
.ct-compose-tag{display:inline-flex;align-items:center;border-radius:999px;padding:1px 8px;font-size:11px;color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}
.ct-compose-note{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.5}
.ct-detail{display:block;min-height:0}
.ct-toast{display:flex;align-items:center;gap:10px;margin:8px 16px 0;padding:7px 11px;border-radius:9px;background:var(--dsw-alias-bg-layer-1);font-size:12px;color:var(--dsw-alias-label-primary)}
.ct-toast--error{box-shadow:inset 0 0 0 1px var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}
.ct-toast .ct-btn{margin-left:auto}
.ct-top-mark{display:flex;align-items:center;flex:0 0 auto;color:var(--dsw-alias-brand-primary);opacity:.9}
.ct-top-title--ghost{color:var(--dsw-alias-label-secondary);font-weight:500}
.ct-iconbtn--sm{width:24px;height:24px;font-size:13px;border-radius:7px}
.ct-iconbtn[data-on="1"]{color:var(--dsw-alias-label-primary)}
.ct-root--notree .ct-tree{display:none}
.ct-empty--quiet{justify-content:flex-start;padding-top:28px}
.ct-shot-text,.ct-shot-preview{font-size:12.5px;line-height:1.68;color:var(--dsw-alias-label-secondary);max-height:132px;overflow:auto;white-space:pre-wrap;word-break:break-word;box-sizing:border-box;padding:7px 10px;border-radius:8px;background:var(--dsw-alias-bg-base)}
.ct-shot-text--empty,.ct-shot-preview--empty{font-style:italic;opacity:.8}
/* ---------- empty ---------- */
.ct-empty{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:40px 24px;text-align:center;color:var(--dsw-alias-label-secondary);min-height:0}
.ct-empty-glyph{color:var(--dsw-alias-brand-primary);opacity:.55}
.ct-empty h3{margin:0;font-size:15px;color:var(--dsw-alias-label-primary);font-weight:600}
.ct-empty p{margin:0;max-width:400px;font-size:12.5px;line-height:1.75}
.ct-empty-actions{display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;justify-content:center}
/* ---------- project brief ---------- */
.ct-system{margin:0 0 12px;padding:12px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:7px}
.ct-system-label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}
.ct-system textarea{box-sizing:border-box;width:100%;min-height:62px;resize:vertical;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;padding:8px 10px;line-height:1.6}
.ct-system textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
/* ---------- compact ---------- */
.ct-root--compact .ct-tree{width:100%!important;max-width:none;border-right:none}
.ct-root--compact .ct-resizer{display:none}
.ct-root--compact.ct-hide-tree .ct-tree{display:none}
.ct-root--compact.ct-hide-main .ct-main{display:none}
.ct-root--compact .ct-read-inner{padding:16px 16px 8px}
.ct-root--compact .ct-compose{padding:8px 10px 10px}
@media (prefers-reduced-motion:reduce){.ct-caret{animation:none}.ct-dot[data-status="running"]{animation:none}}
/* ---------- sidebar icon / new-session option / inline composer ---------- */
.ct-icon-btn{appearance:none;display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:28px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.ct-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ct-icon-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.ct-icon-btn[data-active="1"]{color:var(--dsw-alias-brand-primary)}
.ct-hero{appearance:none;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;border-radius:8px;padding:4px 9px;cursor:pointer;white-space:nowrap}
.ct-hero:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.ct-hero[data-on="1"]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.ct-shot{box-sizing:border-box;display:flex;flex-direction:column;gap:7px;margin:0 0 2px;padding:10px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.ct-shot-head{display:flex;align-items:center;gap:7px;min-width:0;flex-wrap:wrap}
.ct-shot-chip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:1px 8px;font-size:11px;color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary);flex:0 0 auto}
.ct-shot-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);max-width:38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ct-shot-meta{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.ct-shot-actions{margin-left:auto;display:flex;gap:2px;align-items:center}
.ct-shot-preview{font-size:12px;line-height:1.65;color:var(--dsw-alias-label-secondary);max-height:120px;overflow:auto;white-space:pre-wrap;word-break:break-word;box-sizing:border-box;padding:6px 9px;border-radius:8px;background:var(--dsw-alias-bg-base)}
.ct-shot-preview--empty{font-style:italic;opacity:.8}
.ct-shot-row{display:flex;align-items:flex-end;gap:7px}
.ct-shot textarea{box-sizing:border-box;flex:1 1 auto;min-height:36px;max-height:120px;resize:none;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;padding:8px 10px;line-height:1.55}
.ct-shot textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.ct-shot-hint{font-size:11px;color:var(--dsw-alias-label-secondary)}
.ct-shot-error{font-size:11.5px;color:var(--dsw-alias-state-error-primary)}
/* ---------- markdown ---------- */
.ct-md{font-size:13.5px;line-height:1.75;color:var(--dsw-alias-label-primary);word-break:break-word;overflow-wrap:anywhere}
.ct-md p{margin:0 0 11px}
.ct-md p:last-child{margin-bottom:0}
.ct-md h3,.ct-md h4,.ct-md h5,.ct-md h6{margin:20px 0 8px;font-size:14px;line-height:1.5;font-weight:600}
.ct-md h3{font-size:15px}
.ct-md strong{font-weight:600}
.ct-md em{font-style:italic}
.ct-md del{opacity:.7}
.ct-md a{color:var(--dsw-alias-brand-primary);text-decoration:none}
.ct-md a:hover{text-decoration:underline}
.ct-md code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;padding:1px 5px;border-radius:5px;background:var(--dsw-alias-bg-layer-2)}
.ct-md pre{margin:12px 0;padding:11px 13px;border-radius:9px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);overflow:auto;max-height:420px}
.ct-md pre code{padding:0;background:none;font-size:12.5px;line-height:1.62;white-space:pre}
.ct-md ul,.ct-md ol{margin:0 0 11px;padding-left:22px}
.ct-md li{margin:4px 0}
.ct-md blockquote{margin:12px 0;padding:2px 0 2px 12px;border-left:2px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.ct-md hr{margin:16px 0;border:0;border-top:1px solid var(--dsw-alias-border-l1)}
.ct-md table{margin:12px 0;border-collapse:collapse;font-size:12.5px;display:block;overflow:auto;max-width:100%}
.ct-md th,.ct-md td{border:1px solid var(--dsw-alias-border-l1);padding:6px 10px;text-align:left;vertical-align:top}
.ct-md th{background:var(--dsw-alias-bg-layer-1);font-weight:600}
/* ---------- overview ---------- */
.ct-overview{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
.ct-overview-hint{padding:8px 16px;font-size:11.5px;color:var(--dsw-alias-label-secondary);border-bottom:1px solid var(--dsw-alias-border-l1);display:flex;align-items:center;gap:10px}
.ct-overview-tip{flex:1 1 auto;min-width:0}
.ct-overview-scroll{flex:1 1 auto;overflow:auto;min-height:0}
.ct-overview-canvas{position:relative;min-width:100%;min-height:100%}
.ct-overview-edges{position:absolute;left:0;top:0;pointer-events:none;color:var(--dsw-alias-border-l2)}
.ct-node{position:absolute;display:flex;flex-direction:column;gap:3px;text-align:left;padding:7px 10px;border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:grab;overflow:hidden;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l1);user-select:none;touch-action:none}
.ct-node:hover{background:var(--dsw-alias-bg-layer-2);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2)}
.ct-node--active{box-shadow:inset 0 0 0 1.5px var(--dsw-alias-brand-primary)}
.ct-node--running{box-shadow:inset 0 0 0 1.5px var(--dsw-alias-state-warn-primary)}
.ct-node--drag{cursor:grabbing;z-index:6;opacity:.92}
.ct-node-act{position:absolute;display:none;align-items:center;justify-content:center;width:18px;height:18px;padding:0;border:0;border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:1;cursor:pointer}
.ct-node:hover .ct-node-act{display:flex}
.ct-node-act:hover{background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary)}
.ct-node-link{right:20px;top:3px;cursor:crosshair}
.ct-node-ref{right:37px;top:3px;cursor:crosshair;font-size:12px}
.ct-refs{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:8px 0 2px}
.ct-refs-label{font-size:11px;color:var(--dsw-alias-label-secondary);flex:0 0 auto}
.ct-ref{display:inline-flex;align-items:center;gap:2px;max-width:280px;padding:1px 4px 1px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l1)}
.ct-ref-open{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;line-height:1.6;max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;padding:0}
.ct-ref-open:hover{color:var(--dsw-alias-brand-primary)}
.ct-ref-x{appearance:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1;cursor:pointer}
.ct-ref-x:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary)}
.ct-node-del{right:3px;top:3px}
.ct-node-del:hover{color:var(--dsw-alias-state-error-primary)}
.ct-row-del{flex:0 0 auto;display:none;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.ct-row:hover .ct-row-del{display:flex}
.ct-row-del:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary)}
.ct-modal-backdrop{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, var(--dsw-alias-bg-base) 55%, transparent)}
.ct-modal{width:min(380px,calc(100vw - 40px));padding:16px 18px;border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2),0 18px 48px rgba(0,0,0,.36);display:flex;flex-direction:column;gap:8px}
.ct-modal-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);margin:0}
.ct-modal-body{font-size:12.5px;line-height:1.55;color:var(--dsw-alias-label-primary);margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ct-modal-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin:0}
.ct-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}
.ct-btn--danger{color:var(--dsw-alias-state-error-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-state-error-primary)}
.ct-node-mode{font-size:10.5px;line-height:1.2;color:var(--dsw-alias-label-secondary)}
.ct-node-text{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.42;word-break:break-word}
.ct-tip{position:absolute;z-index:9;width:296px;max-width:calc(100% - 16px);padding:9px 11px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);box-shadow:0 12px 30px rgba(0,0,0,.32);pointer-events:none;display:flex;flex-direction:column;gap:3px}
.ct-tip-mode{font-size:10.5px;color:var(--dsw-alias-brand-primary)}
.ct-tip-q{font-size:12px;font-weight:600;line-height:1.45;color:var(--dsw-alias-label-primary);max-height:3.1em;overflow:hidden}
.ct-tip-a{font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);max-height:6.6em;overflow:hidden;white-space:pre-wrap;word-break:break-word}

/* ---------- visual direction: a quiet field notebook for growing ideas ---------- */
.ct-root{
  --ct-display:"Iowan Old Style","Noto Serif SC","Songti SC","SimSun",serif;
  --ct-ease:cubic-bezier(.2,.75,.25,1);
  background:var(--dsw-alias-bg-base);
  font-size:13px;
}
.ct-top{
  height:58px;
  gap:10px;
  padding:0 18px;
  background:color-mix(in srgb,var(--dsw-alias-bg-base) 92%,var(--dsw-alias-bg-layer-1));
  border-bottom-color:color-mix(in srgb,var(--dsw-alias-border-l1) 72%,transparent);
}
.ct-top-mark{
  width:30px;
  height:30px;
  justify-content:center;
  border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,transparent);
  border-radius:9px;
  background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-base));
  opacity:1;
}
.ct-top-title{font-family:var(--ct-display);font-size:15.5px;font-weight:600;letter-spacing:-.005em;padding:5px 7px;border-radius:7px}
.ct-top-meta{
  min-height:25px;
  padding:0 9px;
  border:1px solid var(--dsw-alias-border-l1);
  border-radius:999px;
  background:var(--dsw-alias-bg-base);
  font-size:10.5px;
  letter-spacing:.02em;
}
.ct-btn,.ct-iconbtn,.ct-seg-btn,.ct-send{transition:background .16s var(--ct-ease),color .16s var(--ct-ease),border-color .16s var(--ct-ease),box-shadow .16s var(--ct-ease),transform .16s var(--ct-ease)}
.ct-btn{border-radius:8px}
.ct-btn--primary,.ct-send{box-shadow:0 2px 8px color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent)}
.ct-btn--primary:hover,.ct-send:hover{transform:translateY(-1px);filter:none;box-shadow:0 4px 12px color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,transparent)}
.ct-btn:active,.ct-send:active{transform:translateY(0)}
.ct-iconbtn{border-radius:8px}
.ct-menu-pop{border-radius:12px;box-shadow:0 16px 40px color-mix(in srgb,var(--dsw-alias-label-primary) 16%,transparent)}
.ct-menu-item{padding:7px 9px}
.ct-tree{
  padding:0 10px 32px;
  background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-base));
  border-right-color:color-mix(in srgb,var(--dsw-alias-border-l1) 76%,transparent);
  scrollbar-width:thin;
  scrollbar-color:var(--dsw-alias-border-l2) transparent;
}
.ct-tree-head{
  position:sticky;
  top:0;
  z-index:3;
  display:flex;
  align-items:center;
  justify-content:space-between;
  min-height:50px;
  margin:0 -2px 6px;
  padding:0 10px;
  background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-base));
  border-bottom:1px solid var(--dsw-alias-border-l1);
  color:var(--dsw-alias-label-secondary);
  font-size:10.5px;
  font-weight:600;
  letter-spacing:.12em;
  text-transform:uppercase;
}
.ct-tree-count{
  min-width:21px;
  padding:1px 6px;
  border-radius:999px;
  background:var(--dsw-alias-bg-layer-1);
  color:var(--dsw-alias-label-secondary);
  font-size:10px;
  font-variant-numeric:tabular-nums;
  letter-spacing:0;
  text-align:center;
}
.ct-search{
  box-sizing:border-box;
  width:calc(100% - 12px);
  margin:0 6px 6px;
  padding:5px 9px;
  border:1px solid var(--dsw-alias-border-l1);
  border-radius:8px;
  background:var(--dsw-alias-bg-layer-1);
  color:var(--dsw-alias-label-primary);
  font:inherit;
  font-size:12px;
}
.ct-search::placeholder{color:var(--dsw-alias-label-secondary)}
.ct-search:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.ct-import-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.ct-partial{
  display:flex;
  align-items:center;
  gap:10px;
  margin-top:12px;
  padding:8px 11px;
  border-radius:9px;
  background:var(--dsw-alias-bg-layer-1);
  box-shadow:inset 0 0 0 1px var(--dsw-alias-state-warn-primary);
  color:var(--dsw-alias-state-warn-primary);
  font-size:12px;
}
.ct-chip--warn{background:transparent;box-shadow:inset 0 0 0 1px var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-state-warn-primary)}
.ct-row{min-height:38px;gap:8px;margin-bottom:2px;padding:7px 8px;border-radius:8px;transition:background .14s var(--ct-ease),box-shadow .14s var(--ct-ease)}
.ct-row::before{content:'';position:absolute;left:-6px;top:-3px;bottom:-3px;width:1px;background:color-mix(in srgb,var(--dsw-alias-border-l1) 58%,transparent);pointer-events:none}
.ct-row[style*="margin-left: 0px"]::before{display:none}
.ct-row:hover{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 76%,transparent)}
.ct-row--active{
  background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,var(--dsw-alias-bg-layer-1));
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,transparent);
}
.ct-row--active::after{content:'';position:absolute;left:0;top:11px;bottom:11px;width:2px;border-radius:2px;background:var(--dsw-alias-brand-primary)}
.ct-row-text{font-size:12.5px;line-height:1.45}
.ct-row--active .ct-row-text{font-weight:600}
.ct-dot{width:7px;height:7px;background:transparent;border:1.5px solid var(--dsw-alias-state-idle-primary);opacity:.65}
.ct-dot[data-status="done"]{background:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary);opacity:.75}
.ct-dot[data-status="running"],.ct-dot[data-status="error"]{border-color:currentColor}
.ct-row--active .ct-dot{box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)}
.ct-row-count{font-variant-numeric:tabular-nums}
.ct-row-follow{flex:0 0 auto;display:inline-flex;align-items:center;border-radius:999px;padding:0 5px;font-size:10px;line-height:16px;color:var(--dsw-alias-label-secondary);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,var(--dsw-alias-border-l1));font-variant-numeric:tabular-nums}
.ct-row-tag{border-radius:5px;background:var(--dsw-alias-bg-base);box-shadow:none}
.ct-row-del{width:22px;height:22px}
.ct-read{background:color-mix(in srgb,var(--dsw-alias-bg-base) 97%,var(--dsw-alias-bg-layer-1));scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2) transparent}
.ct-read-inner{max-width:860px;padding:38px 44px 28px}
.ct-detail{animation:ct-detail-in .28s var(--ct-ease)}
@keyframes ct-detail-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
.ct-meta{gap:10px;font-size:11px;letter-spacing:.015em}
.ct-chip{border-radius:6px;padding:2px 8px;background:transparent;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l1)}
.ct-chip--brand{border:0;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,transparent)}
.ct-question{
  margin:20px 0 0;
  padding:1px 0 22px 18px;
  border:0;
  border-left:2px solid var(--dsw-alias-brand-primary);
  border-radius:0;
  background:transparent;
  font-family:var(--ct-display);
  font-size:20px;
  font-weight:600;
  line-height:1.55;
  letter-spacing:-.012em;
  overflow-wrap:anywhere;
}
.ct-answer{margin:24px 0 0;font-size:14px;line-height:1.82}
.ct-md{font-size:14px;line-height:1.85}
.ct-md p{margin-bottom:14px}
.ct-md h3,.ct-md h4,.ct-md h5,.ct-md h6{margin:26px 0 10px;font-family:var(--ct-display);font-size:16px}
.ct-md h3{font-size:18px}
.ct-md blockquote{margin:18px 0;padding:4px 0 4px 16px;border-left-color:var(--dsw-alias-brand-primary)}
.ct-md pre{margin:16px 0;padding:14px 16px;border-radius:10px}
.ct-actions{margin-top:30px;padding-top:16px;gap:8px}
.ct-actions .ct-btn{border-color:transparent;background:transparent}
.ct-actions .ct-btn:hover{background:var(--dsw-alias-bg-layer-1)}
.ct-actions .ct-btn--primary{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,var(--dsw-alias-bg-base));color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,transparent)}
.ct-follows{gap:12px;margin-top:26px}
.ct-follow{padding:14px 16px;border:1px solid var(--dsw-alias-border-l1);border-left:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,var(--dsw-alias-border-l1));border-radius:0 10px 10px 0;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 55%,transparent)}
.ct-follow .ct-answer{font-size:13.5px}
.ct-follow-q{margin:10px 0 0;font-family:var(--ct-display);font-size:15px;font-weight:600;line-height:1.6;letter-spacing:-.008em}
.ct-tools{border:1px solid var(--dsw-alias-border-l1);background:transparent}
.ct-compose{padding:12px 20px 18px;border-top:0;background:linear-gradient(0deg,var(--dsw-alias-bg-base) 82%,transparent)}
.ct-compose-inner{max-width:820px}
.ct-compose-box{
  padding:10px 12px 9px;
  border-color:var(--dsw-alias-border-l1);
  border-radius:16px;
  background:var(--dsw-alias-bg-layer-1);
  box-shadow:0 10px 32px color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);
}
.ct-compose-box:focus-within{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 65%,var(--dsw-alias-border-l1));box-shadow:0 12px 36px color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent)}
.ct-compose-top{gap:10px;margin:0 0 7px;padding:0 0 8px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 72%,transparent)}
.ct-seg{gap:3px;padding:2px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 70%,transparent)}
.ct-seg-btn{padding:4px 10px;font-size:11px}
.ct-seg-btn[data-on="1"]{color:var(--dsw-alias-brand-primary);box-shadow:0 1px 3px color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
.ct-textarea{min-height:42px;padding:5px 4px;font-size:13.5px;line-height:1.65}
.ct-compose-foot{margin-top:5px}
.ct-send{padding:7px 13px;border-radius:9px}
.ct-send:disabled{transform:none;box-shadow:none}
.ct-model-btn{padding:5px 7px}
.ct-toast{margin:10px 18px 0;border:1px solid var(--dsw-alias-border-l1);border-radius:10px}
.ct-empty{gap:14px;padding:48px 28px}
.ct-empty-glyph{display:flex;align-items:center;justify-content:center;width:58px;height:58px;margin-bottom:4px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 25%,var(--dsw-alias-border-l1));border-radius:18px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,var(--dsw-alias-bg-base));opacity:1}
.ct-empty h3{font-family:var(--ct-display);font-size:24px;font-weight:600;letter-spacing:-.02em;text-wrap:balance}
.ct-empty p{max-width:440px;font-size:13px;line-height:1.85}
.ct-empty--quiet{padding-top:38px}
.ct-system{border:1px solid var(--dsw-alias-border-l1);border-radius:12px}
.ct-overview-hint{min-height:48px;padding:8px 20px;background:var(--dsw-alias-bg-base)}
.ct-overview-scroll{background-color:color-mix(in srgb,var(--dsw-alias-bg-base) 96%,var(--dsw-alias-bg-layer-1));background-image:radial-gradient(color-mix(in srgb,var(--dsw-alias-border-l2) 55%,transparent) .7px,transparent .7px);background-size:20px 20px}
.ct-node{box-sizing:border-box;gap:5px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-base);box-shadow:0 4px 14px color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
.ct-node:hover{background:var(--dsw-alias-bg-layer-1);box-shadow:0 7px 20px color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent)}
.ct-node--active{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.ct-node-mode{font-size:9.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.ct-node-text{font-size:12.5px;line-height:1.45}
.ct-node-act{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);box-shadow:0 3px 10px color-mix(in srgb,var(--dsw-alias-label-primary) 14%,transparent)}
.ct-node-act:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary)}
.ct-node-link{right:26px}
.ct-node-ref{right:48px}
.ct-node-del{right:4px}
.ct-node-del:hover{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,var(--dsw-alias-border-l1));color:var(--dsw-alias-state-error-primary)}
.ct-tip{border-radius:12px;box-shadow:0 16px 40px color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent)}
.ct-modal{border:1px solid var(--dsw-alias-border-l1);border-radius:16px;box-shadow:0 20px 60px color-mix(in srgb,var(--dsw-alias-label-primary) 24%,transparent)}
.ct-root ::selection{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,transparent)}
.ct-root--compact .ct-top{height:54px;padding:0 12px;gap:6px}
.ct-root--compact .ct-top-meta{display:none}
.ct-root--compact .ct-tree-head{min-height:46px}
.ct-root--compact .ct-read-inner{padding:26px 20px 20px}
.ct-root--compact .ct-question{font-size:18px;padding-left:14px}
.ct-root--compact .ct-compose{padding:10px 10px 12px}
.ct-root--compact .ct-compose-hint{display:none}
.ct-root--compact .ct-seg{max-width:100%;overflow-x:auto;flex-wrap:nowrap}
.ct-root--compact .ct-seg-btn{padding:4px 8px}
.ct-root--compact .ct-empty h3{font-size:21px}
@media (prefers-reduced-motion:reduce){.ct-detail{animation:none}.ct-btn--primary:hover,.ct-send:hover{transform:none}}
`;

    /* ----------------------------------------------------------- components */

    function GlyphTree(size) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
        ['M6 3.2h4v2.6H6z', 'M8 5.8v2.1', 'M4 7.9h8', 'M4 7.9v2.2', 'M2 10.1h4v2.6H2z', 'M12 7.9v2.2', 'M10 10.1h4v2.6h-4z'].map(
          (path, index) =>
            h('path', {
              key: 't' + index,
              d: path,
              stroke: 'currentColor',
              strokeWidth: 1.3,
              strokeLinejoin: 'round',
            }),
        ),
      );
    }

    function GlyphPanel(size) {
      return svg(['M2.6 3.4h10.8v9.2H2.6z', 'M6.6 3.4v9.2'], size);
    }

    function svg(paths, size) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
        paths.map((path, index) =>
          h('path', {
            key: 'p' + index,
            d: path,
            stroke: 'currentColor',
            strokeWidth: 1.35,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }),
        ),
      );
    }

    function GlyphChevron(size) {
      return svg(['M4 6.2 8 10l4-3.8'], size || 14);
    }

    function GlyphPlus(size) {
      return svg(['M8 3.6v8.8', 'M3.6 8h8.8'], size || 14);
    }

    function GlyphLayers(size) {
      return svg(['M8 2.8 2.9 5.6 8 8.4l5.1-2.8L8 2.8Z', 'M3 9.2 8 12l5-2.8'], size || 14);
    }

    function GlyphSliders(size) {
      return svg(['M3 5h10', 'M3 11h10', 'M6.4 3v4', 'M9.6 9v4'], size || 14);
    }

    function GlyphCopy(size) {
      return svg(['M6 6h6.2v6.2H6z', 'M4 10V3.8h6.2'], size || 14);
    }

    function GlyphTrash(size) {
      return svg(['M3.2 4.6h9.6', 'M6.4 4.6V3.2h3.2v1.4', 'M4.6 4.6l.6 8.2h5.6l.6-8.2'], size || 14);
    }

    function GlyphRefresh(size) {
      return svg(['M12.6 8a4.6 4.6 0 1 1-1.5-3.4', 'M12.9 2.8v3h-3'], size || 14);
    }

    function GlyphFile(size) {
      return svg(['M4.4 2.2h4l3.2 3.2v8.4H4.4z', 'M8.4 2.2v3.4h3.2'], size || 14);
    }

    function GlyphImage(size) {
      return svg(['M2.8 3.6h10.4v8.8H2.8z', 'M2.8 10.2 6.1 6.9l2.7 2.7 1.7-1.7 2.8 2.8'], size || 14);
    }

    function GlyphArrow(size) {
      return svg(['M3.2 8h9.2', 'M9.2 4.6 12.6 8l-3.4 3.4'], size || 14);
    }

    /** ↗ — matches the documented "drag ↗ to re-hang" gesture in the overview hint. */
    function GlyphDiagArrow(size) {
      return svg(['M4.6 11.4 11.4 4.6', 'M7 4.6h4.4v4.4'], size || 11);
    }

    function Menu(props) {
      const open = React.useState(false);
      const expanded = open[0];
      const spot = React.useState(null);
      const wrapRef = React.useRef(null);
      const items = Array.isArray(props.items) ? props.items : [];

      /** Anchor the popup to the trigger and flip it above when the room below is thin. */
      function show() {
        const node = wrapRef.current;
        if (node && typeof window !== 'undefined') {
          const rect = node.getBoundingClientRect();
          const below = window.innerHeight - rect.bottom - 12;
          const above = rect.top - 12;
          const up = below < 240 && above > below;
          const maxHeight = Math.max(160, Math.min(340, up ? above : below));
          spot[1]({
            right: Math.max(8, window.innerWidth - rect.right),
            top: up ? null : rect.bottom + 6,
            bottom: up ? window.innerHeight - rect.top + 6 : null,
            maxHeight,
          });
        } else {
          spot[1](null);
        }
        if (typeof props.onOpen === 'function') {
          try {
            props.onOpen();
          } catch (error) {
            void error;
          }
        }
        open[1](true);
      }

      return h(
        'div',
        { className: 'ct-menu', ref: wrapRef },
        h(
          'button',
          {
            type: 'button',
            className: props.className || 'ct-iconbtn',
            title: props.title,
            'aria-label': props.title,
            'aria-haspopup': 'menu',
            'aria-expanded': expanded ? 'true' : 'false',
            onClick: () => (expanded ? open[1](false) : show()),
          },
          props.glyph || '⋯',
        ),
        expanded
          ? h(
              React.Fragment,
              null,
              h('div', { className: 'ct-menu-backdrop', onClick: () => open[1](false) }),
              h(
                'div',
                {
                  className: 'ct-menu-pop ct-menu-pop--float',
                  role: 'menu',
                  style: spot[0]
                    ? {
                        right: spot[0].right + 'px',
                        top: spot[0].top === null ? 'auto' : spot[0].top + 'px',
                        bottom: spot[0].bottom === null ? 'auto' : spot[0].bottom + 'px',
                        maxHeight: spot[0].maxHeight + 'px',
                      }
                    : undefined,
                },
                items.map((item, index) => {
                  if (item.separator) return h('div', { className: 'ct-menu-sep', key: 'sep' + index });
                  if (item.heading) {
                    return h('div', { className: 'ct-menu-head', key: 'head' + index }, item.label);
                  }
                  return h(
                    'button',
                    {
                      key: 'item' + index,
                      type: 'button',
                      role: 'menuitem',
                      className: 'ct-menu-item' + (item.danger ? ' ct-menu-item--danger' : '') + (item.checked ? ' ct-menu-item--checked' : ''),
                      disabled: item.disabled,
                      onClick: () => {
                        open[1](false);
                        item.onClick();
                      },
                    },
                    h('span', { className: 'ct-menu-check' }, item.checked ? '✓' : ''),
                    h(
                      'span',
                      { className: 'ct-menu-body' },
                      h('span', { className: 'ct-menu-label' }, item.label),
                      item.description ? h('span', { className: 'ct-menu-desc' }, item.description) : null,
                    ),
                  );
                }),
              ),
            )
          : null,
      );
    }

    /** Model picker: uses the same llm providers/models the chat composer offers. */
    function ModelPicker(props) {
      const strings = t();
      const current = props.current || null;
      const live = current && current.source !== 'default' ? current : null;
      const models = props.models || { providers: null, loading: false };
      const items = [];
      if (!models.providers) {
        items.push({ heading: true, label: models.loading ? strings.loading : strings.modelLoading });
      } else {
        for (const provider of models.providers) {
          items.push({ heading: true, label: provider.name });
          for (const entry of provider.models) {
            items.push({
              label: entry.name,
              checked: Boolean(live && live.provider === provider.id && live.model === entry.id),
              onClick: () => props.onPick({ provider: provider.id, model: entry.id }),
            });
          }
        }
        items.push({ separator: true });
        items.push({
          label: strings.modelDefault,
          checked: !live,
          onClick: () => props.onPick(null),
        });
      }
      const label = live ? live.model : strings.modelDefault;
      return h(Menu, {
        className: 'ct-model-btn',
        title: strings.modelLabel,
        onOpen: () => {
          if (typeof props.onRefresh === 'function') props.onRefresh();
        },
        glyph: h(
          React.Fragment,
          null,
          h('span', { className: 'ct-model-name' }, label),
          GlyphChevron(12),
        ),
        items,
      });
    }


    function EffortPicker(props) {
      const strings = t();
      const current = props.current || null;
      const live = current && current.source !== 'default' ? current : null;
      const efforts = props.efforts || { loading: false, list: [], defaultEffort: null };
      // Following the DSH default, the reasoning level is DSH's own choice: stay out of the way.
      if (!live) return null;
      const list = Array.isArray(efforts.list) ? efforts.list : [];
      const active = live.reasoningEffort || efforts.defaultEffort || null;
      const name = (list.filter((entry) => entry.id === active)[0] || {}).name || strings.effortDefault;
      const items = list.map((entry) => ({
        label: entry.name || entry.id,
        checked: entry.id === active,
        onClick: () => props.onPick(entry.id),
      }));
      if (items.length === 0) {
        items.push({ heading: true, label: efforts.loading ? strings.loading : strings.effortHint });
      }
      return h(Menu, {
        className: 'ct-model-btn',
        title: strings.effortLabel,
        onOpen: () => {
          if (typeof props.onRefresh === 'function') props.onRefresh();
        },
        glyph: h(
          React.Fragment,
          null,
          h('span', { className: 'ct-model-name' }, strings.effortLabel + ' · ' + name),
          GlyphChevron(12),
        ),
        items,
      });
    }

    function titleOf(card) {
      const first = String(card.prompt || '').split('\n')[0].trim();
      if (!first) return t().rootCard;
      return first.length > 60 ? first.slice(0, 60) + '…' : first;
    }

    function when(iso) {
      try {
        const date = new Date(iso);
        if (isNaN(date.getTime())) return '';
        const pad = (value) => String(value).padStart(2, '0');
        return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
      } catch (error) {
        return '';
      }
    }

    function formatBytes(bytes) {
      const value = Number(bytes) || 0;
      if (value < 1024) return value + ' B';
      if (value < 1024 * 1024) return Math.round(value / 1024) + ' KB';
      return (value / 1024 / 1024).toFixed(1) + ' MB';
    }

    function modeLabel(mode) {
      const strings = t();
      if (mode === 'diverge') return strings.modeDiverge;
      if (mode === 'branch') return strings.modeBranch;
      if (mode === 'root') return strings.rootCard;
      if (mode === 'isolated') return strings.standaloneTag;
      return strings.modeChild;
    }

    function childrenOf(project) {
      const map = new Map();
      for (const card of project.cards) {
        const key = card.parentId || null;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(card);
      }
      return map;
    }

    function Row(props) {
      const card = props.card;
      const depth = props.depth;
      const active = props.active;
      const strings = t();
      const children = props.childCount || 0;
      const foldable = children > 0;
      const folded = Boolean(props.folded);
      const toggle = (event) => {
        event.stopPropagation();
        event.preventDefault();
        props.onToggle(card.id);
      };
      return h(
        'div',
        {
          className: 'ct-row' + (active ? ' ct-row--active' : ''),
          style: { marginLeft: depth * 13 + 'px' },
          onClick: () => props.onSelect(card),
          title: card.prompt,
          role: 'button',
          tabIndex: 0,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              props.onSelect(card);
            }
          },
        },
        foldable
          ? h(
              'button',
              {
                type: 'button',
                className: 'ct-row-caret',
                'data-folded': folded ? '1' : '0',
                title: folded ? strings.expandBranch : strings.collapseBranch,
                'aria-label': folded ? strings.expandBranch : strings.collapseBranch,
                'aria-expanded': folded ? 'false' : 'true',
                onClick: toggle,
                onKeyDown: (event) => {
                  if (event.key === 'Enter' || event.key === ' ') toggle(event);
                },
              },
              GlyphChevron(11),
            )
          : h('span', { className: 'ct-row-gap' }),
        h('span', { className: 'ct-dot', 'data-status': card.status || 'idle' }),
        h('span', { className: 'ct-row-text' }, titleOf(card)),
        card.mode === 'isolated' ? h('span', { className: 'ct-row-tag' }, strings.standaloneTag) : null,
        Array.isArray(card.followUps) && card.followUps.length > 0
          ? h('span', { className: 'ct-row-follow', title: strings.followTag }, '+' + card.followUps.length)
          : null,
        children > 1 ? h('span', { className: 'ct-row-count' }, children) : null,
        typeof props.onRequestDelete === 'function'
          ? h(
              'button',
              {
                type: 'button',
                className: 'ct-row-del',
                title: strings.deleteSubtree,
                'aria-label': strings.deleteSubtree,
                onClick: (event) => {
                  event.stopPropagation();
                  props.onRequestDelete(card);
                },
                onKeyDown: (event) => event.stopPropagation(),
              },
              GlyphTrash(12),
            )
          : null,
      );
    }

    function TreeRows(props) {
      const children = props.children;
      const folded = props.collapsed || {};
      const query = String(props.search || '').trim().toLowerCase();
      const rows = [];
      if (query) {
        /* A search shows the matches themselves instead of the tree shape. */
        const matches = [];
        const visit = (parentId) => {
          for (const card of children.get(parentId) || []) {
            const haystack = (String(card.prompt || '') + '\n' + String(card.answer || '')).toLowerCase();
            if (haystack.includes(query)) matches.push(card);
            visit(card.id);
          }
        };
        visit(null);
        for (const card of matches) {
          rows.push(
            h(Row, {
              key: card.id,
              card,
              depth: 0,
              childCount: 0,
              folded: true,
              active: card.id === props.selectedCardId,
              onSelect: props.onSelect,
              onToggle: props.onToggle,
              onRequestDelete: props.onRequestDelete,
            }),
          );
        }
        return rows;
      }
      const walk = (parentId, depth) => {
        const list = children.get(parentId) || [];
        for (const card of list) {
          const childCount = (children.get(card.id) || []).length;
          rows.push(
            h(Row, {
              key: card.id,
              card,
              depth,
              childCount,
              folded: Boolean(folded[card.id]),
              active: card.id === props.selectedCardId,
              onSelect: props.onSelect,
              onToggle: props.onToggle,
              onRequestDelete: props.onRequestDelete,
            }),
          );
          if (!folded[card.id]) walk(card.id, depth + 1);
        }
      };
      walk(null, 0);
      return rows;
    }

    /* ----------------------------------------------------------- markdown */

    function escapeHtml(text) {
      return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function inlineHtml(text) {
      const codes = [];
      let out = escapeHtml(text).replace(/`([^`]+)`/g, (match, code) => {
        codes.push('<code>' + code + '</code>');
        return '\u0000' + (codes.length - 1) + '\u0000';
      });
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
      out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
      out = out.replace(/(^|[\s（(])_([^_\n]+)_(?=$|[\s，。、）)])/g, '$1<em>$2</em>');
      out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
      out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
      out = out.replace(/\u0000(\d+)\u0000/g, (match, index) => codes[Number(index)] || '');
      return out;
    }

    function markdownHtml(src) {
      const lines = String(src == null ? '' : src).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
      const blocks = [];
      let index = 0;
      let paragraph = [];
      let list = null;

      const flushParagraph = () => {
        if (!paragraph.length) return;
        blocks.push('<p>' + paragraph.map(inlineHtml).join('<br>') + '</p>');
        paragraph = [];
      };
      const flushList = () => {
        if (!list) return;
        blocks.push(
          '<' + list.tag + '>' + list.items.map((item) => '<li>' + item + '</li>').join('') + '</' + list.tag + '>',
        );
        list = null;
      };
      const flushAll = () => {
        flushParagraph();
        flushList();
      };

      while (index < lines.length) {
        const line = lines[index];

        const fence = /^\s{0,3}(```|~~~)\s*([^`]*)$/.exec(line);
        if (fence) {
          flushAll();
          const marker = fence[1];
          const lang = (fence[2] || '').trim().split(/\s+/)[0] || '';
          const buffer = [];
          index += 1;
          while (index < lines.length && lines[index].trim().indexOf(marker) !== 0) {
            buffer.push(lines[index]);
            index += 1;
          }
          index += 1;
          blocks.push(
            '<pre' + (lang ? ' data-lang="' + escapeHtml(lang) + '"' : '') + '><code>' + escapeHtml(buffer.join('\n')) + '</code></pre>',
          );
          continue;
        }

        if (!line.trim()) {
          flushAll();
          index += 1;
          continue;
        }

        const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
        if (heading) {
          flushAll();
          const level = Math.min(heading[1].length + 2, 6);
          blocks.push('<h' + level + '>' + inlineHtml(heading[2]) + '</h' + level + '>');
          index += 1;
          continue;
        }

        if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
          flushAll();
          blocks.push('<hr>');
          index += 1;
          continue;
        }

        if (
          /^\s*\|/.test(line) &&
          index + 1 < lines.length &&
          /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[index + 1])
        ) {
          flushAll();
          const cells = (row) =>
            row
              .trim()
              .replace(/^\|/, '')
              .replace(/\|$/, '')
              .split('|')
              .map((cell) => cell.trim());
          const head = cells(line);
          index += 2;
          const rows = [];
          while (index < lines.length && /^\s*\|/.test(lines[index])) {
            rows.push(cells(lines[index]));
            index += 1;
          }
          blocks.push(
            '<table><thead><tr>' +
              head.map((cell) => '<th>' + inlineHtml(cell) + '</th>').join('') +
              '</tr></thead><tbody>' +
              rows
                .map((row) => '<tr>' + row.map((cell) => '<td>' + inlineHtml(cell) + '</td>').join('') + '</tr>')
                .join('') +
              '</tbody></table>',
          );
          continue;
        }

        if (/^\s{0,3}>/.test(line)) {
          flushAll();
          const buffer = [];
          while (index < lines.length && /^\s{0,3}>/.test(lines[index])) {
            buffer.push(lines[index].replace(/^\s{0,3}>\s?/, ''));
            index += 1;
          }
          blocks.push('<blockquote>' + markdownHtml(buffer.join('\n')) + '</blockquote>');
          continue;
        }

        const bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line);
        const ordered = /^(\s*)\d+[.)]\s+(.*)$/.exec(line);
        if (bullet || ordered) {
          flushParagraph();
          const tag = bullet ? 'ul' : 'ol';
          if (!list || list.tag !== tag) {
            flushList();
            list = { tag, items: [] };
          }
          let item = bullet ? bullet[2] : ordered[2];
          index += 1;
          while (
            index < lines.length &&
            /^\s{2,}\S/.test(lines[index]) &&
            !/^\s*([-*+]|\d+[.)])\s+/.test(lines[index])
          ) {
            item += ' ' + lines[index].trim();
            index += 1;
          }
          list.items.push(inlineHtml(item));
          continue;
        }

        paragraph.push(line.trim());
        index += 1;
      }

      flushAll();
      return blocks.join('');
    }

    function Markdown(props) {
      const html = React.useMemo(() => markdownHtml(props.text), [props.text]);
      return h('div', { className: 'ct-md', dangerouslySetInnerHTML: { __html: html } });
    }

    function plainText(src) {
      return String(src == null ? '' : src)
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/^\s*>\s?/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/(\*\*|__|~~|\*)/g, '')
        .replace(/\n{2,}/g, '\n')
        .trim();
    }

    /* ----------------------------------------------------------- tree overview */

    function Overview(props) {
      const strings = t();
      const cards = props.cards || [];
      const byParent = props.children || new Map();
      const hover = React.useState(null);
      const drag = React.useState(null);
      const link = React.useState(null);
      const canvasRef = React.useRef(null);
      const dragRef = React.useRef(null);
      const linkRef = React.useRef(null);

      const NODE_W = 220;
      const NODE_H = 78;
      const GAP_X = 82;
      const GAP_Y = 22;

      const depthOf = new Map();
      const order = [];
      const walk = (parentId, level) => {
        const list = byParent.get(parentId) || [];
        for (const card of list) {
          depthOf.set(card.id, level);
          order.push(card);
          walk(card.id, level + 1);
        }
      };
      walk(null, 0);
      for (const card of cards) {
        if (!depthOf.has(card.id)) {
          depthOf.set(card.id, 0);
          order.push(card);
        }
      }

      const pos = new Map();
      const rowsPerLevel = new Map();
      for (const card of order) {
        const level = depthOf.get(card.id) || 0;
        const used = rowsPerLevel.get(level) || 0;
        rowsPerLevel.set(level, used + 1);
        pos.set(card.id, { x: 24 + level * (NODE_W + GAP_X), y: 24 + used * (NODE_H + GAP_Y) });
      }
      for (const card of order) {
        if (card.pos && Number.isFinite(card.pos.x) && Number.isFinite(card.pos.y)) {
          pos.set(card.id, { x: card.pos.x, y: card.pos.y });
        }
      }
      const dragging = drag[0];
      if (dragging) pos.set(dragging.cardId, { x: dragging.x, y: dragging.y });

      let maxX = 0;
      let maxY = 0;
      for (const point of pos.values()) {
        maxX = Math.max(maxX, point.x + NODE_W);
        maxY = Math.max(maxY, point.y + NODE_H);
      }
      const width = Math.max(360, maxX + 48);
      const height = Math.max(220, maxY + 48);

      const edges = [];
      for (const card of order) {
        if (!card.parentId) continue;
        const from = pos.get(card.parentId);
        const to = pos.get(card.id);
        if (!from || !to) continue;
        const x1 = from.x + NODE_W;
        const y1 = from.y + NODE_H / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_H / 2;
        const mid = (x1 + x2) / 2;
        edges.push(
          h('path', {
            key: 'edge-' + card.id,
            d: 'M ' + x1 + ' ' + y1 + ' C ' + mid + ' ' + y1 + ', ' + mid + ' ' + y2 + ', ' + x2 + ' ' + y2,
            fill: 'none',
            stroke: 'var(--dsw-alias-border-l2)',
            'stroke-width': 1.5,
          }),
        );
      }

      /* Dashed reference edges: hover a card, grab its ⇢ handle or click an edge to drop it. */
      const refEdges = [];
      const refPairs = new Set();
      for (const card of order) {
        const list = Array.isArray(card.refs) ? card.refs : [];
        for (const refId of list) {
          const from = pos.get(card.id);
          const to = pos.get(refId);
          if (!from || !to) continue;
          // One line per pair: A -> B and B -> A are the same visual edge.
          const pair = card.id < refId ? card.id + '|' + refId : refId + '|' + card.id;
          if (refPairs.has(pair)) continue;
          refPairs.add(pair);
          const x1 = from.x + NODE_W - 10;
          const y1 = from.y + NODE_H;
          const x2 = to.x + NODE_W / 2;
          const y2 = to.y;
          const mid = (y1 + y2) / 2;
          refEdges.push(
            h(
              'path',
              {
                key: 'ref-' + card.id + '-' + refId,
                d: 'M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + mid + ', ' + x2 + ' ' + mid + ', ' + x2 + ' ' + y2,
                fill: 'none',
                stroke: 'var(--dsw-alias-brand-primary)',
                'stroke-width': 1.4,
                'stroke-dasharray': '6 5',
                'stroke-opacity': 0.72,
                style: { pointerEvents: 'stroke', cursor: 'pointer' },
                onClick: () => {
                  if (typeof props.onRemoveRef === 'function') props.onRemoveRef(card, refId);
                },
              },
              h('title', null, strings.removeRef),
            ),
          );
        }
      }

      const toCanvas = (event) => {
        const element = canvasRef.current;
        if (!element) return { x: 0, y: 0 };
        const rect = element.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
      };

      const startDrag = (event, card) => {
        if (event.button !== 0) return;
        if (event.target && event.target.closest && event.target.closest('.ct-node-act')) return;
        const point = toCanvas(event);
        const origin = pos.get(card.id) || { x: 0, y: 0 };
        dragRef.current = {
          cardId: card.id,
          startX: point.x,
          startY: point.y,
          originX: origin.x,
          originY: origin.y,
          x: origin.x,
          y: origin.y,
          moved: false,
        };
        drag[1](Object.assign({}, dragRef.current));
      };

      const startWiring = (event, card, kind) => {
        event.preventDefault();
        event.stopPropagation();
        const point = toCanvas(event);
        const origin = pos.get(card.id) || { x: 0, y: 0 };
        linkRef.current = {
          kind,
          fromId: card.id,
          fromX: origin.x + NODE_W,
          fromY: origin.y + NODE_H / 2,
          x: point.x,
          y: point.y,
        };
        link[1](Object.assign({}, linkRef.current));
      };

      const startLink = (event, card) => startWiring(event, card, 'parent');
      const startRef = (event, card) => startWiring(event, card, 'ref');

      const draggingActive = Boolean(drag[0]);
      React.useEffect(() => {
        if (!draggingActive) return undefined;
        const move = (event) => {
          const current = dragRef.current;
          if (!current) return;
          const point = toCanvas(event);
          const dx = point.x - current.startX;
          const dy = point.y - current.startY;
          if (!current.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
          current.moved = true;
          current.x = Math.max(0, current.originX + dx);
          current.y = Math.max(0, current.originY + dy);
          drag[1](Object.assign({}, current));
        };
        const finish = (event) => {
          const current = dragRef.current;
          dragRef.current = null;
          drag[1](null);
          if (!current) return;
          if (current.moved) {
            if (typeof props.onMove === 'function') {
              props.onMove(current.cardId, { x: Math.round(current.x), y: Math.round(current.y) });
            }
            return;
          }
          const card = cards.find((item) => item.id === current.cardId);
          if (card && typeof props.onSelect === 'function' && event) props.onSelect(card);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', finish);
        window.addEventListener('pointercancel', finish);
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        return () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', finish);
          window.removeEventListener('pointercancel', finish);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        };
      }, [draggingActive]);

      const linkActive = Boolean(link[0]);
      React.useEffect(() => {
        if (!linkActive) return undefined;
        const move = (event) => {
          const current = linkRef.current;
          if (!current) return;
          const point = toCanvas(event);
          current.x = point.x;
          current.y = point.y;
          link[1](Object.assign({}, current));
        };
        const finish = (event) => {
          const current = linkRef.current;
          linkRef.current = null;
          link[1](null);
          if (!current || !event) return;
          let targetId = null;
          try {
            const element = document.elementFromPoint(event.clientX, event.clientY);
            const node = element && element.closest ? element.closest('[data-card-id]') : null;
            targetId = node ? node.getAttribute('data-card-id') : null;
          } catch (error) {
            targetId = null;
          }
          if (!targetId || targetId === current.fromId) return;
          const fromCard = cards.find((item) => item.id === current.fromId) || null;
          if (!fromCard) return;
          if (current.kind === 'ref') {
            if (typeof props.onAddRef === 'function') props.onAddRef(fromCard, targetId);
            return;
          }
          if (typeof props.onReparent === 'function') props.onReparent(current.fromId, targetId);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', finish);
        window.addEventListener('pointercancel', finish);
        document.body.style.cursor = 'crosshair';
        return () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', finish);
          window.removeEventListener('pointercancel', finish);
          document.body.style.cursor = '';
        };
      }, [linkActive]);

      const hovered = hover[0] ? cards.find((card) => card.id === hover[0]) || null : null;
      const hoveredPoint = hovered ? pos.get(hovered.id) : null;
      const tipBelow = hoveredPoint ? hoveredPoint.y + NODE_H + 200 < height : true;
      const tipTop = hoveredPoint
        ? tipBelow
          ? hoveredPoint.y + NODE_H + 7
          : Math.max(6, hoveredPoint.y - 172)
        : 0;
      const tipLeft = hoveredPoint ? Math.min(hoveredPoint.x, Math.max(12, width - 310)) : 0;

      return h(
        'div',
        { className: 'ct-overview' },
        h(
          'div',
          { className: 'ct-overview-hint' },
          h('span', { className: 'ct-overview-tip' }, strings.overviewHint),
          h(
            'button',
            {
              type: 'button',
              className: 'ct-btn ct-btn--sm',
              title: strings.resetLayout,
              onClick: () => {
                if (typeof props.onReset === 'function') props.onReset();
              },
            },
            strings.resetLayout,
          ),
        ),
        h(
          'div',
          { className: 'ct-overview-scroll' },
          h(
            'div',
            { className: 'ct-overview-canvas', ref: canvasRef, style: { width, height } },
            h(
              'svg',
              { className: 'ct-overview-edges', width, height },
              edges,
              refEdges,
              link[0]
                ? h('line', {
                    x1: link[0].fromX,
                    y1: link[0].fromY,
                    x2: link[0].x,
                    y2: link[0].y,
                    stroke: 'var(--dsw-alias-brand-primary)',
                    'stroke-width': 2,
                    'stroke-dasharray': '6 4',
                  })
                : null,
            ),
            order.map((card) => {
              const point = pos.get(card.id);
              const className =
                'ct-node' +
                (card.id === props.selectedCardId ? ' ct-node--active' : '') +
                (card.status === 'running' ? ' ct-node--running' : '') +
                (dragging && dragging.cardId === card.id ? ' ct-node--drag' : '');
              return h(
                'div',
                {
                  key: card.id,
                  className,
                  'data-card-id': card.id,
                  role: 'button',
                  tabIndex: 0,
                  title: strings.dragNode,
                  style: { left: point.x, top: point.y, width: NODE_W, height: NODE_H },
                  onPointerDown: (event) => startDrag(event, card),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (typeof props.onSelect === 'function') props.onSelect(card);
                    }
                  },
                  onMouseEnter: () => hover[1](card.id),
                  onMouseLeave: () => hover[1](null),
                  onFocus: () => hover[1](card.id),
                  onBlur: () => hover[1](null),
                },
                h(
                  'span',
                  { className: 'ct-node-mode' },
                  modeLabel(card.mode) + (card.parentId ? '' : ' · ' + strings.rootCard),
                ),
                h('span', { className: 'ct-node-text' }, card.prompt || ''),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ct-node-act ct-node-link',
                    title: strings.linkNode,
                    'aria-label': strings.connectTo,
                    onPointerDown: (event) => startLink(event, card),
                    onClick: (event) => event.stopPropagation(),
                  },
                  GlyphDiagArrow(11),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ct-node-act ct-node-ref',
                    title: strings.refLine,
                    'aria-label': strings.refLine,
                    onPointerDown: (event) => startRef(event, card),
                    onClick: (event) => event.stopPropagation(),
                  },
                  '⇢',
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ct-node-act ct-node-del',
                    title: strings.deleteSubtree,
                    'aria-label': strings.deleteSubtree,
                    onPointerDown: (event) => event.stopPropagation(),
                    onClick: (event) => {
                      event.stopPropagation();
                      if (typeof props.onRequestDelete === 'function') props.onRequestDelete(card);
                    },
                  },
                  '×',
                ),
              );
            }),
            hovered && !dragging && !link[0]
              ? h(
                  'div',
                  { className: 'ct-tip', style: { left: tipLeft, top: tipTop } },
                  h('span', { className: 'ct-tip-mode' }, modeLabel(hovered.mode) + ' · ' + when(hovered.createdAt)),
                  h('span', { className: 'ct-tip-q' }, hovered.prompt || ''),
                  h(
                    'span',
                    { className: 'ct-tip-a' },
                    hovered.answer
                      ? plainText(hovered.answer).slice(0, 420)
                      : hovered.status === 'running'
                        ? strings.thinking
                        : hovered.error
                          ? strings.errorPrefix + hovered.error
                          : strings.noAnswer,
                  ),
                )
              : null,
          ),
        ),
      );
    }

    function ToolSteps(props) {
      const steps = Array.isArray(props.steps) ? props.steps : [];
      const strings = t();
      const open = React.useState(false);
      const expanded = open[0];
      if (!steps.length) return null;
      const failed = steps.filter((step) => step && step.ok === false).length;
      const running = steps.some((step) => step && step.ok === null);
      return h(
        'div',
        { className: 'ct-tools' },
        h(
          'button',
          { type: 'button', className: 'ct-tools-head', onClick: () => open[1](!expanded) },
          h('span', { className: 'ct-tools-caret' }, expanded ? '▾' : '▸'),
          h('span', { className: 'ct-tools-title' }, strings.toolsLabel + ' · ' + steps.length),
          failed ? h('span', { className: 'ct-tools-bad' }, strings.toolsFailed + ' ' + failed) : null,
          running ? h('span', { className: 'ct-tools-live' }, strings.toolsRunning) : null,
        ),
        expanded
          ? h(
              'div',
              { className: 'ct-tools-body' },
              steps.map((step, index) =>
                h(
                  'div',
                  { className: 'ct-tool', key: 'tool-' + index },
                  h(
                    'div',
                    { className: 'ct-tool-row' },
                    h('span', { className: 'ct-tool-mark' }, step.ok === false ? '✗' : step.ok === true ? '✓' : '·'),
                    h('span', { className: 'ct-tool-name' }, step.name || '?'),
                  ),
                  step.arguments ? h('pre', { className: 'ct-tool-args' }, step.arguments) : null,
                  step.preview ? h('pre', { className: 'ct-tool-out' }, step.preview) : null,
                ),
              ),
            )
          : null,
      );
    }

    function Detail(props) {
      const card = props.card;
      const streaming = props.streaming;
      const strings = t();
      const running = card.status === 'running';
      const partial = card.status === 'partial';
      const contextInfo = props.contextInfo || null;
      const answer = running ? streaming || '' : card.answer || '';
      const copied = props.copiedCardId === card.id;
      const steps = running
        ? Array.isArray(props.liveSteps) ? props.liveSteps : []
        : Array.isArray(card.steps) ? card.steps : [];
      const followUps = Array.isArray(card.followUps) ? card.followUps : [];
      const refs = Array.isArray(props.refs) ? props.refs : [];
      const allCards = Array.isArray(props.allCards) ? props.allCards : [];
      const refItems = (() => {
        const others = allCards.filter((entry) => entry.id !== card.id);
        if (others.length === 0) return [{ label: strings.noOtherCards, disabled: true }];
        return others.map((entry) => {
          const outgoing = refs.some((ref) => ref.id === entry.id);
          const incoming = Array.isArray(entry.refs) && entry.refs.includes(card.id);
          const on = outgoing || incoming;
          return {
            label: titleOf(entry),
            checked: on,
            onClick: () => {
              // The pair shares one line; drop whichever direction exists.
              if (outgoing) props.onRemoveRef(card, entry.id);
              else if (incoming) props.onRemoveRef(entry, card.id);
              else props.onAddRef(card, entry.id);
            },
          };
        });
      })();
      const attachRow = (list) =>
        Array.isArray(list) && list.length > 0
          ? h(
              'div',
              { className: 'ct-attach-row' },
              list.map((item, index) =>
                h(
                  'span',
                  {
                    key: (item.ref && item.ref.attachmentId) || item.name || 'a' + index,
                    className: 'ct-attach ct-attach--static',
                    title: item.name,
                  },
                  h('span', { className: 'ct-attach-ic' }, item.kind === 'image' ? GlyphImage(13) : GlyphFile(13)),
                  h('span', { className: 'ct-attach-name' }, item.name || 'file'),
                  h('span', { className: 'ct-attach-size' }, formatBytes(item.bytes)),
                ),
              ),
            )
          : null;

      return h(
        'div',
        { className: 'ct-detail' },
        h(
          'div',
          { className: 'ct-meta' },
          h('span', { className: 'ct-chip ct-chip--brand' }, modeLabel(card.mode)),
          h('span', null, when(card.createdAt)),
          running ? h('span', { className: 'ct-chip' }, strings.thinking) : null,
          partial ? h('span', { className: 'ct-chip ct-chip--warn' }, strings.partialTag) : null,
          contextInfo && contextInfo.budget
            ? h(
                'span',
                { className: 'ct-chip', title: 'context window ' + contextInfo.contextWindow },
                strings.contextLabel +
                  ' ~' +
                  Math.round(contextInfo.approxTokens / 100) / 10 +
                  'k/' +
                  Math.round(contextInfo.budget / 100) / 10 +
                  'k' +
                  (contextInfo.foldedCards ? ' · ' + contextInfo.foldedCards + ' ' + strings.contextFolded : ''),
              )
            : null,
        ),
        h('div', { className: 'ct-question' }, card.prompt),
        attachRow(card.attachments),
        refs.length
          ? h(
              'div',
              { className: 'ct-refs', title: strings.refDirHint },
              h('span', { className: 'ct-refs-label' }, strings.refsLabel + ' · ' + refs.length),
              refs.map((ref) =>
                h(
                  'span',
                  { key: ref.id, className: 'ct-ref' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'ct-ref-open',
                      title: strings.refTag,
                      onClick: () => props.onSelectCard(ref),
                    },
                    titleOf(ref),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'ct-ref-x',
                      title: strings.removeRef,
                      'aria-label': strings.removeRef,
                      onClick: () => props.onRemoveRef(card, ref.id),
                    },
                    '×',
                  ),
                ),
              ),
            )
          : null,
        running
          ? h(
              'div',
              { className: 'ct-answer' },
              answer ? h(Markdown, { text: answer }) : h('span', { className: 'ct-answer--muted' }, strings.thinking),
              h('span', { className: 'ct-caret' }),
            )
          : card.answer
            ? h('div', { className: 'ct-answer' }, h(Markdown, { text: card.answer }))
            : h('div', { className: 'ct-answer ct-answer--muted' }, strings.noAnswer),
        card.error
          ? h('div', { className: 'ct-err' }, strings.errorPrefix + card.error)
          : null,
        partial
          ? h(
              'div',
              { className: 'ct-partial' },
              h('span', null, strings.partialTag),
              h(
                'button',
                { type: 'button', className: 'ct-btn ct-btn--sm', onClick: () => props.onContinue(card) },
                strings.continueLabel,
              ),
            )
          : null,
        steps.length ? h(ToolSteps, { steps }) : null,
        followUps.length
          ? h(
              'div',
              { className: 'ct-follows' },
              followUps.map((item) => {
                const key = card.id + ':' + item.id;
                const isRunning = item.status === 'running';
                const live = (props.streamingMap && props.streamingMap[key]) || '';
                const text = isRunning ? live || item.answer || '' : item.answer || '';
                const liveSteps = props.toolSteps && props.toolSteps[key];
                const itemSteps = isRunning
                  ? Array.isArray(liveSteps) ? liveSteps : Array.isArray(item.steps) ? item.steps : []
                  : Array.isArray(item.steps) ? item.steps : [];
                return h(
                  'div',
                  { key: item.id, className: 'ct-follow' },
                  h(
                    'div',
                    { className: 'ct-follow-head' },
                    h('span', { className: 'ct-chip ct-chip--soft' }, strings.followTag),
                    h('span', { className: 'ct-follow-when' }, when(item.createdAt)),
                    item.status === 'partial' ? h('span', { className: 'ct-chip ct-chip--warn' }, strings.partialTag) : null,
                    h('span', { className: 'ct-spacer' }),
                    isRunning
                      ? h(
                          'button',
                          {
                            type: 'button',
                            className: 'ct-btn ct-btn--sm ct-btn--danger',
                            onClick: () => props.onStopFollow(card, item),
                          },
                          strings.stop,
                        )
                      : item.status === 'partial'
                        ? h(
                            'button',
                            {
                              type: 'button',
                              className: 'ct-btn ct-btn--sm',
                              onClick: () => props.onContinueFollow(card, item),
                            },
                            strings.continueLabel,
                          )
                        : null,
                  ),
                  h('div', { className: 'ct-follow-q' }, item.prompt),
                  attachRow(item.attachments),
                  isRunning
                    ? h(
                        'div',
                        { className: 'ct-answer' },
                        text ? h(Markdown, { text }) : h('span', { className: 'ct-answer--muted' }, strings.thinking),
                        h('span', { className: 'ct-caret' }),
                      )
                    : item.answer
                      ? h('div', { className: 'ct-answer' }, h(Markdown, { text: item.answer }))
                      : h('div', { className: 'ct-answer ct-answer--muted' }, strings.noAnswer),
                  item.error ? h('div', { className: 'ct-err' }, strings.errorPrefix + item.error) : null,
                  itemSteps.length ? h(ToolSteps, { steps: itemSteps }) : null,
                );
              }),
            )
          : null,
        h(
          'div',
          { className: 'ct-actions' },
          running
            ? h(
                'button',
                { type: 'button', className: 'ct-btn ct-btn--danger', onClick: () => props.onStop(card) },
                strings.stop,
              )
            : h(
                'button',
                { type: 'button', className: 'ct-btn ct-btn--primary ct-btn--sm', onClick: () => props.onCompose('child') },
                GlyphArrow(13),
                strings.continueAsk,
              ),
          running
            ? null
            : h(Menu, {
                className: 'ct-btn ct-btn--sm',
                glyph: h(React.Fragment, null, GlyphRefresh(13), ' ', strings.rerun),
                title: strings.rerun,
                items: [
                  { label: strings.rerun, description: strings.rerunHint, onClick: () => props.onRerun(card) },
                  { label: strings.branchAnswer, description: strings.branchHint, onClick: () => props.onRebranch(card) },
                ],
              }),
          running
            ? null
            : h(
                'button',
                {
                  type: 'button',
                  className: 'ct-btn ct-btn--sm',
                  disabled: !card.answer,
                  onClick: () => props.onCopy(card, card.prompt + '\n\n' + card.answer),
                },
                GlyphCopy(13),
                copied ? strings.copied : strings.copy,
              ),
          running
            ? null
            : h(Menu, {
                className: 'ct-btn ct-btn--sm',
                glyph: '⇢',
                title: strings.addRef,
                items: refItems,
              }),
          h('span', { className: 'ct-spacer' }),
          h(
            'button',
            {
              type: 'button',
              className: 'ct-iconbtn ct-iconbtn--danger',
              title: strings.remove,
              'aria-label': strings.remove,
              onClick: () => props.onRemove(card),
            },
            GlyphTrash(15),
          ),
        ),
      );
    }

    function Composer(props) {
      const strings = t();
      const selected = props.selected;
      const mode = props.mode;
      const running = props.running;
      const modes = [
        ['child', strings.modeChild, strings.modeHintChild],
        ['follow', strings.modeFollow, strings.modeHintFollow],
        ['diverge', strings.modeDiverge, strings.modeHintDiverge],
        ['isolated', strings.modeIsolated, strings.modeHintIsolated],
      ];
      const current = modes.filter((entry) => entry[0] === mode)[0] || modes[0];
      const modeMenuItems = [
        { label: strings.modeChild, description: strings.modeHintChild, checked: mode === 'child', onClick: () => props.onMode('child') },
        { label: strings.modeFollow, description: strings.modeHintFollow, checked: mode === 'follow', onClick: () => props.onMode('follow') },
        { label: strings.modeDiverge, description: strings.modeHintDiverge, checked: mode === 'diverge', onClick: () => props.onMode('diverge') },
        { separator: true },
        { label: strings.modeIsolated, description: strings.modeHintIsolated, checked: mode === 'isolated', onClick: () => props.onMode('isolated') },
      ];
      const areaRef = React.useRef(null);
      const fileRef = React.useRef(null);
      const focusToken = props.focusToken;
      const attachments = Array.isArray(props.attachments) ? props.attachments : [];

      React.useEffect(() => {
        const node = areaRef.current;
        if (!node) return;
        node.style.height = 'auto';
        node.style.height = Math.min(node.scrollHeight, 220) + 'px';
      }, [props.draft]);

      React.useEffect(() => {
        const node = areaRef.current;
        if (!node || !focusToken) return;
        node.focus();
        const end = node.value.length;
        try {
          node.setSelectionRange(end, end);
        } catch (err) {
          void err;
        }
      }, [focusToken]);

      const ready = (Boolean(String(props.draft || '').trim()) || attachments.length > 0) && !running;

      return h(
        'div',
        { className: 'ct-compose' },
        h(
          'div',
          { className: 'ct-compose-inner' },
          h(
            'div',
            { className: 'ct-compose-box' },
            attachments.length > 0
              ? h(
                  'div',
                  { className: 'ct-attach-row' },
                  attachments.map((item) =>
                    h(
                      'span',
                      { key: item.id, className: 'ct-attach', title: item.name },
                      item.preview
                        ? h('img', { className: 'ct-attach-img', src: item.preview, alt: item.name })
                        : h('span', { className: 'ct-attach-ic' }, GlyphFile(13)),
                      h('span', { className: 'ct-attach-name' }, item.name),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'ct-attach-x',
                          title: strings.removeAttachment,
                          'aria-label': strings.removeAttachment,
                          onClick: () => props.onRemove(item.id),
                        },
                        '×',
                      ),
                    ),
                  ),
                )
              : null,
            h('textarea', {
              ref: areaRef,
              className: 'ct-textarea',
              rows: 1,
              value: props.draft,
              title: selected ? current[2] : strings.noSelectionHint,
              placeholder: !selected
                ? strings.emptyComposer
                : mode === 'follow'
                  ? strings.followPlaceholder
                  : mode === 'diverge'
                    ? strings.composerDiverge
                    : mode === 'branch'
                      ? strings.composerBranch
                      : mode === 'isolated'
                        ? strings.composerIsolated
                        : strings.composerChild,
              onChange: (event) => props.onDraft(event.target.value),
              onPaste: (event) => {
                const data = event.clipboardData;
                if (!data) return;
                const files = [];
                const items = data.items ? Array.prototype.slice.call(data.items) : [];
                items.forEach((item) => {
                  if (item.kind !== 'file') return;
                  const file = item.getAsFile();
                  if (file) files.push(file);
                });
                if (files.length === 0 && data.files) {
                  for (let index = 0; index < data.files.length; index += 1) files.push(data.files[index]);
                }
                if (files.length > 0) {
                  event.preventDefault();
                  props.onFiles(files);
                }
              },
              onKeyDown: (event) => {
                if (event.key !== 'Enter') return;
                const native = event.nativeEvent || {};
                if (native.isComposing || event.isComposing) return;
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                if (String(props.draft || '').trim() || attachments.length > 0) props.onSend();
              },
            }),
            h(
              'div',
              { className: 'ct-compose-foot' },
              h('input', {
                ref: fileRef,
                type: 'file',
                multiple: true,
                className: 'ct-file-input',
                onChange: (event) => {
                  const list = event.target.files;
                  event.target.value = '';
                  if (list && list.length > 0) props.onFiles(list);
                },
              }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'ct-iconbtn ct-iconbtn--sm ct-attach-btn',
                  title: strings.attachHint,
                  'aria-label': strings.attachHint,
                  onClick: () => {
                    if (fileRef.current) fileRef.current.click();
                  },
                },
                GlyphPlus(14),
              ),
              selected
                ? h(Menu, {
                    className: 'ct-btn ct-btn--sm ct-mode-btn' + (mode !== 'child' ? ' ct-btn--on' : ''),
                    glyph: '↳ ' + current[1],
                    title: strings.composerModeGroup,
                    items: modeMenuItems,
                  })
                : null,
              h(ModelPicker, {
                models: props.models,
                current: props.model,
                onPick: props.onPickModel,
                onRefresh: props.onRefreshModels,
              }),
              h(EffortPicker, {
                efforts: props.efforts,
                current: props.model,
                onPick: props.onPickEffort,
                onRefresh: props.onRefreshEfforts,
              }),
              h('span', { className: 'ct-actions-spacer' }),
              h(
                'button',
                { type: 'button', className: 'ct-send', disabled: !ready, onClick: props.onSend },
                strings.send,
                GlyphArrow(13),
              ),
            ),
          ),
        ),
      );
    }

    function Root(props) {
      void props;
      const state = useStore();
      const strings = t();
      const project = store.activeProject();
      const cards = project ? project.cards : [];
      const children = project ? childrenOf(project) : new Map();
      const selected = project ? cards.find((card) => card.id === state.selectedCardId) || null : null;
      const running = cards.some((card) => card.status === 'running') || Object.keys(state.streaming).length > 0;
      const projects = state.data.projects || [];
      const health = state.health || { status: 'idle', missing: [] };
      const compatIssues = [];
      if (health.status === 'error') compatIssues.push(strings.compatHealthFailed);
      if (health.status === 'ok' && Array.isArray(health.missing) && health.missing.length > 0) {
        compatIssues.push(strings.compatMissingServices + ' ' + health.missing.join(', '));
      }
      if (Array.isArray(state.seatIssues) && state.seatIssues.length > 0) {
        compatIssues.push(strings.compatMissingSeats + ' ' + state.seatIssues.join(', '));
      }

      const rootRef = React.useRef(null);
      const [doomed, setDoomed] = React.useState(null);
      const [deletedProject, setDeletedProject] = React.useState(null);
      const importRef = React.useRef(null);
      React.useEffect(() => {
        store.load();
        store.loadModels().catch(() => {
          /* the picker falls back to "follow DSH default" */
        });
      }, []);

      /* Reasoning levels belong to the chosen model, so refresh them when it changes. */
      const modelKey = state.models.current ? state.models.current.provider + ':' + state.models.current.model : '';
      React.useEffect(() => {
        if (!modelKey) return;
        store.loadEfforts(true).catch(() => {
          /* the picker falls back to "model default" */
        });
      }, [modelKey]);

      /* Newly configured providers/models show up without reopening the app. */
      React.useEffect(() => {
        const refresh = () => {
          store.loadModels(true).catch(() => {
            /* keep the cached list on failure */
          });
        };
        const onVisible = () => {
          if (!document.hidden) refresh();
        };
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          window.removeEventListener('focus', refresh);
          document.removeEventListener('visibilitychange', onVisible);
        };
      }, []);

      React.useEffect(() => {
        const node = rootRef.current;
        if (!node || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver((entries) => {
          const width = entries[0] && entries[0].contentRect ? entries[0].contentRect.width : 0;
          const compact = width > 0 && width < COMPACT_BELOW;
          if (compact !== store.get().compact) {
            store.patch({ compact, compactPane: compact ? 'tree' : 'tree' });
          }
        });
        observer.observe(node);
        return () => observer.disconnect();
      }, []);

      /* Escape closes whatever is on top, then clears the toast. */
      React.useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return;
          const live = store.get();
          if (doomed) {
            setDoomed(null);
            return;
          }
          if (live.overview) {
            store.patch({ overview: false });
            return;
          }
          if (live.systemOpen) {
            store.patch({ systemOpen: false });
            flushProjectSaveQuiet();
            return;
          }
          if (live.error) {
            store.patch({ error: null });
            return;
          }
          if (live.notice) store.patch({ notice: null });
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
      }, [doomed]);

      function flushProjectSaveQuiet() {
        try {
          store.flushProjectSave();
        } catch (error) {
          void error;
        }
      }

      const rootClass = [
        'ct-root',
        state.compact ? 'ct-root--compact' : '',
        !state.treeOpen ? 'ct-root--notree' : '',
        state.compact && state.compactPane === 'main' ? 'ct-hide-tree' : '',
        state.compact && state.compactPane === 'tree' && (selected || state.overview) ? 'ct-hide-main' : '',
      ]
        .filter(Boolean)
        .join(' ');

      function selectCard(card) {
        store.patch({ selectedCardId: card.id, compactPane: state.compact ? 'main' : 'tree', overview: false });
      }

      /** Every card id under `cardId`, including itself. */
      function subtreeOf(cardId) {
        const ids = [];
        const queue = [cardId];
        while (queue.length > 0) {
          const id = queue.shift();
          ids.push(id);
          for (const kid of children.get(id) || []) queue.push(kid.id);
        }
        return ids;
      }

      function requestDelete(card) {
        setDoomed({ card, ids: subtreeOf(card.id) });
      }

      async function confirmDelete() {
        const pending = doomed;
        setDoomed(null);
        if (!pending) return;
        try {
          await store.deleteCard(pending.card.id);
          store.patch({ notice: strings.branchDeleted + ' ' + pending.ids.length + ' ' + strings.countCards });
        } catch (error) {
          store.patch({ error: String((error && error.message) || error) });
        }
      }

      async function moveNode(cardId, point) {
        try {
          await store.moveCard(cardId, point);
        } catch (error) {
          store.patch({ error: String((error && error.message) || error) });
        }
      }

      async function reparentNode(cardId, parentId) {
        try {
          await store.reparentCard(cardId, parentId);
          store.patch({ notice: strings.reparented });
        } catch (error) {
          store.patch({ error: strings.reparentFailed + String((error && error.message) || error) });
        }
      }

      async function resetNodeLayout() {
        try {
          await store.resetLayout();
          store.patch({ notice: strings.layoutReset });
        } catch (error) {
          store.patch({ error: String((error && error.message) || error) });
        }
      }

      /** Dashed reference edge: the referenced card's Q&A joins this card's context. */
      async function addRef(card, targetId) {
        try {
          await store.addRef(card.id, targetId);
          store.patch({ notice: strings.refAdded });
        } catch (error) {
          store.patch({ error: String((error && error.message) || error) });
        }
      }

      async function removeRef(card, targetId) {
        try {
          await store.addRef(card.id, targetId, true);
          store.patch({ notice: strings.refRemoved });
        } catch (error) {
          store.patch({ error: String((error && error.message) || error) });
        }
      }

      /** A cut-off answer resumes as an in-card follow-up instead of a new node. */
      async function continueCard(card) {
        if (!card) return;
        try {
          const followUp = await store.createFollow(card.id, t().continuePrompt);
          if (followUp) await store.send(card.id, null, [], followUp.id);
        } catch (error) {
          store.patch({ error: String((error && error.message) || error) });
        }
      }

      function continueFollow(card) {
        return continueCard(card);
      }

      /** Drag the divider to resize the tree column; the width is remembered. */
      function startResize(event) {
        if (event.button !== 0) return;
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = store.get().treeWidth;
        const previousCursor = document.body.style.cursor;
        const previousSelect = document.body.style.userSelect;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        const move = (ev) => store.setTreeWidth(startWidth + (ev.clientX - startX));
        const stop = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', stop);
          document.body.style.cursor = previousCursor;
          document.body.style.userSelect = previousSelect;
          store.commitTreeWidth();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
      }

      function focusComposer(mode) {
        const card = selected;
        const next = mode || 'child';
        const draft =
          next === 'branch' && card && !store.get().draft.trim() ? card.prompt : store.get().draft;
        store.patch({ mode: next, draft, composerFocusToken: store.get().composerFocusToken + 1 });
      }

      function newProject() {
        store.newProject();
        store.patch({ composerFocusToken: store.get().composerFocusToken + 1 });
      }

      function switchProject(projectId) {
        store.patch({
          data: Object.assign({}, store.get().data, { activeProjectId: projectId }),
          selectedCardId: null,
          overview: false,
          systemOpen: false,
        });
      }

      const switchItems = projects.map((entry) =>
        Object.assign(
          { label: (project && entry.id === project.id ? '✓ ' : '') + (entry.title || strings.newTree) },
          { onClick: () => switchProject(entry.id) },
        ),
      );
      if (switchItems.length) switchItems.push({ separator: true });
      switchItems.push({ label: strings.newProject, onClick: newProject });

      const moreItems = project
        ? [
            { label: strings.projectSystem, onClick: () => store.patch({ systemOpen: !state.systemOpen }) },
            { separator: true },
            { label: strings.exportLabel, onClick: exportProject },
            { label: strings.importLabel, onClick: () => importRef.current && importRef.current.click() },
            { separator: true },
            { label: strings.newProject, onClick: newProject },
            {
              label: strings.deleteProject,
              danger: true,
              onClick: () => {
                if (!window.confirm(strings.confirmDeleteProject)) return;
                /* Keep the whole project in memory so the deletion can be undone. */
                let copy = null;
                try {
                  copy = JSON.parse(JSON.stringify(project));
                } catch (error) {
                  copy = null;
                }
                store.deleteProject().then(() => {
                  if (copy) setDeletedProject(copy);
                });
              },
            },
          ]
        : [
            { label: strings.newProject, onClick: newProject },
            { label: strings.importLabel, onClick: () => importRef.current && importRef.current.click() },
          ];

      function exportProject() {
        if (!project) return;
        try {
          const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), project }, null, 2);
          const blob = new Blob([payload], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = (project.title || 'card-tree').replace(/[\\/:*?"<>|]+/g, '_') + '.json';
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1500);
        } catch (error) {
          store.patch({ error: String((error && error.message) || error) });
        }
      }

      function pickImport(event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(String(reader.result || ''));
            const raw = parsed && parsed.project ? parsed.project : parsed;
            if (!raw || typeof raw !== 'object') throw new Error('no project object');
            store.importProject(raw).then((ok) => {
              if (ok) store.patch({ notice: strings.undoDone, selectedCardId: null, overview: false });
            });
          } catch (error) {
            store.patch({ error: strings.importFailed + String((error && error.message) || error) });
          }
        };
        reader.onerror = () => store.patch({ error: strings.importFailed + String(reader.error || '') });
        reader.readAsText(file);
      }

      function undoDeleteProject() {
        const copy = deletedProject;
        if (!copy) return;
        setDeletedProject(null);
        store.restoreProject(copy).then((ok) => {
          if (ok) store.patch({ notice: strings.undoDone });
        });
      }

      const empty = !project
        ? h(
            'div',
            { className: 'ct-empty' },
            h('div', { className: 'ct-empty-glyph' }, GlyphTree(34)),
            h('h3', null, strings.emptyStartTitle),
            h('p', null, strings.emptyStartHint),
            h(
              'button',
              { type: 'button', className: 'ct-btn ct-btn--primary', onClick: newProject },
              GlyphPlus(14),
              strings.newProject,
            ),
          )
        : cards.length === 0
          ? h(
              'div',
              { className: 'ct-empty' },
              h('div', { className: 'ct-empty-glyph' }, GlyphTree(34)),
              h('h3', null, strings.emptyStartTitle),
              h('p', null, strings.emptyCardsHint),
            )
          : h('div', { className: 'ct-empty ct-empty--quiet' }, h('p', null, strings.selectHint));

      return h(
        'div',
        { className: rootClass, ref: rootRef },
        h('style', null, CSS),
        h('input', {
          ref: importRef,
          className: 'ct-import-input',
          type: 'file',
          accept: 'application/json,.json',
          tabIndex: -1,
          'aria-hidden': 'true',
          onChange: pickImport,
        }),
        h(
          'div',
          { className: 'ct-top' },
          h('span', { className: 'ct-top-mark' }, GlyphTree(16)),
          project
            ? h('input', {
                className: 'ct-top-title',
                value: project.title,
                'aria-label': strings.projectName,
                placeholder: strings.projectName,
                onChange: (event) => store.updateProject({ title: event.target.value }),
                onBlur: flushProjectSaveQuiet,
              })
            : h('span', { className: 'ct-top-title ct-top-title--ghost' }, strings.panelTitle),
          project
            ? h(Menu, {
                className: 'ct-iconbtn ct-iconbtn--sm',
                glyph: GlyphChevron(14),
                title: strings.switchProject,
                items: switchItems,
              })
            : null,
          h('span', { className: 'ct-spacer' }),
          project ? h('span', { className: 'ct-top-meta' }, cards.length + ' ' + strings.countCards) : null,
          state.model
            ? h('span', { className: 'ct-top-meta', title: strings.modelLabel }, state.model.model)
            : null,
          project
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'ct-btn ct-btn--sm' + (state.overview ? ' ct-btn--on' : ''),
                  title: strings.overviewHint,
                  'aria-pressed': state.overview ? 'true' : 'false',
                  onClick: () => store.patch({ overview: !state.overview }),
                },
                GlyphLayers(13),
                state.overview ? strings.overviewClose : strings.overview,
              )
            : null,
          project && !state.compact
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'ct-iconbtn ct-iconbtn--sm',
                  'data-on': state.treeOpen ? '1' : '0',
                  title: strings.toggleTree,
                  'aria-label': strings.toggleTree,
                  'aria-pressed': state.treeOpen ? 'true' : 'false',
                  onClick: () => store.toggleTree(),
                },
                GlyphPanel(14),
              )
            : null,
          state.compact && project
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'ct-btn ct-btn--sm',
                  onClick: () => store.patch({ compactPane: state.compactPane === 'tree' ? 'main' : 'tree' }),
                },
                state.compactPane === 'tree' ? strings.card : strings.tree,
              )
            : null,
          h(Menu, {
            className: 'ct-iconbtn ct-iconbtn--sm',
            glyph: '⋯',
            title: strings.more,
            items: moreItems,
          }),
        ),
        state.error
          ? h(
              'div',
              { className: 'ct-toast ct-toast--error' },
              h('span', null, strings.errorPrefix + state.error),
              h(
                'button',
                { type: 'button', className: 'ct-btn ct-btn--sm', onClick: () => store.patch({ error: null }) },
                strings.dismiss,
              ),
            )
          : null,
        deletedProject
          ? h(
              'div',
              { className: 'ct-toast' },
              h('span', null, strings.branchDeleted + ' ' + (deletedProject.title || '') ),
              h(
                'button',
                { type: 'button', className: 'ct-btn ct-btn--sm', onClick: undoDeleteProject },
                strings.undoLabel,
              ),
              h(
                'button',
                { type: 'button', className: 'ct-btn ct-btn--sm', onClick: () => setDeletedProject(null) },
                strings.dismiss,
              ),
            )
          : null,
        state.notice
          ? h(
              'div',
              { className: 'ct-toast' },
              h('span', null, state.notice),
              h(
                'button',
                { type: 'button', className: 'ct-btn ct-btn--sm', onClick: () => store.patch({ notice: null }) },
                strings.dismiss,
              ),
            )
          : null,
        doomed
          ? h(
              'div',
              { className: 'ct-modal-backdrop', onClick: () => setDoomed(null) },
              h(
                'div',
                {
                  className: 'ct-modal',
                  role: 'dialog',
                  'aria-modal': 'true',
                  onClick: (event) => event.stopPropagation(),
                },
                h(
                  'h3',
                  { className: 'ct-modal-title' },
                  strings.deleteConfirm + ' · ' + doomed.ids.length + ' ' + strings.countCards,
                ),
                h('p', { className: 'ct-modal-body' }, doomed.card.prompt || ''),
                h('p', { className: 'ct-modal-hint' }, strings.deleteSubtree),
                h(
                  'div',
                  { className: 'ct-modal-actions' },
                  h(
                    'button',
                    { type: 'button', className: 'ct-btn ct-btn--sm', onClick: () => setDoomed(null) },
                    strings.cancel,
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'ct-btn ct-btn--sm ct-btn--danger',
                      onClick: confirmDelete,
                    },
                    strings.deleteConfirm,
                  ),
                ),
              ),
            )
          : null,
        state.phase === 'loading'
          ? h('div', { className: 'ct-empty' }, h('p', null, strings.loading))
          : state.phase === 'error'
            ? h(
                'div',
                { className: 'ct-empty' },
                h('h3', null, strings.errorPrefix),
                h('p', null, state.error || ''),
                h('button', { type: 'button', className: 'ct-btn', onClick: () => store.load() }, strings.retry),
              )
            : h(
                React.Fragment,
                null,
                compatIssues.length > 0
                  ? h(
                      'div',
                      { className: 'ct-compat', role: 'status' },
                      h('span', { className: 'ct-compat-icon', 'aria-hidden': 'true' }, '\u26a0'),
                      h(
                        'div',
                        { className: 'ct-compat-body' },
                        h('strong', null, strings.compatTitle),
                        h('span', null, compatIssues.join(strings.compatJoin)),
                        h('span', { className: 'ct-compat-hint' }, strings.compatHint),
                      ),
                      h(
                        'button',
                        { type: 'button', className: 'ct-btn ct-btn--sm', onClick: () => store.loadHealth() },
                        strings.recheckLabel,
                      ),
                    )
                  : null,
                h(
                  'div',
                  { className: 'ct-body' + (state.overview ? ' ct-body--overview' : '') },
                  state.overview && project
                    ? h(Overview, {
                        cards,
                        children,
                        selectedCardId: state.selectedCardId,
                        onSelect: selectCard,
                        onMove: moveNode,
                        onReparent: reparentNode,
                        onReset: resetNodeLayout,
                        onRequestDelete: requestDelete,
                        onAddRef: addRef,
                        onRemoveRef: removeRef,
                      })
                    : null,
                  h(
                    'aside',
                    {
                      className: 'ct-tree',
                      style: state.compact ? undefined : { width: state.treeWidth + 'px' },
                    },
                    h(
                      'div',
                      { className: 'ct-tree-head' },
                      h('span', null, strings.tree),
                      h('span', { className: 'ct-tree-count' }, cards.length),
                    ),
                    h('input', {
                      className: 'ct-search',
                      type: 'search',
                      value: state.search,
                      placeholder: strings.searchPlaceholder,
                      'aria-label': strings.searchPlaceholder,
                      onChange: (event) => store.patch({ search: event.target.value }),
                    }),
                    cards.length === 0
                      ? h('div', { className: 'ct-tree-empty' }, h('p', null, strings.emptyTreeHint))
                      : h(TreeRows, {
                          children,
                          collapsed: state.collapsed,
                          search: state.search,
                          selectedCardId: state.selectedCardId,
                          onSelect: selectCard,
                          onToggle: (cardId) => store.toggleCollapse(cardId),
                          onRequestDelete: requestDelete,
                        }),
                  ),
                  h('div', {
                    className: 'ct-resizer',
                    role: 'separator',
                    'aria-orientation': 'vertical',
                    title: strings.resizeTree,
                    onPointerDown: startResize,
                  }),
                  h(
                    'main',
                    { className: 'ct-main' },
                    h(
                      'div',
                      { className: 'ct-read' },
                      h(
                        'div',
                        { className: 'ct-read-inner' },
                        state.systemOpen && project
                          ? h(
                              'div',
                              { className: 'ct-system' },
                              h(
                                'div',
                                { className: 'ct-system-label' },
                                h('span', null, GlyphSliders(13), strings.projectSystem),
                                h('span', { className: 'ct-compose-note' }, strings.systemHint),
                              ),
                              h('textarea', {
                                value: project.system || '',
                                placeholder: '例如：这个项目在研读 Transformer 的变体，回答请假设读者有机器学习基础。',
                                onChange: (event) => store.updateProject({ system: event.target.value }),
                                onBlur: flushProjectSaveQuiet,
                              }),
                            )
                          : null,
                        selected
                          ? h(Detail, {
                              card: selected,
                              streaming: state.streaming[selected.id],
                              liveSteps: state.toolSteps[selected.id],
                              streamingMap: state.streaming,
                              toolSteps: state.toolSteps,
                              copiedCardId: state.copiedCardId,
                              refs: Array.isArray(selected.refs)
                                ? selected.refs
                                    .map((id) => cards.find((entry) => entry.id === id))
                                    .filter(Boolean)
                                : [],
                              allCards: cards,
                              onAddRef: addRef,
                              onRemoveRef: removeRef,
                              onSelectCard: selectCard,
                              onStop: (card) => store.stop(card.id),
                              onStopFollow: (card, followUp) => store.stop(card.id, followUp.id),
                              onContinue: continueCard,
                              onContinueFollow: continueFollow,
                              contextInfo: state.contexts[selected.id] || selected.stats || null,
                              onRebranch: (card) => store.rebranch(card),
                              onRerun: (card) => store.rerun(card),
                              onCopy: (card, body) => store.copyCard(card, body),
                              onRemove: (card) => {
                                if (window.confirm(strings.confirmDeleteCard)) store.removeCard(card);
                              },
                              onCompose: focusComposer,
                            })
                          : empty,
                      ),
                    ),
                    h(Composer, {
                      selected,
                      mode: state.mode,
                      draft: state.draft,
                      running,
                      focusToken: state.composerFocusToken,
                      models: state.models,
                      model: state.models.current || state.model,
                      onPickModel: (choice) => {
                        store.setModel(choice).catch((error) => store.patch({ error: String((error && error.message) || error) }));
                      },
                      onRefreshModels: () => {
                        store.loadModels(true).catch(() => {
                          /* keep the cached list on failure */
                        });
                      },
                      efforts: state.efforts,
                      onPickEffort: (effortId) => {
                        store
                          .setEffort(effortId)
                          .catch((error) => store.patch({ error: String((error && error.message) || error) }));
                      },
                      onRefreshEfforts: () => {
                        store.loadEfforts(true).catch(() => {
                          /* keep the cached list on failure */
                        });
                      },
                      onDraft: (value) => store.patch({ draft: value }),
                      attachments: state.attachments,
                      onFiles: (files) => store.addFiles(files),
                      onRemove: (id) => store.removeAttachment(id),
                      onMode: (mode) => store.setMode(mode),
                      onSend: () => store.submit(store.get().draft),
                    }),
                  ),
                ),
              ),
      );
    }

    /* ------------------------------------------- panel icon / new-session / composer */

    function PageRoot() {
      return h(Root, null);
    }

    function PanelIcon(props) {
      const strings = t();
      const size = (props && props.size) || 18;
      return h(
        'button',
        {
          type: 'button',
          className: 'ct-icon-btn',
          'data-active': props && props.active ? '1' : '0',
          title: strings.panelTitle,
          'aria-label': strings.panelTitle,
          onClick: goToPanel,
        },
        GlyphTree(size),
      );
    }

    function TreeComposer(props) {
      const strings = t();
      const state = useStore();
      const sessionId = props && props.sessionId;
      const [draft, setDraft] = React.useState('');
      const [error, setError] = React.useState(null);

      React.useEffect(() => {
        store.ensureLoaded();
      }, []);

      const binding = sessionId && state.data.sessions ? state.data.sessions[sessionId] : null;
      const projectId = binding || (props.matched && props.matched.projectId) || null;
      const project = projectId ? state.data.projects.find((entry) => entry.id === projectId) || null : null;
      const cards = project ? project.cards : [];
      const latest = cards.length > 0 ? cards[cards.length - 1] : null;
      const streamed = latest ? state.streaming[latest.id] || '' : '';
      const answer = streamed || (latest ? latest.answer || '' : '');
      const running = Boolean(latest && (latest.status === 'running' || streamed));

      async function submit() {
        const text = draft.trim();
        if (!text || !project) return;
        setError(null);
        setDraft('');
        try {
          await store.askIn(project.id, text);
        } catch (thrown) {
          setError(String((thrown && thrown.message) || thrown));
          setDraft(text);
        }
      }

      async function bindNew() {
        if (!sessionId) return;
        try {
          const next = await store.bindSession(sessionId, strings.heroProject);
          if (next) store.selectProject(next);
        } catch (thrown) {
          setError(String((thrown && thrown.message) || thrown));
        }
      }

      async function unbind() {
        if (sessionId) {
          try {
            await store.unbindSession(sessionId);
          } catch (thrown) {
            setError(String((thrown && thrown.message) || thrown));
            return;
          }
        }
        remountConversation();
      }

      const preview = answer
        ? h('div', { className: 'ct-shot-text' }, plainText(answer).slice(0, 1200))
        : h('div', { className: 'ct-shot-text ct-shot-text--empty' }, cards.length === 0 ? strings.treeEmpty : strings.treeIdle);

      return h(
        'div',
        { className: 'ct-shot' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'ct-shot-head' },
          h('span', { className: 'ct-shot-chip' }, GlyphTree(11), strings.treeMode),
          h('span', { className: 'ct-shot-title', title: project ? project.title : '' }, project ? project.title : strings.heroProject),
          project ? h('span', { className: 'ct-chip' }, cards.length + ' ' + strings.countCards) : null,
          running ? h('span', { className: 'ct-dot', 'data-status': 'running' }) : null,
          h('span', { className: 'ct-spacer' }),
          project ? h('button', { type: 'button', className: 'ct-btn', onClick: goToPanel }, strings.openTree) : null,
          sessionId ? h('button', { type: 'button', className: 'ct-btn ct-btn--danger', onClick: unbind }, strings.exitTree) : null,
        ),
        preview,
        project
          ? h(
              'div',
              { className: 'ct-shot-row' },
              h('textarea', {
                value: draft,
                placeholder: strings.askTree,
                onChange: (event) => setDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                },
              }),
              h(
                'button',
                { type: 'button', className: 'ct-btn ct-btn--primary', disabled: !draft.trim(), onClick: submit },
                strings.send,
              ),
            )
          : h(
              'div',
              { className: 'ct-shot-row' },
              h('span', { className: 'ct-shot-hint' }, strings.treeIdle),
              h('span', { className: 'ct-spacer' }),
              h('button', { type: 'button', className: 'ct-btn ct-btn--primary', onClick: bindNew }, strings.newProject),
            ),
        error ? h('div', { className: 'ct-shot-error' }, error) : null,
      );
    }

    /* --------------------------------------------------------------- plugin */

    /** Chain selector: route a Session to the tree composer only when it is bound. */
    function selectTreeComposer(owner) {
      try {
        const sessionId = owner && owner.sessionId;
        if (!sessionId) return null;
        const state = store.get();
        const binding = state.data.sessions ? state.data.sessions[sessionId] : null;
        if (binding) return { projectId: binding };
        store.ensureLoaded();
        return null;
      } catch (error) {
        return null;
      }
    }

    function apply(ctx) {
      services.ctx = ctx;
      try {
        services.layout = ctx.get('layout') || null;
      } catch (error) {
        services.layout = null;
      }
      // Load the session bindings early so composer selectors can route correctly.
      store.ensureLoaded();
      store.loadHealth();
      if (!ctx.slots) {
        console.error('[card-tree] the slots service is unavailable');
        store.setSeatIssues(['slots']);
        return;
      }
      // Record seats the running Harness no longer declares, so the panel can say
      // "this build expects a different DSH" instead of silently staying blank.
      // Seats owned by other entries can be declared after this plugin applies
      // (the sidebar and the conversation mount later in the boot sequence), so a
      // seat only counts as missing once a short grace period has passed.
      const pendingSeats = new Set();
      const seatTimers = [];
      function flushSeatIssues() {
        store.setSeatIssues(Array.from(pendingSeats));
      }
      function registerSeat(name, options, component) {
        pendingSeats.add(name);
        const dispose = ctx.slots.inject(name, () => {
          pendingSeats.delete(name);
          flushSeatIssues();
          return ctx.slots.register(Object.assign({ name }, options), component);
        });
        return dispose;
      }
      const disposers = [
        registerSeat('main', { key: PANEL_KEY }, PageRoot),
        registerSeat('sidebar.panellist', { id: PANEL_KEY, order: 30, label: () => t().panelTitle }, PanelIcon),
        registerSeat(
          'conversation.composer',
          { priority: 50, select: selectTreeComposer },
          TreeComposer,
        ),
      ];
      // Re-evaluate after the layout settles, and whenever the slot tree changes.
      for (const delay of [0, 120, 500, 1500, 4000]) {
        seatTimers.push(setTimeout(flushSeatIssues, delay));
      }
      try {
        if (typeof ctx.on === 'function') {
          const off = ctx.on('slots/changed', () => flushSeatIssues());
          if (typeof off === 'function') disposers.push(off);
        }
      } catch (error) {
        /* this build does not publish slot changes as an event */
      }
      return () => {
        for (const timer of seatTimers) clearTimeout(timer);
        for (const dispose of disposers) {
          try {
            if (typeof dispose === 'function') dispose();
          } catch (error) {
            /* the entry is already gone */
          }
        }
      };
    }

    return { inject: ['slots', 'layout'], apply };
  },
});

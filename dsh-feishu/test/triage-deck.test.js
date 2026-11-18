import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  isTriageEligibleSession,
  isHighRiskCommand,
  highlightDangerousCommandHtml,
  extractLastUserPromptAndMedia,
  extractSessionChangedFiles,
  buildTriageCardViewModel,
} from '../../hub/web/src/triage-deck.js';

test('triage-deck 1: isTriageEligibleSession filters strictly to pending approvals and unread conclusions', () => {
  assert.equal(isTriageEligibleSession(null), false);
  assert.equal(
    isTriageEligibleSession({ id: 'run-1', status: 'running', hasUnreadConclusion: true }),
    false,
    'Actively running tasks must never enter the swipe triage deck'
  );
  assert.equal(
    isTriageEligibleSession({
      id: 'app-settling',
      status: 'approval',
      approvalObj: { code: 'A1', settling: true },
    }),
    false,
    'Already-submitted settling approvals must not re-appear in the deck'
  );
  assert.equal(
    isTriageEligibleSession({
      id: 'app-ready',
      status: 'approval',
      approvalObj: { code: 'A2', settling: false },
    }),
    true
  );
  assert.equal(
    isTriageEligibleSession({
      id: 'idle-read',
      status: 'idle',
      hasUnreadConclusion: false,
      isUnreadInterrupted: false,
    }),
    false,
    'Read historical conversations must stay out of the triage deck'
  );
  assert.equal(
    isTriageEligibleSession({
      id: 'idle-unread',
      status: 'idle',
      hasUnreadConclusion: true,
    }),
    true
  );
  assert.equal(
    isTriageEligibleSession({
      id: 'idle-interrupted',
      status: 'idle',
      isUnreadInterrupted: true,
    }),
    true
  );
});

test('triage-deck 2: extractLastUserPromptAndMedia strips mobile upload boilerplate and XML tags cleanly', () => {
  const transcript = [
    {
      role: 'user',
      text: `<USER_REQUEST>帮我看下这张报错截图为什么布局歪了

[手机端上传图片附件 (1 张) — 已保存至本机，请直接读取查看]:
- 📎 手机上传图片 1 (IMG_5989.jpg): /Users/cc/deepseekharness-remote/.dsh-uploads/mobile-1794910-IMG_5989.jpg (备用路径: /tmp/backup.jpg)</USER_REQUEST>`,
    },
    {
      role: 'assistant',
      text: '我看了一下截图，原因是 flex 容器未限制最小宽度。',
    },
  ];

  const info = extractLastUserPromptAndMedia(transcript);
  assert.equal(info.text, '帮我看下这张报错截图为什么布局歪了');
  assert.ok(!info.text.includes('手机端上传图片附件'));
  assert.equal(info.imageCount, 1);
  assert.deepEqual(info.mediaPaths, [
    '/Users/cc/deepseekharness-remote/.dsh-uploads/mobile-1794910-IMG_5989.jpg',
  ]);
});

test('triage-deck 3: extractSessionChangedFiles supports real line counts, tool-call fallback, and zero-file Q&A', () => {
  // Case A: Real changedFiles with +add / -del
  const withDiff = extractSessionChangedFiles({
    changedFiles: [
      { name: 'src/controller.js', path: 'hub/web/src/controller.js', added: 42, removed: 5 },
      { name: 'src/App.tsx', path: 'hub/web/src/App.tsx', added: 2, removed: 0 },
    ],
  });
  assert.equal(withDiff.hasLineCounts, true);
  assert.equal(withDiff.files.length, 2);
  assert.equal(withDiff.totalAdd, 44);
  assert.equal(withDiff.totalDel, 5);

  // Case B: Fallback from Claude/DSH transcript toolCalls
  const fromTools = extractSessionChangedFiles({
    changedFiles: [],
    transcript: [
      {
        role: 'assistant',
        toolCalls: [
          { name: 'read_file', path: '/Users/cc/proj/README.md' },
          { name: 'edit_file', path: '/Users/cc/proj/src/index.js' },
          { name: 'Write', filePath: '/Users/cc/proj/src/helper.js' },
        ],
      },
    ],
  });
  assert.equal(fromTools.hasLineCounts, false);
  assert.equal(fromTools.files.length, 2);
  assert.equal(fromTools.files[0].name, 'src/index.js');
  assert.equal(fromTools.files[1].name, 'src/helper.js');

  // Case C: Pure Q&A session with 0 file edits
  const pureQa = extractSessionChangedFiles({
    changedFiles: [],
    transcript: [{ role: 'user', text: '解释一下什么是 WebRTC' }, { role: 'assistant', text: 'WebRTC 是实时通信协议。' }],
  });
  assert.equal(pureQa.files.length, 0);
});

test('triage-deck 4: high-risk command detection and HTML-safe danger token highlighting', () => {
  assert.equal(isHighRiskCommand('node --test dsh-feishu/test/triage-deck.test.js && npm run build'), false);
  assert.equal(isHighRiskCommand('git status -s'), false);

  assert.equal(isHighRiskCommand('rm -rf dist/ node_modules/.cache'), true);
  assert.equal(isHighRiskCommand('git push origin main --force'), true);
  assert.equal(isHighRiskCommand('npm publish && git push origin --tags'), true);
  assert.equal(isHighRiskCommand('npx prisma db push --accept-data-loss --drop-old-columns'), true);
  assert.equal(isHighRiskCommand('psql -c "DROP TABLE users;"'), true);

  const highlighted = highlightDangerousCommandHtml('rm -rf <build> && git push --force');
  assert.ok(highlighted.includes('&lt;build&gt;'), 'Must HTML-escape raw angle brackets');
  assert.ok(highlighted.includes('<span class="dsh-triage-hl-danger">rm -rf</span>'));
  assert.ok(highlighted.includes('<span class="dsh-triage-hl-danger">--force</span>'));
});

test('triage-deck 5: buildTriageCardViewModel normalizes command approvals, multi-select questions, conclusions, and observe-only sessions', () => {
  // 1. Antigravity command approval with English options
  const cmdVm = buildTriageCardViewModel(
    {
      id: 'agy-1',
      hostId: 'host-air',
      harness: 'antigravity-ide',
      title: 'deepseekharness-remote / v0.7.9 滑卡接入',
      project: 'deepseekharness-remote',
      status: 'approval',
      transcript: [
        { role: 'user', text: '帮我跑一下单元测试' },
        { role: 'assistant', text: '代码已就绪，申请执行单元测试验证。' },
      ],
      approvalObj: {
        code: 'APP01',
        toolName: 'run_command',
        commandLine: 'npm test',
        options: [
          { index: 1, label: 'Yes, allow this time' },
          { index: 2, label: "Yes, and always allow 'npm test' in this conversation" },
          { index: 4, label: 'No, tell the agent what to do instead' },
        ],
      },
    },
    { 'host-air': 'Air' }
  );
  assert.equal(cmdVm.kind, 'approval');
  assert.equal(cmdVm.risk, 'normal');
  assert.equal(cmdVm.title, 'v0.7.9 滑卡接入');
  assert.equal(cmdVm.options.length, 2);
  assert.equal(cmdVm.options[0].label, '1. 本次允许执行');
  assert.equal(cmdVm.options[1].label, "2. 本对话内始终允许 'npm test'");
  assert.equal(cmdVm.denyOptionIndex, 4);
  assert.equal(cmdVm.canCustom, true);

  // 2. Multi-select structured question
  const qVm = buildTriageCardViewModel({
    id: 'codex-q1',
    hostId: 'host-pro',
    harness: 'codex',
    title: '导出范围确认',
    project: 'analytics',
    status: 'approval',
    approvalObj: {
      code: 'Q99',
      kind: 'question',
      questions: [
        {
          id: 'ExportTargets',
          question: '需要导出哪些报表格式？',
          multiSelect: true,
          options: [
            { label: 'CSV 明细表', description: '适合导入 Excel' },
            { label: 'PDF 汇总周报', description: '适合直接发群' },
          ],
        },
      ],
    },
  });
  assert.equal(qVm.kind, 'question');
  assert.equal(qVm.multi, true);
  assert.equal(qVm.qId, 'ExportTargets');
  assert.equal(qVm.options.length, 2);
  assert.equal(qVm.options[0].label, 'A. CSV 明细表');
  assert.equal(qVm.canCustom, true);

  // 3. Observe-only Doubao unread conclusion disables custom prompt input
  const doubaoVm = buildTriageCardViewModel({
    id: 'doubao:conv-1',
    hostId: 'host-air',
    harness: 'doubao',
    controlMode: 'observe-only',
    capabilities: { canSendPrompt: false },
    title: '竞品调研总结',
    project: 'research',
    status: 'idle',
    hasUnreadConclusion: true,
    conclusionSig: 'sig-1',
    transcript: [
      { role: 'user', text: '整理一下移动端卡片交互方案' },
      { role: 'assistant', text: '已为你整理好 3 套主流滑卡交互对比。' },
    ],
  });
  assert.equal(doubaoVm.kind, 'conclusion');
  assert.equal(doubaoVm.options.length, 1);
  assert.equal(doubaoVm.canCustom, false, 'Observe-only sessions must not offer custom prompt input');
});

test('triage-deck 6: compiled production web bundle includes subtle 4-grid entry button and list switch-back button', async () => {
  const indexHtml = await readFile(new URL('../../hub/public/index.html', import.meta.url), 'utf8');
  const jsMatch = /assets\/(index-[^"']+\.js)/.exec(indexHtml);
  const cssMatch = /assets\/(index-[^"']+\.css)/.exec(indexHtml);
  assert.ok(jsMatch?.[1], 'Built index.html must reference compiled JS bundle');
  assert.ok(cssMatch?.[1], 'Built index.html must reference compiled CSS bundle');

  const [jsBundle, cssBundle] = await Promise.all([
    readFile(new URL(`../../hub/public/assets/${jsMatch[1]}`, import.meta.url), 'utf8'),
    readFile(new URL(`../../hub/public/assets/${cssMatch[1]}`, import.meta.url), 'utf8'),
  ]);

  assert.ok(jsBundle.includes('triageGridEntryBtn'), 'Compiled JS must include subtle 4-grid entry button before 全部');
  assert.ok(jsBundle.includes('triageDeckOverlay'), 'Compiled JS must mount TriageDeck overlay');
  assert.ok(jsBundle.includes('triageBackToListBtn'), 'Compiled JS must include switch-back button to List Mode');
  assert.ok(jsBundle.includes('列表模式'), 'Compiled JS must label the switch-back button clearly');
  assert.ok(cssBundle.includes('.triage-grid-entry-btn'), 'Compiled CSS must style the 4-grid square entry button');
  assert.ok(cssBundle.includes('.dsh-triage-overlay'), 'Compiled CSS must style the isolated triage deck overlay');
});

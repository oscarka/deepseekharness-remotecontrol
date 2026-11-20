// Zero-backend interactive sandbox for ?demo=1
// Completely isolated in browser memory — zero network calls, zero localStorage token access, zero real host leakage.

const DEMO_REPO_URL = 'https://github.com/oscarka/pocketagent';
const DEMO_NPX_CMD = 'npx pocketagents';

const DEMO_HTML_PREVIEW = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Mobile Checkout · Live Metrics Preview</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 18px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 16px; margin-bottom: 14px; }
  .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 1.4px; color: #38bdf8; font-weight: 700; }
  h1 { margin: 6px 0 10px; font-size: 20px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .kpi { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 10px; }
  .kpi .v { font-size: 20px; font-weight: 800; color: #34d399; }
  .kpi .l { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .bars { display: flex; align-items: flex-end; gap: 8px; height: 96px; margin-top: 14px; }
  .bar { flex: 1; border-radius: 6px 6px 0 0; background: linear-gradient(180deg, #38bdf8, #2563eb); position: relative; transition: height .25s ease; }
  .bar span { position: absolute; bottom: -18px; left: 0; right: 0; text-align: center; font-size: 10px; color: #94a3b8; }
  .btn { margin-top: 26px; background: #10b981; color: #052e16; border: none; border-radius: 9px; padding: 9px 14px; font-weight: 700; font-size: 13px; cursor: pointer; width: 100%; }
</style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">Live Sandboxed HTML Deliverable</div>
    <h1>Checkout Conversion Funnel</h1>
    <div class="grid">
      <div class="kpi"><div class="v" id="conv">94.8%</div><div class="l">Retry Success</div></div>
      <div class="kpi"><div class="v" id="lat">142ms</div><div class="l">P95 Latency</div></div>
      <div class="kpi"><div class="v">42/42</div><div class="l">E2E Passed</div></div>
    </div>
    <div class="bars" id="bars">
      <div class="bar" style="height:48%"><span>Mon</span></div>
      <div class="bar" style="height:64%"><span>Tue</span></div>
      <div class="bar" style="height:71%"><span>Wed</span></div>
      <div class="bar" style="height:82%"><span>Thu</span></div>
      <div class="bar" style="height:95%"><span>Fri</span></div>
    </div>
    <button class="btn" onclick="var el=document.getElementById('conv');el.textContent=(94.8+Math.random()*3.8).toFixed(1)+'%';">Simulate Live Traffic Burst</button>
  </div>
</body>
</html>`;

const DEMO_WALKTHROUGH_MD = `# Zero-Downtime JWT Key Rotation — Walkthrough

## Summary of Changes
- Added dual-key verification window (\`KID_CURRENT\` + \`KID_PREVIOUS\`) in \`src/auth/jwt-rotation.ts\` so active mobile sessions never drop during key rollover.
- Added sliding-window Redis rate limiter with graceful local fallback when cache is warm-restarting.
- Added 14 unit + integration tests in \`tests/jwt.test.ts\`.

## Verification Results
| Check | Result | Latency |
| --- | --- | --- |
| Dual-key rollover (\`kid-2026-11\` → \`kid-2026-12\`) | ✅ Passed (14/14) | 38 ms |
| Expired signature rejection | ✅ Passed | 11 ms |
| Burst rate limit (120 req/min) | ✅ Passed | 24 ms |

\`\`\`ts
export async function verifyWithKeyring(token: string, keyring: Keyring) {
  const kid = decodeProtectedHeader(token).kid;
  const candidate = keyring.find(k => k.kid === kid) ?? keyring[0];
  return verifyJwtSignature(token, candidate.publicKey);
}
\`\`\`
`;

const DEMO_FILES = {
  'reports/checkout-preview.html': {
    name: 'checkout-preview.html',
    ext: '.html',
    kind: 'text',
    mime: 'text/html',
    content: DEMO_HTML_PREVIEW,
  },
  'docs/walkthrough.md': {
    name: 'walkthrough.md',
    ext: '.md',
    kind: 'text',
    mime: 'text/markdown',
    content: DEMO_WALKTHROUGH_MD,
  },
  'src/billing/webhook.ts': {
    name: 'webhook.ts',
    ext: '.ts',
    kind: 'text',
    mime: 'text/plain',
    content: `import crypto from 'node:crypto';

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  idempotencyTtlSec: number;
}

export async function processStripeWebhook(rawBody: Buffer, sig: string, policy: RetryPolicy) {
  const verified = verifyStripeSignature(rawBody, sig);
  if (!verified) throw new Error('Invalid Stripe webhook signature');

  const event = JSON.parse(rawBody.toString('utf8'));
  const lockKey = \`stripe:evt:\${event.id}\`;
  if (await alreadyProcessed(lockKey, policy.idempotencyTtlSec)) {
    return { status: 'deduplicated', eventId: event.id };
  }

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      await applyInvoiceTransition(event);
      return { status: 'ok', attempt, eventId: event.id };
    } catch (err) {
      if (attempt === policy.maxAttempts) throw err;
      const jitter = Math.floor(Math.random() * 120);
      await new Promise(r => setTimeout(r, policy.baseDelayMs * 2 ** (attempt - 1) + jitter));
    }
  }
}
`,
  },
  'tests/checkout.e2e.test.ts': {
    name: 'checkout.e2e.test.ts',
    ext: '.ts',
    kind: 'text',
    mime: 'text/plain',
    content: `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { processStripeWebhook } from '../src/billing/webhook.js';

describe('Stripe webhook retry policy', () => {
  it('deduplicates duplicate deliveries cleanly', async () => {
    const payload = Buffer.from(JSON.stringify({ id: 'evt_demo_101', type: 'invoice.paid' }));
    const res = await processStripeWebhook(payload, 'valid-sig', {
      maxAttempts: 3,
      baseDelayMs: 25,
      idempotencyTtlSec: 3600,
    });
    assert.equal(res.status, 'ok');
  });
});
`,
  },
  'src/auth/jwt-rotation.ts': {
    name: 'jwt-rotation.ts',
    ext: '.ts',
    kind: 'text',
    mime: 'text/plain',
    content: `export interface SigningKey {
  kid: string;
  publicKey: string;
  notAfter: number;
}

export function selectVerificationKey(kid: string | undefined, keys: SigningKey[]): SigningKey {
  const now = Date.now();
  const active = keys.filter(k => k.notAfter > now);
  const exact = kid ? active.find(k => k.kid === kid) : null;
  if (exact) return exact;
  if (active.length > 0) return active[0];
  throw new Error('No active JWT verification key available');
}
`,
  },
  'tests/jwt.test.ts': {
    name: 'jwt.test.ts',
    ext: '.ts',
    kind: 'text',
    mime: 'text/plain',
    content: `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectVerificationKey } from '../src/auth/jwt-rotation.js';

test('selects matching active kid during dual-key rotation', () => {
  const chosen = selectVerificationKey('kid-2026-12', [
    { kid: 'kid-2026-11', publicKey: 'pub-old', notAfter: Date.now() + 60_000 },
    { kid: 'kid-2026-12', publicKey: 'pub-new', notAfter: Date.now() + 3600_000 },
  ]);
  assert.equal(chosen.kid, 'kid-2026-12');
});
`,
  },
};

function makeAdapters() {
  return [
    { id: 'claude', name: 'Claude Code', available: true, capabilities: { canPrompt: true, canStop: true, canApprove: true, canSteer: false } },
    { id: 'codex', name: 'OpenAI Codex', available: true, capabilities: { canPrompt: true, canStop: true, canApprove: true, canSteer: true } },
    { id: 'antigravity-ide', name: 'Antigravity IDE', available: true, capabilities: { canPrompt: true, canStop: true, canApprove: true, canSteer: true } },
    { id: 'dsh', name: 'DeepSeek Harness', available: true, capabilities: { canPrompt: true, canStop: true, canApprove: true, canSteer: true } },
    { id: 'workbuddy', name: 'WorkBuddy', available: true, capabilities: { canPrompt: true, canStop: true, canApprove: true, canSteer: true } },
  ];
}

export function createDemoHubState(lang = 'en') {
  const zh = lang === 'zh';
  const now = Date.now();
  const min = 60_000;

  const hostOfficeId = 'demo-macbook-office';
  const hostHomeId = 'demo-macmini-home';

  const claudeTaskId = 'demo-claude-webhook';
  const agyTaskId = 'demo-agy-checkout';
  const codexTaskId = 'demo-codex-jwt';
  const dshTaskId = 'demo-dsh-postgres';
  const wbTaskId = 'demo-wb-release';

  return {
    ok: true,
    demoMode: true,
    hubVersion: '0.8.18',
    uiBuild: 'demo',
    activeHostId: hostOfficeId,
    migrations: [],
    shares: [],
    pushSubscriptions: [],
    sessionPinState: {
      [claudeTaskId]: { pinned: true, at: now - 3 * min, source: 'native' },
    },
    sessionReadState: {
      [codexTaskId]: { unread: true, sig: '', at: 1 },
      [wbTaskId]: { unread: false, sig: 'wb-done', at: now - 15 * min },
    },
    hosts: [
      {
        hostId: hostOfficeId,
        hostName: zh ? 'MacBook Pro · 公司' : 'MacBook Pro · Office',
        online: true,
        activelyConnected: true,
        lastSeen: now,
        agentVersion: '0.8.18',
        turboConnected: true,
        turboVersion: '0.8.18',
        pendingCommands: [],
        inflightCommands: [],
        recentResults: [],
        bridgeState: {
          remoteMode: true,
          adapters: makeAdapters(),
          systemTelemetry: {
            power: {
              hasBattery: true,
              percent: 92,
              charging: true,
              icon: '⚡',
              shortLabel: '92% AC',
              label: zh ? '电量 92% · 充电中' : '92% · Charging',
            },
            network: {
              icon: '📶',
              kindLabel: 'Wi-Fi',
              rttMs: 24,
              localIp: '192.168.1.42',
              shortLabel: 'Wi-Fi 24ms',
              label: 'Wi-Fi (192.168.1.42) · 24ms',
            },
          },
          approvals: [
            {
              code: 'DEMO01',
              agentId: claudeTaskId,
              harness: 'claude',
              project: 'payment-api',
              title: zh ? '执行 Stripe E2E 测试套件' : 'Run Stripe E2E test suite',
              kind: 'command',
              toolName: 'Bash',
              command: 'npm run test:e2e -- --grep stripe-retry',
              commandLine: 'npm run test:e2e -- --grep stripe-retry',
              reason: zh
                ? '验证 Stripe 支付回调幂等锁与指数退避重试逻辑（共 42 项 E2E 用例）'
                : 'Verify Stripe webhook idempotency lock & exponential backoff retries (42 E2E tests)',
              options: [
                { index: 1, label: zh ? '1. 本次允许执行' : '1. Allow this time' },
                { index: 2, label: zh ? '2. 本对话内始终允许 npm test' : "2. Always allow 'npm test' in this chat" },
              ],
              createdAt: now - 90_000,
            },
            {
              code: 'DEMO02',
              agentId: agyTaskId,
              harness: 'antigravity-ide',
              project: 'checkout-ui',
              title: zh ? '离线购物车恢复方案' : 'Offline Cart Recovery',
              kind: 'question',
              toolName: 'ask_user_question',
              promptTitle: zh ? '架构选型确认 · 购物车断网恢复方案' : 'Architecture Choice · Offline Cart Recovery',
              questions: [
                {
                  id: 'cache_strategy',
                  header: zh ? '存储方案' : 'Storage Strategy',
                  question: zh
                    ? '移动端结账页在弱网切后台时，应该采用哪种购物车状态恢复策略？'
                    : 'Which state persistence strategy should mobile checkout use across offline transitions?',
                  multiSelect: false,
                  options: [
                    {
                      label: zh ? 'IndexedDB + 乐观队列同步（推荐）' : 'IndexedDB + optimistic sync queue (Recommended)',
                      description: zh
                        ? '支持离线恢复优惠券与地址草稿，弱网重连后自动幂等回放'
                        : 'Preserves coupons & shipping drafts offline and replays idempotently on reconnect',
                    },
                    {
                      label: zh ? '仅 localStorage 轻量缓存' : 'localStorage lightweight cache only',
                      description: zh
                        ? '实现最简单，但大购物车草稿在 Safari 隐私模式下可能受限'
                        : 'Minimal code footprint, but tighter quota limits in Safari private tabs',
                    },
                    {
                      label: zh ? '完全依赖服务端 Session Cookie' : 'Server-side session cookie only',
                      description: zh
                        ? '零本地存储，但进地铁断网时刷新页面会丢失未提交修改'
                        : 'Zero client storage, but unsaved edits reset on subway disconnects',
                    },
                  ],
                },
              ],
              createdAt: now - 2 * min,
            },
          ],
          tasks: [
            {
              id: claudeTaskId,
              harness: 'claude',
              title: zh ? '重构 Stripe 支付回调重试并跑全量 E2E' : 'Migrate Stripe webhook retries & run E2E suite',
              project: 'payment-api',
              cwd: '/workspace/payment-api',
              status: 'approval',
              pinned: true,
              updatedAt: now - 45_000,
              model: 'sonnet',
              changedFiles: [
                { path: '/workspace/payment-api/src/billing/webhook.ts', name: 'src/billing/webhook.ts', added: 84, removed: 19 },
                { path: '/workspace/payment-api/tests/checkout.e2e.test.ts', name: 'tests/checkout.e2e.test.ts', added: 62, removed: 8 },
              ],
              transcript: [
                {
                  role: 'user',
                  at: now - 5 * min,
                  text: zh
                    ? '帮我重构 Stripe webhook 回调处理：加上幂等去重锁和指数退避重试，然后跑一遍 E2E 测试确认没有回归。'
                    : 'Refactor the Stripe webhook handler with an idempotency lock and exponential backoff retries, then run the E2E suite.',
                },
                {
                  role: 'assistant',
                  at: now - 2 * min,
                  thinking: zh
                    ? '已定位到 src/billing/webhook.ts 缺少幂等事件 ID 校验，在高并发重试时会重复触发状态机。正在补齐 Redis 幂等锁与抖动退避，并新增 12 条 E2E 回归用例。'
                    : 'Found duplicate state transitions in src/billing/webhook.ts under concurrent retries. Implementing event-ID idempotency lock + jittered backoff and adding E2E coverage.',
                  tools: [
                    { name: 'edit_file', summary: 'src/billing/webhook.ts (+84/-19)' },
                    { name: 'edit_file', summary: 'tests/checkout.e2e.test.ts (+62/-8)' },
                  ],
                  text: zh
                    ? '已完成 `src/billing/webhook.ts` 的幂等锁与指数退避重构，并补齐了 `tests/checkout.e2e.test.ts`。\n\n接下来准备运行 E2E 测试套件，请在手机上点一下批准执行 👇'
                    : 'Updated `src/billing/webhook.ts` with idempotency deduplication and jittered exponential backoff, and added test coverage in `tests/checkout.e2e.test.ts`.\n\nReady to execute the E2E suite — tap **Approve** on your phone to continue 👇',
                },
              ],
            },
            {
              id: agyTaskId,
              harness: 'antigravity-ide',
              title: zh ? '重构移动端结账页与交互指标看板' : 'Redesign mobile checkout & live metrics preview',
              project: 'checkout-ui',
              cwd: '/workspace/checkout-ui',
              status: 'approval',
              updatedAt: now - 2 * min,
              model: 'MODEL_PLACEHOLDER_M417',
              artifacts: [
                {
                  name: 'checkout-preview.html',
                  path: '/workspace/checkout-ui/reports/checkout-preview.html',
                  kind: 'html',
                },
              ],
              changedFiles: [
                { path: '/workspace/checkout-ui/reports/checkout-preview.html', name: 'reports/checkout-preview.html', added: 76, removed: 0 },
              ],
              transcript: [
                {
                  role: 'user',
                  at: now - 9 * min,
                  text: zh
                    ? '把结账页转化指标做成一个可交互 HTML 预览页，另外帮我评估离线购物车恢复方案。'
                    : 'Build an interactive HTML preview of the checkout funnel metrics and propose an offline cart recovery strategy.',
                },
                {
                  role: 'assistant',
                  at: now - 2 * min,
                  text: zh
                    ? '已生成可交互预览页面 [checkout-preview.html](file:///workspace/checkout-ui/reports/checkout-preview.html)，点击即可直接在手机沙盒里渲染与交互。\n\n在写持久化层之前，请先确认下面 3 个缓存方案中的一项：'
                    : 'Generated the interactive live dashboard [checkout-preview.html](file:///workspace/checkout-ui/reports/checkout-preview.html) — tap to render & interact right inside your mobile console.\n\nBefore writing the persistence layer, pick your preferred cart recovery strategy below:',
                  artifacts: [
                    {
                      name: 'checkout-preview.html',
                      path: '/workspace/checkout-ui/reports/checkout-preview.html',
                      kind: 'html',
                    },
                  ],
                },
              ],
            },
            {
              id: dshTaskId,
              harness: 'dsh',
              title: zh ? '优化 Postgres 慢查询并补齐联合索引' : 'Optimize Postgres slow queries & covering indexes',
              project: 'analytics-pipeline',
              cwd: '/workspace/analytics-pipeline',
              status: 'running',
              updatedAt: now - 15_000,
              model: 'deepseek-account::deepseek-reasoner',
              transcript: [
                {
                  role: 'user',
                  at: now - 4 * min,
                  text: zh
                    ? '排查 dashboard 聚合接口 P99 超过 1.8 秒的问题，给出覆盖索引方案并压测对比。'
                    : 'Diagnose why the dashboard rollup endpoint P99 exceeds 1.8s, add covering indexes, and benchmark before/after.',
                },
                {
                  role: 'assistant',
                  at: now - 15_000,
                  thinking: zh
                    ? 'EXPLAIN ANALYZE 显示 events_daily 正在按 workspace_id + created_at 全表顺序扫描（184 万行）。正在生成 CONCURRENTLY 覆盖索引迁移脚本并跑回归基准...'
                    : 'EXPLAIN ANALYZE shows a sequential scan over 1.84M rows on events_daily(workspace_id, created_at). Generating CONCURRENTLY covering index migration and benchmarking...',
                  tools: [
                    { name: 'run_command', summary: 'psql -c "EXPLAIN ANALYZE SELECT ..."' },
                    { name: 'write_file', summary: 'migrations/20261119_covering_idx.sql' },
                  ],
                  text: zh
                    ? '正在电脑上实时压测新的覆盖索引（预计 P99 将从 `1,840ms` 降至 `42ms`），你可以随时输入插话指令或点下方「停止」…'
                    : 'Running live benchmark on the new covering index on your Mac (projected P99 drop: `1,840ms` → `42ms`). Send a mid-run steer message or tap **Stop** anytime…',
                },
              ],
            },
          ],
        },
      },
      {
        hostId: hostHomeId,
        hostName: zh ? 'Mac mini · 家里主机' : 'Mac mini · Home',
        online: true,
        activelyConnected: true,
        lastSeen: now,
        agentVersion: '0.8.18',
        turboConnected: true,
        turboVersion: '0.8.18',
        pendingCommands: [],
        inflightCommands: [],
        recentResults: [],
        bridgeState: {
          remoteMode: true,
          adapters: makeAdapters(),
          systemTelemetry: {
            power: {
              hasBattery: false,
              icon: '🔌',
              shortLabel: zh ? '电源直供' : 'AC Power',
              label: zh ? '交流电源直供' : 'AC Power (Desktop)',
            },
            network: {
              icon: '🌐',
              kindLabel: 'Ethernet',
              rttMs: 14,
              localIp: '192.168.1.88',
              shortLabel: 'Ethernet 14ms',
              label: 'Ethernet (192.168.1.88) · 14ms',
            },
          },
          approvals: [],
          tasks: [
            {
              id: codexTaskId,
              harness: 'codex',
              title: zh ? '无停机 JWT 密钥轮换与限流中间件' : 'Zero-downtime JWT key rotation & rate limiter',
              project: 'auth-gateway',
              cwd: '/workspace/auth-gateway',
              status: 'idle',
              turnState: 'conclusion',
              updatedAt: now - 3 * min,
              lastConclusionAt: now - 3 * min,
              conclusionSig: 'codex-jwt-conclusion-v1',
              model: 'gpt-5.4',
              artifacts: [
                {
                  name: 'walkthrough.md',
                  path: '/workspace/auth-gateway/docs/walkthrough.md',
                  kind: 'markdown',
                },
              ],
              changedFiles: [
                { path: '/workspace/auth-gateway/src/auth/jwt-rotation.ts', name: 'src/auth/jwt-rotation.ts', added: 118, removed: 24 },
                { path: '/workspace/auth-gateway/tests/jwt.test.ts', name: 'tests/jwt.test.ts', added: 49, removed: 0 },
              ],
              transcript: [
                {
                  role: 'user',
                  at: now - 12 * min,
                  text: zh
                    ? '实现双密钥窗口 JWT 轮换和滑动窗口限流，跑完所有测试后输出一份 walkthrough 总结。'
                    : 'Implement dual-key JWT rotation plus sliding-window rate limiting, run all tests, and write a walkthrough summary.',
                },
                {
                  role: 'assistant',
                  at: now - 3 * min,
                  text: zh
                    ? '✅ 全部完成并通过 **14/14** 单元测试！\n\n### 核心改动\n1. 在 `src/auth/jwt-rotation.ts` 实现 `KID_CURRENT` + `KID_PREVIOUS` 双密钥验签窗口，轮换期间已登录手机端零掉线。\n2. 补齐 120 req/min 滑动窗口限流与 Redis 重启降级保护。\n3. 完整验证报告见 [walkthrough.md](file:///workspace/auth-gateway/docs/walkthrough.md)（点击即可全屏阅读，也可点右上角 `🔊 播报` 语音听总结）。'
                    : '✅ All done — **14/14** unit & integration tests passed!\n\n### Key Changes\n1. Added dual-key verification window (`KID_CURRENT` + `KID_PREVIOUS`) in `src/auth/jwt-rotation.ts` for zero-downtime key rollover.\n2. Added 120 req/min sliding-window rate limiter with automatic local fallback.\n3. Full verification report ready in [walkthrough.md](file:///workspace/auth-gateway/docs/walkthrough.md) — tap to inspect, or tap `🔊 Listen` to hear the summary.',
                  artifacts: [
                    {
                      name: 'walkthrough.md',
                      path: '/workspace/auth-gateway/docs/walkthrough.md',
                      kind: 'markdown',
                    },
                  ],
                },
              ],
            },
            {
              id: wbTaskId,
              harness: 'workbuddy',
              title: zh ? '整理 v2.4 中英双语发布日志与上线清单' : 'Draft v2.4 bilingual changelog & release checklist',
              project: 'release-notes-bot',
              cwd: '/workspace/release-notes-bot',
              status: 'idle',
              updatedAt: now - 18 * min,
              lastConclusionAt: now - 18 * min,
              conclusionSig: 'wb-done',
              model: 'deepseek-v3.1',
              transcript: [
                {
                  role: 'user',
                  at: now - 22 * min,
                  text: zh
                    ? '根据最近 15 条 commit 整理 v2.4 中英文 Release Notes。'
                    : 'Draft bilingual v2.4 Release Notes from the last 15 commits.',
                },
                {
                  role: 'assistant',
                  at: now - 18 * min,
                  text: zh
                    ? '已整理完毕并生成中英双语发布说明，所有 PR 编号与破坏性变更均已核对无误。'
                    : 'Bilingual v2.4 release notes drafted with all PR links and breaking-change checks verified.',
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

export function createDemoSandbox({ getHubState, setHubState, getLang, onStateMutated, showToast }) {
  let seq = 1;

  function findHostAndTask(hostId, agentId) {
    const state = getHubState();
    const host = (state.hosts || []).find(h => h.hostId === hostId) || (state.hosts || [])[0];
    if (!host) return { state, host: null, task: null };
    const tasks = host.bridgeState?.tasks || [];
    const task = agentId ? tasks.find(t => t.id === agentId) : tasks[0];
    return { state, host, task };
  }

  function resolveDemoFile(relPath = '') {
    const clean = String(relPath || '')
      .replace(/^file:\/\//i, '')
      .replace(/^\/workspace\/[^/]+\//, '')
      .replace(/^\/+/, '');
    if (DEMO_FILES[clean]) return { relPath: clean, ...DEMO_FILES[clean] };
    const byEnd = Object.entries(DEMO_FILES).find(([k]) => clean.endsWith(k) || k.endsWith(clean));
    if (byEnd) return { relPath: byEnd[0], ...byEnd[1] };
    return {
      relPath: clean || 'README.md',
      name: (clean.split('/').pop() || 'README.md'),
      ext: '.md',
      kind: 'text',
      mime: 'text/markdown',
      content: DEMO_WALKTHROUGH_MD,
    };
  }

  function buildDemoDirEntries(subDir = '') {
    const cleanSub = String(subDir || '').replace(/^\/+|\/+$/g, '');
    if (!cleanSub) {
      return [
        { name: 'src', relPath: 'src', isDirectory: true, size: 0 },
        { name: 'tests', relPath: 'tests', isDirectory: true, size: 0 },
        { name: 'docs', relPath: 'docs', isDirectory: true, size: 0 },
        { name: 'reports', relPath: 'reports', isDirectory: true, size: 0 },
      ];
    }
    const prefix = cleanSub + '/';
    const seenDirs = new Set();
    const out = [];
    for (const [k, meta] of Object.entries(DEMO_FILES)) {
      if (!k.startsWith(prefix)) continue;
      const rest = k.slice(prefix.length);
      if (rest.includes('/')) {
        const sub = rest.split('/')[0];
        if (!seenDirs.has(sub)) {
          seenDirs.add(sub);
          out.push({ name: sub, relPath: `${cleanSub}/${sub}`, isDirectory: true, size: 0 });
        }
      } else {
        out.push({
          name: rest,
          relPath: k,
          isDirectory: false,
          size: meta.content.length,
        });
      }
    }
    return out;
  }

  function handleCommand(hostId, payload = {}) {
    const zh = getLang() === 'zh';
    const { host, task } = findHostAndTask(hostId, payload.agentId);
    const type = String(payload.type || '');

    if (type === 'approval' && host) {
      const approvals = host.bridgeState?.approvals || [];
      const idx = approvals.findIndex(a => a.code === payload.code || (payload.agentId && a.agentId === payload.agentId));
      const matched = idx >= 0 ? approvals[idx] : null;
      if (idx >= 0) approvals.splice(idx, 1);

      const targetTask = task || (matched ? (host.bridgeState?.tasks || []).find(t => t.id === matched.agentId) : null);
      if (targetTask) {
        const allow = payload.allow !== false;
        const chosenAnswer = payload.answers && typeof payload.answers === 'object'
          ? Object.values(payload.answers).flat().filter(Boolean).join(', ')
          : '';
        targetTask.status = allow ? 'running' : 'idle';
        targetTask.updatedAt = Date.now();
        targetTask.transcript = targetTask.transcript || [];
        targetTask.transcript.push({
          role: 'user',
          at: Date.now(),
          text: chosenAnswer
            ? (zh ? `已选择方案：${chosenAnswer}` : `Selected option: ${chosenAnswer}`)
            : allow
              ? (zh ? '✅ 已在手机端批准执行' : '✅ Approved from mobile console')
              : (zh ? '🚫 已拒绝该命令' : '🚫 Denied command'),
        });
        onStateMutated();

        if (allow) {
          setTimeout(() => {
            targetTask.status = 'idle';
            targetTask.updatedAt = Date.now();
            targetTask.lastConclusionAt = Date.now();
            targetTask.conclusionSig = `demo-done-${Date.now()}`;
            targetTask.transcript.push({
              role: 'assistant',
              at: Date.now(),
              text: chosenAnswer
                ? (zh
                  ? `✅ 已按「${chosenAnswer}」完成持久化层实现，42/42 项结账流程 E2E 全部通过！`
                  : `✅ Implemented persistence layer with **${chosenAnswer}** — all 42/42 checkout E2E checks passed!`)
                : (zh
                  ? '✅ 命令执行完毕：**42/42** 项 Stripe Webhook 回归测试全部通过（耗时 `1.4s`），无报错！'
                  : '✅ Command finished: **42/42** Stripe webhook retry E2E tests passed in `1.4s` with zero regressions!'),
            });
            onStateMutated();
            showToast(zh ? '🎉 电脑端任务已完成并同步结论' : '🎉 Computer finished the task & synced results');
          }, 950);
        }
      }
      return { ok: true, demo: true };
    }

    if ((type === 'prompt' || type === 'steer') && task) {
      const text = String(payload.text || payload.prompt || '').trim();
      if (text) {
        task.transcript = task.transcript || [];
        task.transcript.push({ role: 'user', at: Date.now(), text });
        task.status = 'running';
        task.updatedAt = Date.now();
        onStateMutated();

        setTimeout(() => {
          task.status = 'idle';
          task.updatedAt = Date.now();
          task.lastConclusionAt = Date.now();
          task.conclusionSig = `demo-reply-${Date.now()}`;
          task.transcript.push({
            role: 'assistant',
            at: Date.now(),
            text: zh
              ? `✨ [交互演示回复] 已收到你在手机上发送的指令：「${text}」。\n\n在真实连接你自己的电脑后，这条消息会直接驱动本机的 **Claude Code / Codex / Antigravity / DSH** 执行并实时回传代码改动。运行 \`${DEMO_NPX_CMD}\` 即可 5 秒连上你自己的电脑！`
              : `✨ [Interactive Demo Reply] Received your mobile prompt: "${text}".\n\nWhen connected to your real Mac/Linux host, this steers your local **Claude Code / Codex / Antigravity / DSH** session live. Run \`${DEMO_NPX_CMD}\` to try it on your own machine in 5 seconds!`,
          });
          onStateMutated();
        }, 850);
      }
      return { ok: true, demo: true };
    }

    if (type === 'stop' && task) {
      task.status = 'idle';
      task.updatedAt = Date.now();
      task.transcript = task.transcript || [];
      task.transcript.push({
        role: 'assistant',
        at: Date.now(),
        text: zh ? '⏹ 任务已在手机端紧急叫停。' : '⏹ Task stopped immediately from your phone.',
      });
      onStateMutated();
      return { ok: true, demo: true };
    }

    if (type === 'new_task' && host) {
      const promptText = String(payload.prompt || payload.text || '').trim() || (zh ? '检查项目状态' : 'Check project status');
      const harness = String(payload.harness || 'claude');
      const newId = `demo-new-${Date.now()}-${seq++}`;
      const cwd = String(payload.cwd || '/workspace/payment-api');
      const project = cwd.split('/').filter(Boolean).pop() || 'workspace';
      const newTask = {
        id: newId,
        harness,
        title: promptText.slice(0, 48),
        project,
        cwd,
        status: 'running',
        updatedAt: Date.now(),
        transcript: [{ role: 'user', at: Date.now(), text: promptText }],
      };
      host.bridgeState.tasks.unshift(newTask);
      onStateMutated();
      setTimeout(() => {
        newTask.status = 'idle';
        newTask.updatedAt = Date.now();
        newTask.lastConclusionAt = Date.now();
        newTask.conclusionSig = `demo-new-${Date.now()}`;
        newTask.transcript.push({
          role: 'assistant',
          at: Date.now(),
          text: zh
            ? `🚀 已在 **${host.hostName}** 上启动新的演示会话！真实部署后，你可以在地铁或咖啡馆里直接远程拉起任意电脑上的 AI 编程任务。`
            : `🚀 Started a fresh demo task on **${host.hostName}**! With your real host connected, you can kick off new coding tasks on any machine right from your phone.`,
        });
        onStateMutated();
      }, 800);
      return { ok: true, sessionId: newId, demo: true };
    }

    return { ok: true, demo: true };
  }

  function handleApiFetch(rawPath, options = {}) {
    const u = new URL(String(rawPath || '/'), location.origin);
    const pathname = u.pathname;
    const method = String(options.method || 'GET').toUpperCase();
    const jsonResp = (data, status = 200) =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: async () => data,
        text: async () => JSON.stringify(data),
      });

    if (pathname === '/api/auth/verify') {
      return jsonResp({ ok: true, authRequired: false, demoMode: true });
    }
    if (pathname === '/api/state') {
      return jsonResp(getHubState());
    }
    if (pathname === '/api/sessions/read' || pathname === '/api/sessions/pin') {
      return jsonResp({ ok: true, demo: true });
    }
    if (/^\/api\/hosts\/[^/]+\/command$/.test(pathname) && method === 'POST') {
      const hostId = decodeURIComponent(pathname.split('/')[3] || '');
      let body = {};
      try { body = JSON.parse(options.body || '{}'); } catch { }
      return jsonResp(handleCommand(hostId, body));
    }
    if (/^\/api\/hosts\/[^/]+\/fs\/read$/.test(pathname)) {
      const rel = u.searchParams.get('path') || '';
      const file = resolveDemoFile(rel);
      return jsonResp({
        ok: true,
        ...file,
        size: file.content.length,
      });
    }
    if (/^\/api\/hosts\/[^/]+\/fs\/list$/.test(pathname)) {
      const subDir = u.searchParams.get('subDir') || u.searchParams.get('path') || '';
      return jsonResp({
        ok: true,
        cwd: '/workspace/payment-api',
        subDir,
        entries: buildDemoDirEntries(subDir),
      });
    }
    if (pathname === '/api/pairing/create') {
      const zh = getLang() === 'zh';
      showToast(zh ? `✨ 体验模式：运行 ${DEMO_NPX_CMD} 即可在本机生成真实扫码二维码` : `✨ Demo mode: run "${DEMO_NPX_CMD}" to generate a real QR code for your Mac`);
      return jsonResp({
        ok: true,
        code: 'DEMO99',
        expiresAt: Date.now() + 10 * 60_000,
      });
    }
    return jsonResp({ ok: true, demo: true });
  }

  function reset() {
    setHubState(createDemoHubState(getLang()));
    onStateMutated();
    showToast(getLang() === 'zh' ? '🔄 已重置交互演示数据' : '🔄 Interactive demo state reset');
  }

  function copyNpxCommand() {
    try {
      if (navigator?.clipboard?.writeText) {
        void navigator.clipboard.writeText(DEMO_NPX_CMD);
      }
    } catch { }
    showToast(
      getLang() === 'zh'
        ? `📋 已复制：${DEMO_NPX_CMD}（在电脑终端粘贴运行）`
        : `📋 Copied: ${DEMO_NPX_CMD} — paste in your terminal!`,
    );
  }

  return {
    handleApiFetch,
    reset,
    copyNpxCommand,
    repoUrl: DEMO_REPO_URL,
    npxCmd: DEMO_NPX_CMD,
  };
}

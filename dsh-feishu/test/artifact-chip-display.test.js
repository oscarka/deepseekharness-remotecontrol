import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  buildArtifactDescriptor,
  parseAntigravityTranscript,
} from '../lib/antigravity-ide.js'

async function loadMarkdownModule() {
  const mdSource = await readFile(
    new URL('../../hub/web/src/utils/markdown.ts', import.meta.url),
    'utf8',
  )
  const esc = s =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const cleanMd = mdSource
    .replace(/^import\s+.*$/gm, '')
    .replace(/export function /g, 'function ')
    .replace(/\(window as any\)/g, 'window')
    .replace(/: \{ type: 'ul' \| 'ol'; start\?: number; items: string\[\] \} \| null/g, '')
    .replace(/: RegExpExecArray \| null/g, '')
    .replace(/: string\[\]\[\]/g, '')
    .replace(/: string\[\]/g, '')
    .replace(/: 'th' \| 'td'/g, '')
    .replace(/: number/g, '')
    .replace(/: string/g, '')
    .replace(/: any/g, '')
    .replace(/olItem!\[2\]/g, 'olItem[2]')

  const fn = new Function(
    'window',
    'esc',
    `${cleanMd}\nreturn { renderInlineMarkdown, formatAssistantText, stripRedundantInjectedArtifactBlocks };`,
  )
  return fn({}, esc)
}

test('artifact-display 1: buildArtifactDescriptor & parseAntigravityTranscript do not duplicate custom report filenames or inject mid-turn duplicate blocks', () => {
  const reportPath =
    '/Users/cc/.gemini/antigravity/brain/conv-1/final_full_regression_report.md'
  const desc = buildArtifactDescriptor(reportPath, {
    Summary: '微健管全链路修复与体验升级后的最终线上总回归验收报告。',
  })
  assert.equal(desc.kind, 'artifact')
  assert.equal(desc.title, '交付文档', 'Custom markdown report title must not duplicate filename stem')
  assert.equal(desc.name, 'final_full_regression_report.md')

  const nowIso = new Date().toISOString()
  const jsonl = [
    JSON.stringify({
      step_index: 1,
      type: 'USER_INPUT',
      status: 'DONE',
      created_at: nowIso,
      content: '跑一下全量回归测试并给我报告',
    }),
    // Step 2 writes final_full_regression_report.md before the final prose paragraph
    JSON.stringify({
      step_index: 2,
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: nowIso,
      content: '4 位患者 × 14 天全量回归已全部跑通且页面 0 报错！',
      tool_calls: [
        {
          id: 'tc-1',
          name: 'write_file',
          arguments: JSON.stringify({
            Path: reportPath,
            Content: '# Report\n',
            Overwrite: true,
            ArtifactMetadata: {
              Summary: '微健管全链路修复与体验升级后的最终线上总回归验收报告。',
              UserFacing: true,
              RequestFeedback: false,
            },
          }),
        },
      ],
    }),
    // Step 3 naturally mentions [final_full_regression_report.md](file://...) in prose
    JSON.stringify({
      step_index: 3,
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: nowIso,
      content: `最终全量线上回归已全部通过，完整验收指标已整理在 [final_full_regression_report.md](file://${reportPath}) 中供您查阅。`,
    }),
  ].join('\n')

  const parsed = parseAntigravityTranscript(jsonl, { conversationId: 'conv-1' })
  const asst = parsed.transcript.find(m => m.role === 'assistant')
  assert.ok(asst)
  // Must NOT contain legacy "final_full_regression_report: final_full_regression_report.md" or orphan 📋
  assert.doesNotMatch(asst.text, /final_full_regression_report:\s*final_full_regression_report\.md/)
  assert.doesNotMatch(asst.text, /📋\s*\*\*\[/)
  // Must only link final_full_regression_report.md ONCE in the natural prose sentence
  const occurrences = asst.text.split('final_full_regression_report.md').length - 1
  assert.equal(occurrences, 2, 'Should only appear in [label](path) of the single prose link')
  assert.equal(asst.artifacts.length, 1)
  assert.equal(asst.artifacts[0].title, '交付文档')
})

test('artifact-display 2: frontend formatAssistantText cleans legacy remote-host duplicate 📋 **[stem: stem.md]** blocks and wraps chip labels for CSS ellipsis', async () => {
  const { renderInlineMarkdown, formatAssistantText } = await loadMarkdownModule()
  const reportPath =
    '/Users/cua/.gemini/antigravity/brain/conv-9/final_full_regression_report.md'

  // Simulate exact legacy payload sent by a remote computer (cua-laptop) running an older daemon:
  const legacyText = [
    '4 位患者 × 14 天全量回归已全部跑通且页面 0 报错！',
    '',
    `📋 **[final_full_regression_report: final_full_regression_report.md](file://${reportPath})**\n> 微健管全链路修复与体验升级后的最终线上总回归验收报告（涵盖 4 位真实患者 × 14 天全页面闭环）。`,
    '',
    `最终全量线上回归已全部通过，完整验收指标和 6 张实拍对比图已整理在 [final_full_regression_report.md](file://${reportPath}) 中供您查阅。`,
  ].join('\n')

  const html = formatAssistantText(legacyText, [
    { path: reportPath, name: 'final_full_regression_report.md' },
  ])

  // 1) Legacy injected middle block + duplicate blockquote must be completely stripped
  assert.doesNotMatch(html, /final_full_regression_report:\s*final_full_regression_report/)
  assert.doesNotMatch(html, /<blockquote>/)
  assert.doesNotMatch(html, /📋/)

  // 2) Remaining inline chip uses inner .md-file-chip-label span so CSS text-overflow: ellipsis works properly
  assert.match(
    html,
    /<span class="md-file-chip-icon">📄<\/span><span class="md-file-chip-label">final_full_regression_report\.md<\/span>/,
  )

  // 3) Even if a standalone legacy "[stem: stem.md](file://...)" link appears without msgArtifacts, label & orphan 📋 are cleaned
  const standaloneHtml = renderInlineMarkdown(
    `📋 **[very_long_custom_report_name: very_long_custom_report_name.md](file://${reportPath})**`,
  )
  assert.doesNotMatch(standaloneHtml, /📋/)
  assert.match(
    standaloneHtml,
    /<span class="md-file-chip-label">very_long_custom_report_name\.md<\/span>/,
  )
})

test('artifact-display 3: controller & CSS enforce per-session image attachment drafts, image long-press save, and non-selectable breadcrumbs', async () => {
  const ctrlSrc = await readFile(
    new URL('../../hub/web/src/controller.js', import.meta.url),
    'utf8',
  )
  const cssSrc = await readFile(
    new URL('../../hub/web/src/styles/app.css', import.meta.url),
    'utf8',
  )

  // Per-session chat attachment isolation
  assert.match(ctrlSrc, /const chatAttachmentsBySession = new Map\(\)/)
  assert.match(ctrlSrc, /persistChatAttachmentsDraft\(composerSessionId\)/)
  assert.doesNotMatch(ctrlSrc, /composerAttachments\.chat\b/)

  // Standalone PWA image long-press save + sheet swipe-dismiss image exclusion + 1-tap save button
  assert.match(ctrlSrc, /function setupStandaloneImageLongPressSave\(\)/)
  assert.match(ctrlSrc, /closest\('img, video, iframe, pre, code, \.file-preview-body'\)/)
  assert.match(ctrlSrc, /⬇️ 保存图片/)

  // Breadcrumbs & icon-pill-btn anti-selection + saveable-preview-img callout enabled
  assert.match(cssSrc, /\.saveable-preview-img[\s\S]*?-webkit-touch-callout:\s*default\s*!important/)
  assert.match(cssSrc, /\.breadcrumbs-bar[\s\S]*?-webkit-user-select:\s*none/)
})


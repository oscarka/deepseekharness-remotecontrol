import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  isMarkdownFileName,
  guessExportMimeByName,
  isTextLikeMime,
  buildExportHtmlFileName,
  describeFileKindLabel,
  stripMarkdownToPlainText,
  sanitizeExportedBodyHtml,
  buildStandaloneMarkdownHtml,
} from '../../hub/web/src/utils/fileExport.ts'
import { renderMarkdown } from '../../hub/web/src/utils/markdown.ts'
import { prepareWorkspaceFileStream } from '../lib/workspace-ops.js'
import { translateZhStringToEn } from '../../hub/web/src/utils/i18n.js'

test('fileExport MIME & filename helpers cover documents, code, office, and media cleanly', () => {
  assert.equal(isMarkdownFileName('algo_voice_transcripts.md'), true)
  assert.equal(isMarkdownFileName('docs/README.MDX'), true)
  assert.equal(isMarkdownFileName('server.mjs'), false)

  assert.equal(guessExportMimeByName('algo_voice_transcripts.md'), 'text/markdown')
  assert.equal(guessExportMimeByName('report.html?mt=abc'), 'text/html')
  assert.equal(guessExportMimeByName('config.json'), 'application/json')
  assert.equal(guessExportMimeByName('metrics.csv'), 'text/csv')
  assert.equal(guessExportMimeByName('spec.pdf'), 'application/pdf')
  assert.equal(guessExportMimeByName('deck.pptx'), 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
  assert.equal(guessExportMimeByName('script.ts'), 'text/plain')
  assert.equal(guessExportMimeByName('shot.png'), 'image/png')
  assert.equal(guessExportMimeByName('demo.mp4'), 'video/mp4')
  assert.equal(guessExportMimeByName('noext'), 'application/octet-stream')

  assert.equal(isTextLikeMime('text/markdown'), true)
  assert.equal(isTextLikeMime('application/json; charset=utf-8'), true)
  assert.equal(isTextLikeMime('application/pdf'), false)

  assert.equal(buildExportHtmlFileName('algo_voice_transcripts.md'), 'algo_voice_transcripts.html')
  assert.equal(buildExportHtmlFileName('/tmp/notes/plan.markdown'), 'plan.html')
  assert.equal(buildExportHtmlFileName('README'), 'README.html')

  assert.equal(describeFileKindLabel('algo_voice_transcripts.md', 'text'), 'Markdown 文档')
  assert.equal(describeFileKindLabel('index.html', 'text'), 'HTML 网页')
  assert.equal(describeFileKindLabel('controller.js', 'text'), '源码文件')
})

test('stripMarkdownToPlainText converts Markdown into clean paste-ready plain text', () => {
  const sample = [
    '# 纯算法语音清洗对照稿',
    '',
    '测试脚本：[algo_speech_pipeline.mjs](file:///Users/cc/repo/algo_speech_pipeline.mjs)',
    '官网文档：[PocketAgents](https://harness.agentrun.vip) 与 **核心指标** `6.7ms`',
    '',
    '> [!NOTE] 这是一段引用说明',
    '> 第二行引用内容',
    '',
    '| 项目 | 耗时 |',
    '| :--- | ---: |',
    '| 语音清洗 | `6.7ms` |',
    '',
    '- [x] 已完成本地验证',
    '- 普通列表项 *斜体* 和 ~~删除线~~',
    '',
    '```js',
    'const ms = 6.7',
    '```',
    '',
    '<plugin-card catalog-id="antigravity-plugins-partners/plugin/cloudflare"></plugin-card>',
  ].join('\n')

  const plain = stripMarkdownToPlainText(sample)
  assert.match(plain, /^纯算法语音清洗对照稿/m)
  assert.match(plain, /测试脚本：algo_speech_pipeline\.mjs/)
  assert.doesNotMatch(plain, /file:\/\//)
  assert.match(plain, /PocketAgents \(https:\/\/harness\.agentrun\.vip\)/)
  assert.match(plain, /核心指标 6\.7ms/)
  assert.doesNotMatch(plain, /\*\*|`|~~|plugin-card/)
  assert.match(plain, /这是一段引用说明/)
  assert.doesNotMatch(plain, /\[!NOTE\]/)
  assert.match(plain, /项目 \| 耗时/)
  assert.match(plain, /语音清洗 \| 6\.7ms/)
  assert.doesNotMatch(plain, /:---/)
  assert.match(plain, /☑ 已完成本地验证/)
  assert.match(plain, /• 普通列表项 斜体 和 删除线/)
  assert.match(plain, /const ms = 6\.7/)
})

test('buildStandaloneMarkdownHtml produces self-contained print-safe HTML with zero PocketAgents onclick leaks', () => {
  const md = [
    '# 测试文档 <demo>',
    '',
    '点击查看 [CHANGELOG.md](file:///Users/cc/deepseekharness-remote/CHANGELOG.md) 或 `hub/server.js`。',
    '',
    '```bash',
    'echo "hello"',
    '```',
  ].join('\n')
  const rendered = renderMarkdown(md) + '<script>alert(1)</script>'
  const cleanBody = sanitizeExportedBodyHtml(rendered)
  assert.doesNotMatch(cleanBody, /<script/i)
  assert.doesNotMatch(cleanBody, /\sonclick=/i)
  assert.doesNotMatch(cleanBody, /md-code-copy/)

  const doc = buildStandaloneMarkdownHtml({
    title: 'algo_voice_transcripts.md',
    renderedBodyHtml: rendered,
    sourcePath: 'docs/algo_voice_transcripts.md',
    exportedAt: '2026-11-20 18:50',
  })
  assert.match(doc, /^<!DOCTYPE html>/i)
  assert.match(doc, /<meta charset="UTF-8"/i)
  assert.match(doc, /@media print/)
  assert.match(doc, /algo_voice_transcripts\.md/)
  assert.match(doc, /docs\/algo_voice_transcripts\.md/)
  assert.doesNotMatch(doc, /<script/i)
  assert.doesNotMatch(doc, /openChatFileLink\(/i)
})

test('prepareWorkspaceFileStream emits document MIME types safely (redacted text + XSS-safe inline HTML)', async () => {
  const wsDir = await mkdtemp(join(tmpdir(), 'dsh-doc-mime-'))
  try {
    await writeFile(join(wsDir, 'notes.md'), '# Title\n\nOPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef\n', 'utf8')
    await writeFile(join(wsDir, 'data.json'), '{"ok":true}\n', 'utf8')
    await writeFile(join(wsDir, 'preview.html'), '<h1>Hello</h1>', 'utf8')
    await writeFile(join(wsDir, 'manual.pdf'), Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x00, 0x0a]))

    const mdStream = await prepareWorkspaceFileStream(wsDir, 'notes.md', { download: true })
    assert.equal(mdStream.ok, true)
    assert.equal(mdStream.mime, 'text/markdown; charset=utf-8')
    assert.doesNotMatch(mdStream.buffer.toString('utf8'), /sk-1234567890/)

    const jsonStream = await prepareWorkspaceFileStream(wsDir, 'data.json', { download: true })
    assert.equal(jsonStream.ok, true)
    assert.equal(jsonStream.mime, 'application/json; charset=utf-8')

    // Inline .html stream stays text/plain to prevent same-origin HTML execution; download=true emits text/html
    const htmlInline = await prepareWorkspaceFileStream(wsDir, 'preview.html', { download: false })
    assert.equal(htmlInline.ok, true)
    assert.equal(htmlInline.mime, 'text/plain; charset=utf-8')

    const htmlDownload = await prepareWorkspaceFileStream(wsDir, 'preview.html', { download: true })
    assert.equal(htmlDownload.ok, true)
    assert.equal(htmlDownload.mime, 'text/html; charset=utf-8')

    const pdfStream = await prepareWorkspaceFileStream(wsDir, 'manual.pdf', { download: true })
    assert.equal(pdfStream.ok, true)
    assert.equal(pdfStream.mime, 'application/pdf')
  } finally {
    await rm(wsDir, { recursive: true, force: true })
  }
})

test('Unified file export UI wiring, iOS canShare fallback, sheet layering, and EN translations', async () => {
  const controllerSrc = await readFile(new URL('../../hub/web/src/controller.js', import.meta.url), 'utf8')
  const sheetsSrc = await readFile(new URL('../../hub/web/src/components/Sheets.tsx', import.meta.url), 'utf8')
  const cssSrc = await readFile(new URL('../../hub/web/src/styles/app.css', import.meta.url), 'utf8')

  assert.match(sheetsSrc, /id="fileExportSheet"/)
  assert.match(sheetsSrc, /id="fileExportSheetBody"/)
  assert.match(sheetsSrc, /downloadFullscreenHtmlPreview/)

  assert.match(cssSrc, /#fileExportSheet\s*\{[^}]*z-index:\s*110/)
  assert.match(cssSrc, /#copyFallbackSheet\s*\{[^}]*z-index:\s*120/)

  assert.match(controllerSrc, /function shareOrSaveBlob\(/)
  assert.match(controllerSrc, /type:\s*'text\/plain'/)
  assert.match(controllerSrc, /function openFileExportSheet\(/)
  assert.match(controllerSrc, /function exportCurrentFileOriginal\(/)
  assert.match(controllerSrc, /function exportCurrentMarkdownHtml\(/)
  assert.match(controllerSrc, /function copyCurrentFileText\(/)
  assert.match(controllerSrc, /function printCurrentMarkdownToPdf\(/)
  assert.match(controllerSrc, /buildHeaderExportBtnHtml\(host\.hostId,\s*preview,\s*kind,\s*dlUrl,\s*mt,\s*true\)/)
  assert.match(controllerSrc, /buildHeaderExportBtnHtml\(host\.hostId,\s*preview,\s*kind,\s*dlUrl,\s*mt,\s*false\)/)

  assert.equal(translateZhStringToEn('📄 导出与分享文档'), '📄 Export & Share Document')
  assert.equal(translateZhStringToEn('复制纯文本（去格式）'), 'Copy Plain Text')
  assert.equal(translateZhStringToEn('打印 / 另存为 PDF'), 'Print / Save as PDF')
})

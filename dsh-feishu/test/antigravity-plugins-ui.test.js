import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { HubCore } from '../../hub/hub-core.js'
import {
  discoverAntigravityPlugins,
  invalidateAntigravityPluginsCache,
  toggleAntigravityPlugin,
} from '../lib/antigravity-ide.js'
import {
  formatPluginCatalogMeta,
  renderInlineMarkdown,
  renderMarkdownBlocks,
  formatAssistantText,
} from '../../hub/web/src/utils/markdown.ts'

test('Markdown renders <plugin-card>, customization://, sidecar://, and conversation:// into native mobile cards & pills while keeping backtick code literal', () => {
  // 1. Standalone <plugin-card> block (exact pattern from user screenshot 1)
  const cardInput = [
    '最省心的方式是先添加下方官方 Cloudflare 插件：',
    '',
    '<plugin-card catalog-id="antigravity-plugins-partners/plugin/cloudflare"></plugin-card>',
    '',
    '您可以直接从上方卡片点击添加并登录。',
  ].join('\n')
  const cardHtml = renderMarkdownBlocks(cardInput)
  assert.ok(!cardHtml.includes('&lt;plugin-card'), 'Raw <plugin-card> tag must not leak to mobile UI')
  assert.match(cardHtml, /<div class="md-plugin-card"[^>]*data-plugin-catalog-id="antigravity-plugins-partners\/plugin\/cloudflare"/)
  assert.match(cardHtml, />Cloudflare</)
  assert.match(cardHtml, />官方合作插件</)
  assert.match(cardHtml, /openAntigravityPluginSheet/)

  // 2. customization:// link (exact pattern from user screenshot 2) & dotted plugin name guard
  const customHtml = renderInlineMarkdown(
    '1. 点开插件详情页：[creator-launch-studio](customization://creator-launch-studio) 和 [my.plugin](customization://my.plugin)',
  )
  assert.ok(!customHtml.includes('(customization://'), 'Raw customization:// markdown must not leak')
  assert.match(customHtml, /class="md-plugin-chip"[^>]*data-plugin-dir="creator-launch-studio"/)
  assert.match(customHtml, /class="md-plugin-chip"[^>]*data-plugin-dir="my\.plugin"/)
  assert.ok(!customHtml.includes('openChatFileLink'), 'Dotted customization:// link must not be misparsed as file link')

  // 3. sidecar:// and conversation:// links
  const sidecarHtml = renderInlineMarkdown('打开面板 [Launch Studio](sidecar://creator-launch-studio/studio-ui/) 或回到 [上次排查](conversation://e5b8d936-c3cb-4634-bfac-83fed58c8f1b)')
  assert.match(sidecarHtml, /class="md-plugin-chip md-sidecar-chip"[^>]*data-sidecar-id="creator-launch-studio\/studio-ui\/"/)
  assert.match(sidecarHtml, /class="md-plugin-chip md-conv-chip"[^>]*openConversationDeepLink/)

  // 4. Backtick-quoted example stays literal <code>
  const codeExampleHtml = formatAssistantText('示例语法：`<plugin-card catalog-id="foo/bar"></plugin-card>`')
  assert.match(codeExampleHtml, /<code>&lt;plugin-card catalog-id=&quot;foo\/bar&quot;&gt;&lt;\/plugin-card&gt;<\/code>/)

  // 5. Catalog meta formatter
  assert.equal(formatPluginCatalogMeta('antigravity-plugins-official/plugin/gdocs').displayName, 'Google Docs')
  assert.equal(formatPluginCatalogMeta('antigravity-plugins-official/plugin/gdocs').publisherLabel, 'Google 官方插件')
})

test('discoverAntigravityPlugins: normalizes compact CLI fallback metadata and toggleAntigravityPlugin validates & executes official agy CLI', async () => {
  invalidateAntigravityPluginsCache()

  const cliListPayload = JSON.stringify([
    {
      name: 'creator-launch-studio',
      enabled: true,
      version: '1.0.0',
      path: '/Users/test/.gemini/config/plugins/creator-launch-studio',
      skills: ['launch-all-platforms', 'bilibili-tech-publisher'],
      rules: ['AGENTS.md'],
    },
    {
      name: 'railway',
      enabled: false,
      version: '1.7.0',
      source: 'antigravity-plugins-partners',
      path: '/Users/test/.gemini/config/plugins/railway',
      skills: ['use-railway'],
      mcpServers: ['mcp'],
    },
  ])

  const calls = []
  const mockExec = async (bin, args) => {
    calls.push({ bin, args })
    if (args[0] === 'plugin' && args[1] === 'list') {
      return { stdout: cliListPayload, stderr: '' }
    }
    if (args[0] === 'plugin' && (args[1] === 'enable' || args[1] === 'disable')) {
      return { stdout: `Plugin "${args[2]}" ${args[1]}d`, stderr: '' }
    }
    throw new Error('no live LS process in unit test')
  }

  const plugins = await discoverAntigravityPlugins({
    forceRefresh: true,
    execImpl: mockExec,
    fetchImpl: null,
    agyBin: '/mock/agy',
  })
  assert.equal(plugins.length, 2)
  assert.equal(plugins[0].dir, 'creator-launch-studio')
  assert.equal(plugins[0].enabled, true)
  assert.deepEqual(plugins[0].skills, ['launch-all-platforms', 'bilibili-tech-publisher'])
  assert.equal(plugins[0].rulesCount, 1)
  assert.equal(plugins[1].dir, 'railway')
  assert.equal(plugins[1].enabled, false)
  assert.equal(plugins[1].marketplace, 'antigravity-plugins-partners')

  // Reject unsafe plugin names
  const badRes = await toggleAntigravityPlugin('../evil;rm -rf', true, { execImpl: mockExec, agyBin: '/mock/agy' })
  assert.equal(badRes.ok, false)

  // Valid disable call uses official CLI argv without shell
  const disableRes = await toggleAntigravityPlugin('creator-launch-studio', false, {
    execImpl: mockExec,
    agyBin: '/mock/agy',
  })
  assert.equal(disableRes.ok, true)
  assert.equal(disableRes.enabled, false)
  const lastCall = calls[calls.length - 1]
  assert.equal(lastCall.bin, '/mock/agy')
  assert.deepEqual(lastCall.args, ['plugin', 'disable', 'creator-launch-studio'])
})

test('HubCore fingerprint detects antigravityPlugins toggle transitions and broadcasts SSE immediately', () => {
  const hub = new HubCore()
  hub.handleHeartbeat({
    hostId: 'mac-plugins',
    hostName: 'Mac Plugins',
    bridgeState: {
      tasks: [],
      approvals: [],
      antigravityPlugins: [{ dir: 'creator-launch-studio', name: 'creator-launch-studio', enabled: true, version: '1.0.0' }],
    },
  })
  const seq1 = hub.stateSeq

  hub.handleHeartbeat({
    hostId: 'mac-plugins',
    hostName: 'Mac Plugins',
    bridgeState: {
      tasks: [],
      approvals: [],
      antigravityPlugins: [{ dir: 'creator-launch-studio', name: 'creator-launch-studio', enabled: false, version: '1.0.0' }],
    },
  })
  assert.ok(hub.stateSeq > seq1, 'Toggling plugin enabled state must bump stateSeq and trigger SSE broadcast')
  assert.equal(hub.getFullState().hosts[0].bridgeState.antigravityPlugins[0].enabled, false)
})

test('Frontend plugin detail sheet & controller wiring contracts', async () => {
  const sheetsSrc = await readFile(join(process.cwd(), 'hub/web/src/components/Sheets.tsx'), 'utf8')
  const ctrlSrc = await readFile(join(process.cwd(), 'hub/web/src/controller.js'), 'utf8')
  assert.match(sheetsSrc, /id="pluginDetailSheet"/)
  assert.match(sheetsSrc, /id="pluginDetailBody"/)
  assert.match(ctrlSrc, /hydrateAntigravityPluginCards/)
  assert.match(ctrlSrc, /openAntigravityPluginSheet/)
  assert.match(ctrlSrc, /toggleRemoteAntigravityPlugin/)
  assert.match(ctrlSrc, /openConversationDeepLink/)
})

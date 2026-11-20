import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')

function readJson(relPath) {
  const full = join(REPO_ROOT, relPath)
  assert.equal(existsSync(full), true, `Missing required file: ${relPath}`)
  return JSON.parse(readFileSync(full, 'utf8'))
}

describe('Multi-platform Native Plugin Manifests (Antigravity, Claude Code, Codex, DSH)', () => {
  const pkg = readJson('package.json')
  const expectedVersion = pkg.version
  const expectedName = 'pocketagents'
  const expectedRepo = 'https://github.com/oscarka/pocketagents'
  const expectedHomepage = 'https://pocketagents.agentrun.vip/?demo=1'

  it('keeps Antigravity plugin.json strict, valid, and free of leaked root hooks.json', () => {
    const manifest = readJson('plugin.json')
    const allowedKeys = new Set([
      'name',
      'displayName',
      'description',
      'version',
      'author',
      'homepage',
      'repository',
      'logo',
      'suggestedPrompts',
      'disabled',
    ])
    for (const key of Object.keys(manifest)) {
      assert.ok(allowedKeys.has(key), `Unexpected Antigravity plugin.json key: ${key}`)
    }
    assert.equal(manifest.name, expectedName)
    assert.equal(manifest.displayName, 'PocketAgents')
    assert.equal(manifest.version, expectedVersion)
    assert.equal(manifest.homepage, expectedHomepage)
    assert.equal(manifest.repository, expectedRepo)
    assert.equal(existsSync(join(REPO_ROOT, manifest.logo)), true)
    assert.equal(Array.isArray(manifest.suggestedPrompts), true)
    assert.equal(manifest.suggestedPrompts.length, 3)

    // Claude Code hook MUST stay isolated inside .claude-plugin/ so Antigravity never auto-loads it
    assert.equal(existsSync(join(REPO_ROOT, 'hooks.json')), false)
    assert.equal(existsSync(join(REPO_ROOT, 'hooks', 'hooks.json')), false)

    // Shared skill exists with YAML frontmatter
    const skillPath = join(REPO_ROOT, 'skills', 'pocketagents', 'SKILL.md')
    assert.equal(existsSync(skillPath), true)
    const skillText = readFileSync(skillPath, 'utf8')
    assert.match(skillText, /^---\nname:\s*pocketagents\n/m)
  })

  it('keeps Claude Code plugin.json, marketplace.json, and isolated PermissionRequest hooks.json valid', () => {
    const plugin = readJson('.claude-plugin/plugin.json')
    const marketplace = readJson('.claude-plugin/marketplace.json')
    const hooks = readJson('.claude-plugin/hooks.json')

    assert.equal(plugin.name, expectedName)
    assert.equal(plugin.version, expectedVersion)
    assert.equal(plugin.homepage, expectedHomepage)
    assert.equal(plugin.repository, expectedRepo)
    assert.equal(existsSync(join(REPO_ROOT, plugin.skills)), true)
    assert.equal(existsSync(join(REPO_ROOT, plugin.hooks)), true)

    // Marketplace must not contain unrecognized top-level keys like $schema (rejected by `claude plugin validate`)
    assert.equal('$schema' in marketplace, false)
    assert.equal(marketplace.name, expectedName)
    assert.equal(marketplace.metadata.version, expectedVersion)
    assert.equal(Array.isArray(marketplace.plugins), true)
    assert.equal(marketplace.plugins.length, 1)
    assert.equal(marketplace.plugins[0].name, expectedName)
    assert.equal(marketplace.plugins[0].source, './')
    assert.equal(marketplace.plugins[0].version, expectedVersion)

    // Hook uses ${CLAUDE_PLUGIN_ROOT} and --from-plugin for zero-hang & dedupe safety
    const permEntries = hooks?.hooks?.PermissionRequest
    assert.equal(Array.isArray(permEntries), true)
    assert.equal(permEntries.length, 1)
    const cmd = permEntries[0]?.hooks?.[0]?.command || ''
    assert.ok(cmd.includes('${CLAUDE_PLUGIN_ROOT}/dsh-feishu/lib/claude-permission-hook.js'))
    assert.ok(cmd.includes('--from-plugin'))
    assert.equal(existsSync(join(REPO_ROOT, 'dsh-feishu/lib/claude-permission-hook.js')), true)
  })

  it('keeps OpenAI Codex plugin manifests and .agents/plugins/marketplace.json valid (and guards codex-rs #17066)', () => {
    const rootCodex = readJson('.codex-plugin/plugin.json')
    const nestedCodex = readJson('plugins/pocketagents/.codex-plugin/plugin.json')
    const marketplace = readJson('.agents/plugins/marketplace.json')

    assert.deepEqual(nestedCodex, rootCodex)
    assert.equal(rootCodex.name, expectedName)
    assert.equal(rootCodex.version, expectedVersion)
    assert.equal(rootCodex.homepage, expectedHomepage)
    assert.equal(rootCodex.repository, expectedRepo)
    assert.ok(
      rootCodex.interface.shortDescription.length <= 30,
      `Codex shortDescription must be <= 30 chars, got ${rootCodex.interface.shortDescription.length}`,
    )
    assert.equal(rootCodex.interface.defaultPrompt.length, 3)

    // Marketplace local source path must point to a subdirectory (not "." or "./") per codex-rs #17066
    assert.equal(marketplace.name, expectedName)
    assert.equal(marketplace.plugins.length, 1)
    const entry = marketplace.plugins[0]
    assert.equal(entry.name, expectedName)
    assert.equal(entry.source.source, 'local')
    assert.notEqual(entry.source.path, '.')
    assert.notEqual(entry.source.path, './')
    assert.equal(entry.source.path, './plugins/pocketagents')

    const pluginRoot = join(REPO_ROOT, entry.source.path)
    assert.equal(existsSync(join(pluginRoot, '.codex-plugin', 'plugin.json')), true)
    assert.equal(existsSync(join(pluginRoot, nestedCodex.skills)), true)
    assert.equal(existsSync(join(pluginRoot, nestedCodex.interface.logo)), true)
    assert.equal(existsSync(join(pluginRoot, nestedCodex.interface.composerIcon)), true)

    // Nested Codex plugin assets & skill stay byte-identical to root shared copies
    assert.equal(
      readFileSync(join(pluginRoot, 'skills/pocketagents/SKILL.md'), 'utf8'),
      readFileSync(join(REPO_ROOT, 'skills/pocketagents/SKILL.md'), 'utf8'),
    )
    assert.equal(
      readFileSync(join(pluginRoot, 'assets/logo.svg'), 'utf8'),
      readFileSync(join(REPO_ROOT, 'assets/logo.svg'), 'utf8'),
    )
  })
})

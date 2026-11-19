import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { accessSync, constants, readFileSync } from 'node:fs'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildQrMatrix, renderTerminalQr } from '../lib/terminal-qr.js'
import { parseCliArgs } from '../../scripts/cli.mjs'
import { createDemoHubState, createDemoSandbox } from '../../hub/web/src/demo-sandbox.js'

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))

describe('terminal-qr zero-dependency generator', () => {
  it('builds a valid ISO/IEC 18004 QR matrix with finder patterns for pairing URLs', () => {
    const url = 'http://192.168.1.42:8788/?pair=AB12CD'
    const built = buildQrMatrix(url)
    assert.ok(built, 'expected QR matrix for LAN pairing URL')
    assert.equal(built.size, 29) // Version 3 (37 bytes <= 53 data bytes)
    // Verify top-left 7x7 finder outer ring & 3x3 dark core
    assert.equal(built.grid[0][0], 1)
    assert.equal(built.grid[0][6], 1)
    assert.equal(built.grid[6][0], 1)
    assert.equal(built.grid[1][1], 0)
    assert.equal(built.grid[3][3], 1)
    // Top-right & bottom-left finder centers
    assert.equal(built.grid[3][built.size - 4], 1)
    assert.equal(built.grid[built.size - 4][3], 1)
  })

  it('renders Unicode half-block terminal QR with and without ANSI colors', () => {
    const ansiQr = renderTerminalQr('http://192.168.1.5:8788/?pair=XYZ789', { useAnsi: true })
    assert.ok(ansiQr.includes('\x1b[30;47m'))
    assert.ok(ansiQr.includes('\x1b[0m'))
    assert.match(ansiQr, /[█▀▄]/)

    const plainQr = renderTerminalQr('http://192.168.1.5:8788/?pair=XYZ789', { useAnsi: false })
    assert.ok(!plainQr.includes('\x1b['))
    assert.match(plainQr, /[█▀▄]/)
    const lines = plainQr.split('\n')
    assert.ok(lines.length >= 14 && lines.length <= 24)
  })

  it('returns empty string gracefully if payload exceeds Version 6-L capacity', () => {
    const huge = 'https://example.com/' + 'a'.repeat(200)
    assert.equal(buildQrMatrix(huge), null)
    assert.equal(renderTerminalQr(huge), '')
  })
})

describe('npx CLI entrypoint & package.json bin', () => {
  it('declares executable bin entries for npx pocketagent and dsh-remote', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'))
    assert.equal(pkg.name, 'pocketagent')
    assert.equal(pkg.bin?.pocketagent, './scripts/cli.mjs')
    assert.equal(pkg.bin?.['dsh-remote'], './scripts/cli.mjs')
    assert.ok(pkg.files.includes('scripts/*.mjs'))
    const cliPath = join(REPO_ROOT, 'scripts/cli.mjs')
    accessSync(cliPath, constants.X_OK)
    const firstLine = readFileSync(cliPath, 'utf8').split('\n')[0]
    assert.equal(firstLine, '#!/usr/bin/env node')
  })

  it('parses CLI flags cleanly', () => {
    const parsed = parseCliArgs(['--port', '9001', '--hub-only', '--no-qr', '--token=secret123'])
    assert.equal(parsed.port, 9001)
    assert.equal(parsed.hubOnly, true)
    assert.equal(parsed.noQr, true)
    assert.equal(parsed.token, 'secret123')
  })

  it('boots embedded Hub with --hub-only --port 0 --once and prints QR + pair code', () => {
    const tempHome = mkdtempSync(join(tmpdir(), 'dsh-cli-test-'))
    try {
      const cliPath = join(REPO_ROOT, 'scripts/cli.mjs')
      const out = execFileSync(
        process.execPath,
        [cliPath, '--hub-only', '--port', '0', '--once'],
        {
          env: {
            ...process.env,
            DSH_HOME: tempHome,
            NO_COLOR: '1',
          },
          encoding: 'utf8',
          timeout: 15000,
        },
      )
      assert.match(out, /PocketAgent v\d+\.\d+\.\d+/)
      assert.match(out, /Pair code:\s+[A-Z0-9]{6}/)
      assert.match(out, /Phone \(LAN\):/)
      assert.match(out, /[█▀▄]{4,}/)
    } finally {
      rmSync(tempHome, { recursive: true, force: true })
    }
  })
})

describe('?demo=1 zero-backend interactive sandbox', () => {
  it('builds bilingual 2-host, 5-harness mock state with approvals, pinned & deliverables', () => {
    for (const lang of ['en', 'zh']) {
      const state = createDemoHubState(lang)
      assert.equal(state.demoMode, true)
      assert.equal(state.hosts.length, 2)
      const allTasks = state.hosts.flatMap(h => h.bridgeState.tasks)
      const harnesses = new Set(allTasks.map(t => t.harness))
      assert.ok(harnesses.has('claude'))
      assert.ok(harnesses.has('antigravity-ide'))
      assert.ok(harnesses.has('codex'))
      assert.ok(harnesses.has('dsh'))
      assert.ok(harnesses.has('workbuddy'))
      assert.ok(allTasks.some(t => t.pinned))
      const allApprovals = state.hosts.flatMap(h => h.bridgeState.approvals)
      assert.equal(allApprovals.length, 2)
      assert.ok(allApprovals.some(a => a.kind === 'command'))
      assert.ok(allApprovals.some(a => a.kind === 'question'))
    }
  })

  it('handles approvals, file reads, directory listings, and prompts entirely in memory', async () => {
    globalThis.location = globalThis.location || { origin: 'https://demo.local' }
    let state = createDemoHubState('en')
    let mutated = 0
    const toasts = []
    const sandbox = createDemoSandbox({
      getHubState: () => state,
      setHubState: next => {
        state = next
      },
      getLang: () => 'en',
      onStateMutated: () => {
        mutated += 1
      },
      showToast: msg => toasts.push(msg),
    })

    // 1. Virtual file read (HTML live preview)
    const htmlRes = await sandbox.handleApiFetch(
      '/api/hosts/demo-macbook-office/fs/read?path=reports/checkout-preview.html',
    )
    const htmlData = await htmlRes.json()
    assert.equal(htmlData.ok, true)
    assert.equal(htmlData.ext, '.html')
    assert.ok(htmlData.content.includes('Checkout Conversion Funnel'))

    // 2. Virtual directory listing
    const listRes = await sandbox.handleApiFetch('/api/hosts/demo-macbook-office/fs/list?subDir=')
    const listData = await listRes.json()
    assert.equal(listData.ok, true)
    assert.ok(listData.entries.some(e => e.name === 'reports' && e.isDirectory))

    // 3. Approval command resolves approval immediately
    const appRes = await sandbox.handleApiFetch('/api/hosts/demo-macbook-office/command', {
      method: 'POST',
      body: JSON.stringify({
        type: 'approval',
        code: 'DEMO01',
        agentId: 'demo-claude-webhook',
        allow: true,
      }),
    })
    const appData = await appRes.json()
    assert.equal(appData.ok, true)
    assert.equal(
      state.hosts[0].bridgeState.approvals.some(a => a.code === 'DEMO01'),
      false,
    )
    assert.ok(mutated >= 1)

    // 4. Reset restores fresh approvals
    sandbox.reset()
    assert.equal(state.hosts[0].bridgeState.approvals.length, 2)
  })
})

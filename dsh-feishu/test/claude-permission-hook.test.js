import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  buildClaudeApprovalDescriptor,
  buildClaudeHookDecisionOutput,
  getClaudeApprovalDir,
  installClaudePermissionHook,
  isClaudePermissionHookInstalled,
  isPocketAgentsWatcherActive,
  runClaudePermissionHookProcess,
  touchClaudeWatcherHeartbeat,
  uninstallClaudePermissionHook,
} from '../lib/claude-permission-hook.js'
import { ClaudeAdapter } from '../lib/harnesses/claude-adapter.js'

describe('Claude Code PermissionRequest Hook & Mobile Approval', () => {
  it('installs and uninstalls idempotently in ~/.claude/settings.json without clobbering existing user hooks', () => {
    const tmpClaudeHome = mkdtempSync(join(tmpdir(), 'dsh-claude-hook-cfg-'))
    try {
      const settingsPath = join(tmpClaudeHome, 'settings.json')
      writeFileSync(
        settingsPath,
        JSON.stringify(
          {
            theme: 'dark',
            hooks: {
              PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo pre' }] }],
              PermissionRequest: [
                { matcher: 'Read', hooks: [{ type: 'command', command: 'echo custom-user-hook' }] },
              ],
            },
          },
          null,
          2,
        ),
      )

      assert.equal(isClaudePermissionHookInstalled({ claudeHome: tmpClaudeHome }), false)
      const ins1 = installClaudePermissionHook({ claudeHome: tmpClaudeHome })
      assert.equal(ins1.ok, true)
      assert.equal(isClaudePermissionHookInstalled({ claudeHome: tmpClaudeHome }), true)

      // Re-installing is idempotent (no duplicate entries)
      const ins2 = installClaudePermissionHook({ claudeHome: tmpClaudeHome })
      assert.equal(ins2.ok, true)
      const afterInstall = JSON.parse(readFileSync(settingsPath, 'utf8'))
      assert.equal(afterInstall.theme, 'dark')
      assert.equal(afterInstall.hooks.PreToolUse.length, 1)
      assert.equal(afterInstall.hooks.PermissionRequest.length, 2)

      // Uninstalling removes ONLY our hook and keeps user's custom hook intact
      const un = uninstallClaudePermissionHook({ claudeHome: tmpClaudeHome })
      assert.equal(un.ok, true)
      assert.equal(un.removed, true)
      assert.equal(isClaudePermissionHookInstalled({ claudeHome: tmpClaudeHome }), false)
      const afterUninstall = JSON.parse(readFileSync(settingsPath, 'utf8'))
      assert.equal(afterUninstall.hooks.PermissionRequest.length, 1)
      assert.equal(afterUninstall.hooks.PermissionRequest[0].matcher, 'Read')
    } finally {
      rmSync(tmpClaudeHome, { recursive: true, force: true })
    }
  })

  it('builds official Claude Code PermissionRequest outputs for allow-once, always-allow, deny, and AskUserQuestion', () => {
    const bashDesc = buildClaudeApprovalDescriptor({
      session_id: 'sess-bash-1',
      cwd: '/tmp/my-app',
      tool_name: 'Bash',
      tool_input: { command: 'npm test -- --watch=false', description: 'Run unit tests' },
    })
    assert.equal(bashDesc.harness, 'claude')
    assert.equal(bashDesc.agentId, 'claude:sess-bash-1')
    assert.equal(bashDesc.kind, 'command')
    assert.equal(bashDesc.ruleHint, 'npm test')
    assert.equal(bashDesc.options.length, 2)

    const allowOnce = buildClaudeHookDecisionOutput(bashDesc, { allow: true, optionIndex: 1 })
    assert.deepEqual(allowOnce, {
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: { behavior: 'allow' },
      },
    })

    const alwaysAllow = buildClaudeHookDecisionOutput(bashDesc, { allow: true, optionIndex: 2 })
    assert.equal(alwaysAllow.hookSpecificOutput.decision.behavior, 'allow')
    assert.equal(alwaysAllow.hookSpecificOutput.decision.updatedPermissions[0].type, 'addRules')
    assert.equal(alwaysAllow.hookSpecificOutput.decision.updatedPermissions[0].rules[0].ruleContent, 'npm test:*')

    const denied = buildClaudeHookDecisionOutput(bashDesc, { allow: false, message: 'Nope' })
    assert.equal(denied.hookSpecificOutput.decision.behavior, 'deny')
    assert.equal(denied.hookSpecificOutput.decision.message, 'Nope')

    const qDesc = buildClaudeApprovalDescriptor({
      session_id: 'sess-q-1',
      cwd: '/tmp/my-app',
      tool_name: 'AskUserQuestion',
      tool_input: {
        questions: [
          {
            id: 'q1',
            question: 'Which DB?',
            options: [{ label: 'Postgres' }, { label: 'SQLite' }],
          },
        ],
      },
    })
    assert.equal(qDesc.kind, 'question')
    assert.equal(qDesc.questions.length, 1)
    const qOut = buildClaudeHookDecisionOutput(qDesc, {
      allow: true,
      answers: { q1: 'Postgres' },
    })
    assert.deepEqual(qOut.hookSpecificOutput.decision.updatedInput.answers, { q1: 'Postgres' })
  })

  it('completes full end-to-end hook -> ClaudeAdapter discovery -> mobile resolveApproval -> hook stdout JSON loop', async () => {
    const tmpClaudeHome = mkdtempSync(join(tmpdir(), 'dsh-claude-hook-e2e-'))
    try {
      const adapter = new ClaudeAdapter({ claudeHome: tmpClaudeHome, binaryPath: '' })

      const hookStdin = JSON.stringify({
        session_id: 'e2e-session-42',
        cwd: '/tmp/checkout-repo',
        hook_event_name: 'PermissionRequest',
        tool_name: 'Bash',
        tool_input: {
          command: 'npm run test:e2e',
          description: 'Run checkout E2E suite',
        },
      })

      // Start waiting hook asynchronously
      const hookPromise = runClaudePermissionHookProcess({
        rawStdin: hookStdin,
        claudeHome: tmpClaudeHome,
        timeoutMs: 5000,
        pollIntervalMs: 40,
      })

      // Wait briefly for req-*.json to appear, then discover via ClaudeAdapter.listSessions()
      let sessions = []
      for (let i = 0; i < 20; i += 1) {
        sessions = await adapter.listSessions()
        if (sessions.length > 0 && sessions[0].pendingApproval) break
        await new Promise(r => setTimeout(r, 30))
      }

      assert.equal(sessions.length, 1)
      const sess = sessions[0]
      assert.equal(sess.id, 'claude:e2e-session-42')
      assert.equal(sess.status, 'approval')
      assert.equal(sess.turnState, 'approval')
      assert.ok(sess.pendingApproval.code.startsWith('CLD-'))
      assert.equal(sess.pendingApproval.commandLine, 'npm run test:e2e')

      // Approve from mobile via ClaudeAdapter.resolveApproval (option 2 = always allow in session)
      const resolveRes = await adapter.resolveApproval({
        sessionId: sess.id,
        code: sess.pendingApproval.code,
        allow: true,
        optionIndex: 2,
      })
      assert.equal(resolveRes.ok, true)
      assert.equal(resolveRes.decision, 'allowed-session')

      // Hook resolves immediately with Claude Code official JSON output and cleans up temp files
      const hookOutput = await hookPromise
      assert.equal(hookOutput.hookSpecificOutput.hookEventName, 'PermissionRequest')
      assert.equal(hookOutput.hookSpecificOutput.decision.behavior, 'allow')
      assert.ok(Array.isArray(hookOutput.hookSpecificOutput.decision.updatedPermissions))

      const approvalDir = getClaudeApprovalDir(tmpClaudeHome)
      assert.equal(existsSync(join(approvalDir, `req-${sess.pendingApproval.code}.json`)), false)
      assert.equal(existsSync(join(approvalDir, `res-${sess.pendingApproval.code}.json`)), false)
    } finally {
      rmSync(tmpClaudeHome, { recursive: true, force: true })
    }
  })

  it('prunes stale request files whose owning hook process has exited', () => {
    const tmpClaudeHome = mkdtempSync(join(tmpdir(), 'dsh-claude-hook-stale-'))
    try {
      const approvalDir = getClaudeApprovalDir(tmpClaudeHome)
      mkdirSync(approvalDir, { recursive: true })
      const stalePath = join(approvalDir, 'req-CLD-DEAD99.json')
      writeFileSync(
        stalePath,
        JSON.stringify({
          code: 'CLD-DEAD99',
          agentId: 'claude:stale-1',
          createdAt: Date.now() - 1000,
          pid: 999999,
        }),
      )
      const adapter = new ClaudeAdapter({ claudeHome: tmpClaudeHome, binaryPath: '' })
      const pending = adapter.listPendingApprovals()
      assert.equal(pending.length, 0)
      assert.equal(existsSync(stalePath), false)
    } finally {
      rmSync(tmpClaudeHome, { recursive: true, force: true })
    }
  })

  it('exits immediately without blocking when requireWatcher is true and no PocketAgents watcher is alive', async () => {
    const tmpClaudeHome = mkdtempSync(join(tmpdir(), 'dsh-claude-hook-idle-'))
    const tmpDshHome = mkdtempSync(join(tmpdir(), 'dsh-home-idle-'))
    try {
      assert.equal(
        isPocketAgentsWatcherActive({ claudeHome: tmpClaudeHome, dshHome: tmpDshHome }),
        false,
      )

      const startedAt = Date.now()
      const res = await runClaudePermissionHookProcess({
        rawStdin: JSON.stringify({
          session_id: 'no-watcher-1',
          cwd: '/tmp/app',
          tool_name: 'Bash',
          tool_input: { command: 'ls' },
        }),
        claudeHome: tmpClaudeHome,
        dshHome: tmpDshHome,
        timeoutMs: 10_000,
        requireWatcher: true,
      })
      assert.equal(res, null)
      assert.ok(Date.now() - startedAt < 1000, 'should exit immediately without waiting for timeout')

      // Stale/dead PID heartbeat must still be treated as inactive
      touchClaudeWatcherHeartbeat({ claudeHome: tmpClaudeHome, pid: 999999, now: Date.now() })
      assert.equal(
        isPocketAgentsWatcherActive({
          claudeHome: tmpClaudeHome,
          dshHome: tmpDshHome,
          isAliveImpl: () => false,
        }),
        false,
      )

      // Active daemon.lock with live PID counts as active
      writeFileSync(join(tmpDshHome, 'daemon.lock'), JSON.stringify({ pid: process.pid }))
      assert.equal(
        isPocketAgentsWatcherActive({ claudeHome: tmpClaudeHome, dshHome: tmpDshHome }),
        true,
      )
    } finally {
      rmSync(tmpClaudeHome, { recursive: true, force: true })
      rmSync(tmpDshHome, { recursive: true, force: true })
    }
  })

  it('yields immediately when invoked via --from-plugin if settings.json hook is already installed, and refreshes heartbeat via ClaudeAdapter', async () => {
    const tmpClaudeHome = mkdtempSync(join(tmpdir(), 'dsh-claude-hook-plugin-'))
    const tmpDshHome = mkdtempSync(join(tmpdir(), 'dsh-home-plugin-'))
    try {
      const adapter = new ClaudeAdapter({ claudeHome: tmpClaudeHome, binaryPath: '' })
      await adapter.listSessions()
      assert.equal(
        isPocketAgentsWatcherActive({ claudeHome: tmpClaudeHome, dshHome: tmpDshHome }),
        true,
      )

      installClaudePermissionHook({ claudeHome: tmpClaudeHome })
      const startedAt = Date.now()
      const res = await runClaudePermissionHookProcess({
        rawStdin: JSON.stringify({
          session_id: 'dedupe-1',
          cwd: '/tmp/app',
          tool_name: 'Bash',
          tool_input: { command: 'npm test' },
        }),
        claudeHome: tmpClaudeHome,
        dshHome: tmpDshHome,
        timeoutMs: 10_000,
        requireWatcher: true,
        skipIfSettingsHookInstalled: true,
      })
      assert.equal(res, null)
      assert.ok(Date.now() - startedAt < 1000, 'plugin hook should yield immediately to settings.json hook')
    } finally {
      rmSync(tmpClaudeHome, { recursive: true, force: true })
      rmSync(tmpDshHome, { recursive: true, force: true })
    }
  })
})

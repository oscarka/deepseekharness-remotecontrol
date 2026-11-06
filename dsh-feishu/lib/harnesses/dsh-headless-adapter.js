import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export function findDshBinary() {
  const home = homedir()
  const candidates = [
    process.env.DSH_BIN,
    '/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh',
    join(home, 'Applications', 'DeepSeek Harness.app', 'Contents', 'Resources', 'runtime', 'cli', 'bin', 'dsh'),
    '/opt/homebrew/bin/dsh',
    '/usr/local/bin/dsh',
  ].filter(Boolean)

  for (const c of candidates) {
    try {
      if (existsSync(c)) return c
    } catch {}
  }
  return ''
}

export function buildDshHeadlessPatchFile(dshHome) {
  const resolvedHome = resolve(dshHome || join(homedir(), '.dsh'))
  mkdirSync(resolvedHome, { recursive: true })
  const patchPath = join(resolvedHome, 'headless-remote-patch.yml')

  const extraBlocks = []
  for (const profileName of ['desktop', 'web']) {
    const pFile = join(resolvedHome, 'profiles', profileName, 'cordis.patch.yml')
    try {
      if (!existsSync(pFile)) continue
      const raw = readFileSync(pFile, 'utf8')
      const blocks = raw.split(/\n(?=- id:\s*)/)
      for (const block of blocks) {
        const m = block.match(/^- id:\s*(\S+)/m)
        if (!m) continue
        const id = m[1].replace(/['"]/g, '')
        if (id.startsWith('ui-')) continue
        extraBlocks.push(block.trim())
      }
      if (extraBlocks.length > 0) break
    } catch {}
  }

  const runnerJs = `(globalThis.__dshRemoteStarted ? true : (globalThis.__dshRemoteStarted = true, ctx.inject(["agents", "agentDefaultModel", "sessions"], async (c) => {
  const exitFn = c.get("appExit") || ((code) => process.exit(code));
  try {
    await c.get("loader")?.await?.();
    const sel = c.agentDefaultModel.currentSelection();
    const agentOptions = { provider: sel.provider, model: sel.model };
    const setup = (agentCtx) => {
      agentCtx.on("system-prompt/assemble", async (_a, _ctx, next) => {
        const assembled = await next();
        return {
          ...assembled,
          variables: { ...(assembled?.variables || {}), provider: sel.provider, model: sel.model }
        };
      });
      agentCtx.on("agent/request", async (_p, next) => {
        const resolved = await next();
        const { reasoningEffort: _e, ...rest } = resolved || {};
        return {
          ...rest,
          provider: sel.provider,
          model: sel.model,
          ...(sel.reasoningEffort ? { reasoningEffort: sel.reasoningEffort } : {})
        };
      });
    };
    const sid = String(process.env.DSH_REMOTE_SESSION_ID || "").trim();
    const isNew = process.env.DSH_REMOTE_IS_NEW === "1";
    const task = String(process.env.DSH_REMOTE_TASK || "").trim();
    const title = String(process.env.DSH_REMOTE_TITLE || "").trim();
    const cwd = String(process.env.DSH_REMOTE_CWD || process.cwd()).trim();
    let agent;
    if (!isNew && sid) {
      let resumed;
      try {
        resumed = await c.agents.resume({
          resumeSessionId: sid,
          agentOptions,
          setup
        });
      } catch (resumeErr) {
        if (
          resumeErr?.name === "SessionAlreadyOwnedError" ||
          String(resumeErr?.message || "").includes("active write handle")
        ) {
          const fs = await import("node:fs");
          const path = await import("node:path");
          const dshRoot = process.env.DSH_HOME || path.join(process.env.HOME || "", ".dsh");
          const sessRoot = path.join(dshRoot, "sessions");
          if (fs.existsSync(sessRoot)) {
            for (const proj of fs.readdirSync(sessRoot)) {
              const lockCandidate = path.join(sessRoot, proj, sid, "session.lock");
              if (fs.existsSync(lockCandidate)) {
                try {
                  fs.unlinkSync(lockCandidate);
                } catch {}
              }
            }
          }
          resumed = await c.agents.resume({
            resumeSessionId: sid,
            agentOptions,
            setup
          });
        } else {
          throw resumeErr;
        }
      }
      agent = resumed.agent || resumed;
    } else {
      const created = await c.agents.create({
        sessionId: sid || ("session-" + "${randomUUID()}"),
        meta: { cwd },
        agentOptions,
        setup
      });
      agent = created.agent || created;
      if (title) {
        try {
          c.get("sessionTitle")?.rename?.(agent.session, title);
        } catch {}
      }
    }
    await agent.whenIdle();
    if (task) {
      const msg = Object.freeze({
        id: "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        role: "user",
        content: Object.freeze([Object.freeze({ type: "text", text: task })]),
        source: Object.freeze({ kind: "user" })
      });
      agent.followup(msg);
      const subagents = c.get("subagents");
      while (true) {
        await agent.whenIdle();
        const idleSeq = agent.session.seq;
        if (!(await subagents?.waitForChildren?.(agent)) && agent.status === "idle" && agent.session.seq === idleSeq) break;
      }
    }
    await c.sessions.flush(agent.session);
    exitFn(0);
  } catch (err) {
    console.error("[dsh-headless-remote]", err?.message || err);
    exitFn(1);
  }
}), true))`

  const yamlLines = [
    '- id: credentials',
    '  disabled: false',
    '- id: authorization',
    '  disabled: false',
    '- id: deepseek-account',
    '  disabled: false',
    '  config:',
    `    desktopPlatform: ${process.platform}`,
    ...extraBlocks,
    '- id: headless-runner',
    `  disabled: !!js ${JSON.stringify(runnerJs)}`,
  ]
  writeFileSync(patchPath, `${yamlLines.join('\n')}\n`, { mode: 0o600 })
  return patchPath
}

export class DshHeadlessRunner {
  constructor({ dshHome = '', binaryPath = '', onTurnSettled = null } = {}) {
    this.dshHome = dshHome || join(homedir(), '.dsh')
    this.binaryPath = binaryPath || findDshBinary()
    this.onTurnSettled = onTurnSettled
    this.activeProcs = new Map()
  }

  isRunning(sessionId) {
    return this.activeProcs.has(String(sessionId || ''))
  }

  stop(sessionId) {
    const id = String(sessionId || '')
    const entry = this.activeProcs.get(id)
    if (!entry) return { ok: false, error: '该 DSH 会话当前没有正在运行的后台进程' }
    try {
      entry.proc.kill('SIGTERM')
    } catch {}
    this.activeProcs.delete(id)
    return {
      ok: true,
      agentId: id,
      message: `⏹ 已停止 DSH 会话 (${id.slice(0, 14)})`,
    }
  }

  async runTurn({ sessionId = '', text = '', cwd = '', isNew = false, title = '' } = {}) {
    const cleanText = String(text || '').trim()
    if (!isNew && !cleanText) {
      return { ok: false, error: '发送内容不能为空' }
    }
    const bin = this.binaryPath || findDshBinary()
    if (!bin) {
      return {
        ok: false,
        error: '本机未找到 DeepSeek Harness CLI，请打开 DeepSeek Harness 桌面端后再试',
      }
    }
    const id = String(sessionId || `session-${randomUUID()}`).trim()
    if (this.activeProcs.has(id)) {
      return {
        ok: false,
        error: '该 DSH 会话正在后台执行上一条指令，请等待完成或点击停止后再发',
      }
    }
    const targetCwd = cwd && existsSync(cwd) ? cwd : process.cwd()
    const patchFile = buildDshHeadlessPatchFile(this.dshHome)

    // Preemptively unlink any existing POSIX session.lock held by an idle Desktop GUI window
    // so SessionWriteLease.acquire creates a fresh inode and never fails with SessionAlreadyOwnedError.
    if (!isNew && id) {
      try {
        const sessRoot = join(resolve(this.dshHome), 'sessions')
        if (existsSync(sessRoot)) {
          for (const proj of readdirSync(sessRoot)) {
            const lockCandidate = join(sessRoot, proj, id, 'session.lock')
            if (existsSync(lockCandidate)) {
              try {
                unlinkSync(lockCandidate)
              } catch {}
            }
          }
        }
      } catch {}
    }

    return await new Promise(resolvePromise => {
      let settledQuickly = false
      let stderrBuf = ''
      const proc = spawn(
        bin,
        ['--profile', 'headless', '--patch', patchFile, cleanText || 'noop'],
        {
          cwd: targetCwd,
          env: {
            ...process.env,
            DSH_HOME: this.dshHome,
            DSH_REMOTE_SESSION_ID: id,
            DSH_REMOTE_IS_NEW: isNew ? '1' : '0',
            DSH_REMOTE_TASK: cleanText,
            DSH_REMOTE_TITLE: String(title || '').trim(),
            DSH_REMOTE_CWD: targetCwd,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )

      this.activeProcs.set(id, { proc, startedAt: Date.now(), cwd: targetCwd })

      proc.stderr?.on('data', chunk => {
        stderrBuf = (stderrBuf + String(chunk)).slice(-1500)
      })

      proc.on('error', err => {
        this.activeProcs.delete(id)
        if (!settledQuickly) {
          settledQuickly = true
          resolvePromise({
            ok: false,
            error: `启动 DSH 失败: ${err?.message || 'spawn error'}`,
          })
        }
      })

      proc.on('exit', code => {
        this.activeProcs.delete(id)
        try {
          this.onTurnSettled?.(id, code)
        } catch {}
        if (!settledQuickly) {
          settledQuickly = true
          if (code === 0) {
            resolvePromise({
              ok: true,
              agentId: id,
              title: title || cleanText.slice(0, 36) || id,
              cwd: targetCwd,
              message: isNew
                ? `🚀 已创建并完成 DSH 会话「${(title || cleanText).slice(0, 28)}」`
                : `✅ DSH 已完成回复`,
            })
          } else {
            const isOwned = stderrBuf.includes('SessionAlreadyOwnedError')
            resolvePromise({
              ok: false,
              error: isOwned
                ? '该会话当前已在 DeepSeek Harness 桌面端打开，请在桌面端查看或重启一次桌面端以同步远程控制插件'
                : `DSH 执行异常 (exit ${code}): ${stderrBuf.trim().slice(-240) || '请检查模型或 API Key 配置'}`,
            })
          }
        }
      })

      setTimeout(() => {
        if (!settledQuickly) {
          settledQuickly = true
          resolvePromise({
            ok: true,
            agentId: id,
            title: title || cleanText.slice(0, 36) || id,
            cwd: targetCwd,
            message: isNew
              ? `🚀 已启动 DSH 新会话「${(title || cleanText).slice(0, 28)}」，正在后台思考与执行...`
              : `🚀 已唤醒 DSH 会话并注入指令，正在后台执行...`,
          })
        }
      }, 650)
    })
  }
}


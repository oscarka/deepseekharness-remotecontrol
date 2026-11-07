import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import * as zlib from 'node:zlib'

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

function decompressZstdTailText(rawBuf, maxFrames = 6) {
  if (typeof zlib.zstdDecompressSync !== 'function' || !Buffer.isBuffer(rawBuf) || rawBuf.length < 4) {
    return ''
  }
  const offsets = []
  let idx = 0
  while ((idx = rawBuf.indexOf(ZSTD_MAGIC, idx)) !== -1) {
    offsets.push(idx)
    idx += 4
  }
  if (offsets.length === 0) return ''
  const startIdx = Math.max(0, offsets.length - maxFrames)
  let out = ''
  for (let i = startIdx; i < offsets.length; i += 1) {
    const slice = rawBuf.subarray(offsets[i], offsets[i + 1] || rawBuf.length)
    try {
      out += zlib.zstdDecompressSync(slice).toString('utf8')
    } catch {
      // ignore partial frame currently being flushed
    }
  }
  return out
}

/**
 * Inspect whether a DSH session directory on disk is currently being written to
 * by an active Desktop GUI turn (as opposed to sitting idle in an open window).
 * Supports both real DSH v4 (`session.v4.jsonl.zstd`) and plain (`session.jsonl`) formats.
 */
export function isDshSessionActivelyWriting(
  sessDir,
  { now = Date.now(), activeWindowMs = 6000, midTurnWindowMs = 90000 } = {},
) {
  try {
    const zstdPath = join(sessDir, 'session.v4.jsonl.zstd')
    const jsonlPath = join(sessDir, 'session.jsonl')
    const hasZstd = existsSync(zstdPath)
    const hasJsonl = existsSync(jsonlPath)
    if (!hasZstd && !hasJsonl) return false

    const targetPath = hasZstd ? zstdPath : jsonlPath
    const st = statSync(targetPath)
    const ageMs = now - st.mtimeMs
    if (ageMs < 0 || ageMs <= activeWindowMs) {
      // Conservative mtime gate: any modification within activeWindowMs is treated as active writing
      return true
    }
    if (ageMs > midTurnWindowMs) {
      return false
    }

    const rawText = hasZstd ? decompressZstdTailText(readFileSync(zstdPath), 8) : readFileSync(jsonlPath, 'utf8')
    if (!rawText) {
      // If file was modified within midTurnWindowMs and is compressed/unreadable mid-flush, be conservative
      return ageMs <= activeWindowMs * 2
    }

    const lines = rawText.trim().split('\n').filter(Boolean)
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i -= 1) {
      try {
        const entry = JSON.parse(lines[i])
        const evType = String(entry?.type || '')

        // DSH v4 event schema: user/message, tool/call, tool/result, assistant/message
        if (evType === 'user/message') {
          const kind = entry?.data?.source?.kind
          if (!kind || kind === 'user') return true
          continue
        }
        if (evType === 'tool/call' || evType === 'tool/result') {
          return true
        }
        if (evType === 'assistant/message') {
          const blocks = Array.isArray(entry?.data?.message?.content) ? entry.data.message.content : []
          const hasToolCall = blocks.some(
            p => p?.type === 'tool-call' || p?.type === 'tool_use' || p?.type === 'tool_call',
          )
          const hasFinalText = blocks.some(p => p?.type === 'text' && String(p.text || '').trim().length > 0)
          return hasToolCall && !hasFinalText
        }

        // Legacy/generic JSONL message schema
        const msg = entry?.data?.message || entry?.message
        if (!msg) continue
        if (msg.role === 'user' || msg.role === 'tool') return true
        if (msg.role === 'assistant') {
          const parts = Array.isArray(msg.content) ? msg.content : []
          const hasToolCall = parts.some(
            p => p?.type === 'tool-call' || p?.type === 'tool_use' || p?.type === 'tool_call',
          )
          const hasFinalText = parts.some(p => p?.type === 'text' && String(p.text || '').trim().length > 0)
          return hasToolCall && !hasFinalText
        }
      } catch {}
    }
  } catch {}
  return false
}

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
          process.env.DSH_ALLOW_IDLE_LOCK_TAKEOVER === "1" &&
          (resumeErr?.name === "SessionAlreadyOwnedError" ||
            String(resumeErr?.message || "").includes("active write handle"))
        ) {
          const fs = await import("node:fs");
          const path = await import("node:path");
          const dshRoot = process.env.DSH_HOME || path.join(process.env.HOME || "", ".dsh");
          const sessRoot = path.join(dshRoot, "sessions");
          if (fs.existsSync(sessRoot)) {
            for (const proj of fs.readdirSync(sessRoot)) {
              const sDir = path.join(sessRoot, proj, sid);
              const lockCandidate = path.join(sDir, "session.lock");
              if (fs.existsSync(lockCandidate)) {
                const zstdFile = path.join(sDir, "session.v4.jsonl.zstd");
                const jsonlFile = path.join(sDir, "session.jsonl");
                const targetFile = fs.existsSync(zstdFile) ? zstdFile : (fs.existsSync(jsonlFile) ? jsonlFile : "");
                if (targetFile) {
                  const st = fs.statSync(targetFile);
                  if (Date.now() - st.mtimeMs <= 6000) {
                    throw resumeErr;
                  }
                }
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

  async runTurn({ sessionId = '', text = '', cwd = '', isNew = false, title = '', desktopBusy = false } = {}) {
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
        busy: true,
        error: '该 DSH 会话正在后台执行上一条指令，请等待完成或点击停止后再发',
      }
    }
    if (desktopBusy) {
      return {
        ok: false,
        busy: true,
        error: '该 DSH 会话当前正在电脑桌面端运行中，请等待当前回合完成后再从手机发送',
      }
    }
    const targetCwd = cwd && existsSync(cwd) ? cwd : process.cwd()
    const patchFile = buildDshHeadlessPatchFile(this.dshHome)

    // Preemptively unlink any existing POSIX session.lock ONLY when the Desktop GUI window is idle
    // (never when the Desktop GUI is actively writing to session.v4.jsonl.zstd or session.jsonl).
    let verifiedIdleSessionOnDisk = false
    if (!isNew && id) {
      try {
        const sessRoot = join(resolve(this.dshHome), 'sessions')
        if (existsSync(sessRoot)) {
          for (const proj of readdirSync(sessRoot)) {
            const sessDir = join(sessRoot, proj, id)
            if (!existsSync(sessDir)) continue
            if (isDshSessionActivelyWriting(sessDir)) {
              return {
                ok: false,
                busy: true,
                error: '该 DSH 会话当前正在电脑桌面端运行中，请等待当前回合完成后再从手机发送',
              }
            }
            verifiedIdleSessionOnDisk = true
            const lockCandidate = join(sessDir, 'session.lock')
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
            DSH_ALLOW_IDLE_LOCK_TAKEOVER: verifiedIdleSessionOnDisk ? '1' : '0',
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


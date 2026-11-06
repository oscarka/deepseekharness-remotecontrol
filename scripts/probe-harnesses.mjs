#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const home = homedir()

async function findBinary(name, extraPaths = []) {
  for (const p of extraPaths) {
    if (p && existsSync(p)) return p
  }
  try {
    const { stdout } = await execFileAsync('which', [name], { timeout: 2000 })
    const found = String(stdout || '').trim()
    if (found) return found
  } catch {}
  return ''
}

function countFilesRecursive(dir, extFilter = '.jsonl', maxDepth = 4, depth = 0) {
  if (!dir || !existsSync(dir) || depth > maxDepth) return { count: 0, latestPath: '', latestMtime: 0 }
  let count = 0
  let latestPath = ''
  let latestMtime = 0
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        const sub = countFilesRecursive(full, extFilter, maxDepth, depth + 1)
        count += sub.count
        if (sub.latestMtime > latestMtime) {
          latestMtime = sub.latestMtime
          latestPath = sub.latestPath
        }
      } else if (e.isFile() && (!extFilter || e.name.endsWith(extFilter))) {
        count += 1
        try {
          const st = statSync(full)
          if (st.mtimeMs > latestMtime) {
            latestMtime = st.mtimeMs
            latestPath = full
          }
        } catch {}
      }
    }
  } catch {}
  return { count, latestPath, latestMtime }
}

async function main() {
  const report = {
    probedAt: new Date().toISOString(),
    harnesses: {},
  }

  // 1. OpenAI Codex CLI (`codex`)
  const codexBin = await findBinary('codex', [
    '/opt/homebrew/bin/codex',
    '/usr/local/bin/codex',
    join(home, '.codex/plugins/.plugin-appserver/codex'),
    join(home, '.npm-global/bin/codex'),
  ])
  const codexSessionsDir = join(home, '.codex', 'sessions')
  const codexScan = countFilesRecursive(codexSessionsDir, '.jsonl', 4)
  let codexSampleTypes = []
  if (codexScan.latestPath) {
    try {
      const lines = readFileSync(codexScan.latestPath, 'utf8').split('\n').filter(Boolean).slice(0, 12)
      codexSampleTypes = [
        ...new Set(
          lines.map(l => {
            try {
              const j = JSON.parse(l)
              return j.type || j.record_type || Object.keys(j).join(',')
            } catch {
              return 'invalid'
            }
          }),
        ),
      ]
    } catch {}
  }
  report.harnesses.codex = {
    binary: codexBin,
    sessionsDir: existsSync(codexSessionsDir) ? codexSessionsDir : '',
    sessionFileCount: codexScan.count,
    latestSessionFile: codexScan.latestPath,
    sampleEventTypes: codexSampleTypes,
    gateStatus: codexBin || codexScan.count > 0 ? 'PASS_READY_FOR_ADAPTER' : 'NOT_INSTALLED',
  }

  // 2. Claude Code (`claude`)
  const claudeBin = await findBinary('claude', [
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
    join(home, '.local/bin/claude'),
    join(home, '.claude/local/claude'),
  ])
  const claudeProjectsDir = join(home, '.claude', 'projects')
  const claudeScan = countFilesRecursive(claudeProjectsDir, '.jsonl', 3)
  let claudeSampleTypes = []
  if (claudeScan.latestPath) {
    try {
      const lines = readFileSync(claudeScan.latestPath, 'utf8').split('\n').filter(Boolean).slice(0, 12)
      claudeSampleTypes = [
        ...new Set(
          lines.map(l => {
            try {
              const j = JSON.parse(l)
              return j.type || Object.keys(j).slice(0, 3).join(',')
            } catch {
              return 'invalid'
            }
          }),
        ),
      ]
    } catch {}
  }
  report.harnesses['claude-code'] = {
    binary: claudeBin,
    projectsDir: existsSync(claudeProjectsDir) ? claudeProjectsDir : '',
    sessionFileCount: claudeScan.count,
    latestSessionFile: claudeScan.latestPath,
    sampleEventTypes: claudeSampleTypes,
    gateStatus: claudeBin || claudeScan.count > 0 ? 'PASS_READY_FOR_ADAPTER' : 'NOT_INSTALLED',
  }

  // 3. WorkBuddy (`workbuddy`)
  const wbBin = await findBinary('workbuddy', [
    '/Applications/WorkBuddy.app/Contents/MacOS/WorkBuddy',
    '/opt/homebrew/bin/workbuddy',
    '/usr/local/bin/workbuddy',
  ])
  const wbCandidates = [
    join(home, '.workbuddy'),
    join(home, 'Library', 'Application Support', 'WorkBuddy'),
    join(home, 'Library', 'Application Support', 'workbuddy'),
  ].filter(p => existsSync(p))
  let wbSessionFiles = 0
  for (const d of wbCandidates) {
    wbSessionFiles += countFilesRecursive(d, '.jsonl', 3).count
    wbSessionFiles += countFilesRecursive(d, '.sqlite', 3).count
    wbSessionFiles += countFilesRecursive(d, '.db', 3).count
  }
  report.harnesses.workbuddy = {
    binary: wbBin,
    dataDirs: wbCandidates,
    sessionFileCount: wbSessionFiles,
    gateStatus: wbBin || wbSessionFiles > 0 ? 'NEEDS_IPC_INSPECTION' : 'NOT_INSTALLED',
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

# CI & Multi-Arch Docker Publish Zero-Failure Rule

To prevent `CI & Multi-Arch Docker Publish` workflow failures and GitHub failure notification emails on `main`:

1. **Mandatory Pre-Push Gate**:
   - Before running `git push` on any code change, ALWAYS run `npm test` and `npm run build` locally and confirm 100% of tests pass (`fail 0`) and `README.md` / `README.en.md` are byte-identical (`diff -q README.md README.en.md`).
2. **SQLite CLI Concurrency Safety (No `database is locked (5)` Flakes)**:
   - NEVER invoke the `sqlite3` CLI in production adapters or tests without `['-cmd', '.timeout 5000', ...]`. Default `sqlite3` has `busy_timeout = 0ms`, which causes intermittent `SQLITE_BUSY (5)` failures on 2-vCPU Ubuntu GitHub Actions runners when background sync and test queries overlap.
   - When creating SQLite test databases, enable `PRAGMA journal_mode=WAL;`.
3. **Post-Push Verification**:
   - After pushing to `origin/main`, always check `gh run list -L 2` (or `gh run watch`) to verify `CI & Multi-Arch Docker Publish` completes green on the first attempt.

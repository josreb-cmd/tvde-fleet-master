# Local Review — 2026-09-06

**Mode**: Local (uncommitted / untracked changes)
**Decision**: REQUEST CHANGES (no CRITICAL; 1 HIGH, 4 MEDIUM)

## Scope

No tracked file changes. Five new untracked files, all Firestore backup/restore tooling:

| File | Type | Purpose |
|---|---|---|
| `exportar-shiftlogs.cjs` | Added | One-off CSV export of `shiftLogs` |
| `restaurar-shiftlogs.cjs` | Added | One-time restore of missing Aug 2026 daily records |
| `backup-function/index.js` | Added | Cloud Function Gen 2 — daily CSV backup emailed to owner |
| `backup-function/package.json` | Added | Function dependencies |
| `backup-function/.gcloudignore` | Added | Deploy ignore list |

## Summary

Operational scripts, not app source. No hardcoded secrets — the Cloud Function reads
`GMAIL_APP_PASSWORD` from Secret Manager and the local scripts rely on ADC / env
credentials, which is correct. Main issues: a filename-generation bug in the export
script, CSV formula-injection exposure in both CSV generators, no dry-run guard on a
script that writes directly to production Firestore, and duplicated CSV logic that has
already drifted between the two implementations.

## Findings

### CRITICAL
None.

### HIGH

1. **`restaurar-shiftlogs.cjs` writes to production Firestore with no dry-run / confirmation.**
   `main()` builds a batch and calls `batch.commit()` immediately after a single
   "date already exists" check (lines 82–113). There is no `--dry-run` flag, no
   interactive confirmation, and no stdout preview gate before the write. The script
   also sets `boltEarnings: 0` across 23 documents (line 97) — structurally the same
   shape as the V.2.9.4 incident that deleted records. It is idempotent by date, so a
   second run is safe, but the first run is irreversible with one careless invocation.
   *Fix:* add a `DRY_RUN` constant (default `true`) that prints the planned batch and
   exits before `commit()`, requiring an explicit `DRY_RUN=false` (or `--commit`) to
   write. Confirm the target dataset against a fresh CSV/backup export first.

### MEDIUM

2. **`exportar-shiftlogs.cjs` produces a malformed timestamp / filename (lines 136–140).**
   `new Date().toISOString()` → `2026-09-06T22:58:07.789Z`; after `replace(/[-:T]/g, "")`
   → `20260906225807.789Z`; `.slice(0, 15)` → `20260906225807.` (keeps the trailing
   dot). Result: `shiftLogs_export_20260906225807..csv` — double dot, and the format
   does not match the documented `YYYYMMDD_HHMMSS` (no separator, fractional-second
   char leaked). Still writes a file, but the name is wrong.
   *Fix:* `const ts = new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);`
   → `20260906_225807`, matching the header comment.

3. **CSV formula injection in both generators.** `csvCell` in `exportar-shiftlogs.cjs`
   (lines 61–68) and `backup-function/index.js` (lines 42–49) quote only on delimiter /
   quote / newline. A `notes` value beginning with `=`, `+`, `-`, or `@` is written
   raw and is interpreted as a formula when the file is opened in Excel. `notes` is
   free text entered in the app, and the backup CSV is emailed and opened in Excel PT
   by design. Single-tenant and low-likelihood, but it is a real injection vector in a
   file that is auto-mailed.
   *Fix:* in `csvCell`, prefix a value whose first char is in `=+-@` (also `\t`, `\r`)
   with a single quote or a leading `'`, and force-quote it.

4. **Duplicated CSV logic that has already drifted.** `formatarHoras`, `csvCell`, and
   `docParaLinha` are copy-pasted between `exportar-shiftlogs.cjs` and
   `backup-function/index.js`, and the copies already differ: comma separator +
   `.`-decimal in the export script vs `;` separator + `,`-decimal in the function.
   Any future column or escaping fix has to be made in two places.
   *Fix:* extract a shared `shiftlogs-csv.cjs` module (delimiter + decimal style as
   params) and require it from both. If the function must stay self-contained for
   deploy, at least add a comment in each file pointing at the other.

5. **`backup-function/index.js` has no error handling around Firestore read or
   `sendMail` (lines 84, 118–139).** An exception surfaces only as an unstructured
   Cloud Functions error. `docs[0].date` / `docs[docs.length - 1].date` (lines 97,
   128) also assume every document has a `date` field — a single dateless doc sorts
   first and puts `undefined` in the email body and the period line.
   *Fix:* wrap the body in `try/catch` with `console.error("backupShiftLogs failed:", err)`
   and re-throw; guard the period line with a fallback when `date` is missing.

### LOW

6. `exportar-shiftlogs.cjs` header comment names the file `exportar-shiftlogs.js`
   and `node exportar-shiftlogs.js` (lines 2–3, 10) — actual extension is `.cjs`.

7. `backup-function/index.js` emails only `josreb@gmail.com`
   (`EMAIL_TO`, line 20). CLAUDE.md notes the weekly `enviarResumoFleetMaster` goes to
   both `josreb@` and `alexreb60@`. Confirm the backup is intentionally owner-only.

8. Both local scripts sit at repo root and will land in the Cloudflare Pages build
   context. Vite will not bundle `.cjs`, so it is harmless, but a `scripts/` folder
   (or moving them next to `backup-function/`) keeps the root clean.

9. Whole-collection load + in-memory sort in all three files. Fine at ~100 documents;
   unbounded as history grows. Add `.orderBy("date")` and/or a date-range filter when
   the collection gets large.

10. No `firebase-admin` in `backup-function/package.json` — intentional and correct
    for Gen 2 using `@google-cloud/firestore` directly; noting it so it is not "fixed"
    later by mistake. `engines.node: "22"` is consistent.

## Validation

| Check | Result |
|---|---|
| Type check | Skipped — no TypeScript touched |
| Lint | Skipped — no lint config for `.cjs` ops scripts |
| Tests (`npx vitest run`) | Pass — 37/37 (23 rentabilidade + 14 monthlyStats) |
| Build | Skipped — no app source changed |

## Files Reviewed

- `exportar-shiftlogs.cjs` — Added
- `restaurar-shiftlogs.cjs` — Added
- `backup-function/index.js` — Added
- `backup-function/package.json` — Added
- `backup-function/.gcloudignore` — Added

## Recommended next steps

1. Add the dry-run guard to `restaurar-shiftlogs.cjs` before it is run or committed (HIGH).
2. Fix the timestamp slice in `exportar-shiftlogs.cjs` (MEDIUM #2).
3. Harden `csvCell` against formula injection in both generators (MEDIUM #3).
4. Decide on de-duplicating the CSV helpers (MEDIUM #4) and add `try/catch` to the
   Cloud Function (MEDIUM #5).
5. If `restaurar-shiftlogs.cjs` is a spent one-shot, consider not committing it (or
   park it under `scripts/oneoff/` with a "do not re-run" header).

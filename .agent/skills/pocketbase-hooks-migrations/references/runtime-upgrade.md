# PocketBase Runtime Upgrade Notes For XpressPOS

Read this reference before replacing the bundled PocketBase executable or changing any server-version contract. It is especially relevant to PocketBase `0.40.0+`.

## 0.40.0 changes that affect this project

- **Command exit status is stricter.** PocketBase now propagates console-command errors and recovered panics to `app.Start()`, so failed commands can exit non-zero. Treat a non-zero result from `superuser`, `migrate`, backup, or preflight commands as a real failure. Re-test any script that chains commands with `&&`; do not rely on the old successful exit status after a failed command.
- **Default security headers improve.** The runtime adds `Cross-Origin-Opener-Policy: same-origin`, and file-serving filenames are quoted in `Content-Disposition`. Do not overwrite these defaults without a documented reason. Test PocketBase Admin links opened with `target="_blank"` and downloads whose names contain spaces or special characters. XpressPOS backup names are currently restricted to a safe ASCII subset, so this is a verification item rather than an immediate migration.
- **`Record.getInt64(field)` is available.** Use it only for values that can exceed the host `int` range and remain within the JavaScript/JSON safe integer range. It does not make arbitrary large integers safe to serialize through the browser client. Keep `getInt` for ordinary counters.
- **`Store.Keys()` is available.** It can support bounded cleanup of runtime-store entries, but never use the runtime store for durable business state, authorization decisions that must survive restart, or mutable shared records.
- **Filesystem writer/delete hooks are low-level helpers.** `filesystem.NewWriter`, `OnNewWriter`, and `OnDelete` are not exposed as `core.App` methods for JSVM hooks in this release. Do not invent `$app.OnNewWriter()` or `$app.OnDelete()` calls; continue using the exposed `$filesystem`, record file APIs, and `app.newBackupsFilesystem()` contracts verified by `types.d.ts`.
- **Logs are safer by default.** `logs.maxDataSize` limits serialized `Log.Data` (zero falls back to roughly 16 KiB), and PocketBase also truncates long log messages. Keep redaction and bounded fields in hook code anyway. The native `DELETE /api/logs` endpoint is protected by `RequireSuperuserAuth`; do not replace XpressPOS's permissioned `/api/xpos/logs` proxy with the native endpoint unless the authorization and audit contract is intentionally redesigned.
- **Backups have less database contention.** Backup generation no longer transaction-locks the database for the whole generation step. This is a direct benefit for the POS, but run a concurrent write/backup smoke test and verify that the resulting archive is restorable before changing backup code or assuming a stronger consistency boundary.
- **SQLite and JSON behavior changed.** The bundled runtime updates `modernc.org/sqlite`, enables SQLite defensive mode by default, and moves to Go's `encoding/json/v2` implementation. Re-run migrations, raw SQL queries, JSON fields, log parsing, backup/restore, and hook integration tests against a clean temporary `pb_data` before accepting the upgrade.
- **Go 1.27 is required to build PocketBase.** This matters only when compiling a custom PocketBase fork or Go extension. It does not require a TypeScript client SDK update by itself.

Official references: [v0.40.0 release notes](https://github.com/pocketbase/pocketbase/releases/tag/v0.40.0), [record helpers](https://github.com/pocketbase/pocketbase/blob/v0.40.0/core/record_model.go), [runtime store](https://github.com/pocketbase/pocketbase/blob/v0.40.0/tools/store/store.go), [log settings](https://github.com/pocketbase/pocketbase/blob/v0.40.0/core/settings_model.go), and [native logs API authorization](https://github.com/pocketbase/pocketbase/blob/v0.40.0/apis/logs.go).

## Version-contract checklist

Before changing the executable, make the version a deliberate compatibility decision. The checked-in 0.40 contract must agree across bootstrap, the isolated JSVM verifier, Rust compiler/preflight, automation fixtures, and template manifests. An ignored local `pb/.version` or executable can temporarily remain on the prior version until bootstrap runs; do not edit that marker manually to claim an upgrade that has not happened.

Update and verify all of these together when the upgrade is approved:

- `pb/pocketbase.exe`, `pb/.version`, and the platform sidecar supplied by `scripts/bootstrap-pb.mjs`.
- `scripts/bootstrap-pb.mjs` and `scripts/verify-pocketbase-jsvm.mjs`.
- `src-tauri/src/automation/compiler.rs`, preflight error/report fixtures, and Rust tests.
- Automation template compatibility manifests and integration fixtures that persist `binaryVersion`/`pocketbase`.
- `pb/pb_data/types.d.ts`, regenerated from the new executable rather than copied from online docs.

Do not broaden a strict version pin merely to make a verifier pass. If the runtime contract is intentionally widened, document which APIs and behavior are compatible and add tests for the lowest supported version.

### Bootstrap integrity contract

The bootstrap flow is part of the runtime contract, not just a convenience downloader:

- Download the named archive and the release `checksums.txt` into a private temporary directory, verify the archive's exact SHA-256 entry, then extract it.
- Run the extracted executable's isolated `--version` probe before overwriting either the Tauri sidecar or `pb/pocketbase`; a release filename or checksum alone is not proof of the runtime command contract.
- Treat `.version` only as a post-install marker. Write it after both copies succeed, and when deciding to skip a download, verify the actual local binary and sidecar versions in isolated workspaces. A matching marker alone is not sufficient.

## Required upgrade verification

Use isolated temporary data and preserve the repository's migration history:

```powershell
node scripts/verify-pocketbase-jsvm.mjs --version-only
node scripts/verify-pocketbase-jsvm.mjs
node scripts/verify-pocketbase-hooks-integration.mjs
```

For migrations, apply `migrate up`, inspect schema and data invariants, run `migrate down 1`, then re-run `migrate up` against a disposable `pb_data`. Include a clean-install run with the complete migration directory. Exercise the XpressPOS backup create/download/restore flow and at least one write while a backup is being generated.

Stop and report instead of weakening the gate if any of these occur: the version probe disagrees with the binary, generated types do not expose the expected API, a command changes from success to failure, migration round-trip changes data outside the intended scope, or a backup cannot be restored.

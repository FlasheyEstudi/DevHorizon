---
name: pocketbase-hooks-migrations
description: Create, refactor, audit, and optimize PocketBase `pb_hooks/*.pb.js` entrypoints, CommonJS `_shared` services, `routerAdd(...)` endpoints, event hooks, database queries, and `pb_migrations/*.js` migrations for XpressPOS. Use for PocketBase hook or route bugs, JSVM handler-scope failures, transaction or concurrency safety, custom API security, RBAC, schema changes, data migrations, query performance, idempotency, and PocketBase JS SDK integration with custom routes.
---

# PocketBase Hooks Migrations

## Start With Evidence

1. Confirm the active branch is `dev`; never modify `main`.
2. Read `pb/README.md`, `pb/pb_migrations/README.md`, and nearby domain files.
3. Confirm the bundled server version with the isolated probe `node scripts/verify-pocketbase-jsvm.mjs --version-only` and record the client SDK version in `package.json`. Do not run a bare `pb/pocketbase.exe --version` from the repository root: it can load the repository hooks and migrations.
4. Compare every version surface before changing the runtime: `pb/.version`, `scripts/bootstrap-pb.mjs`, the JSVM verifier pin, Rust preflight/compiler constants, automation compatibility manifests/fixtures, the sidecar binary, and `pb/pb_data/types.d.ts`.
5. Use `pb/pb_data/types.d.ts` as the executable-specific API authority. Regenerate it after a bundled-runtime upgrade and check the current official docs when behavior or signatures may have changed.
6. Read [references/runtime-upgrade.md](references/runtime-upgrade.md) before evaluating or replacing a bundled PocketBase runtime, especially for PocketBase 0.40.0 or newer.
7. Identify the single owner of the business effect before adding a callback. Never duplicate stock, kardex, caja, credit, promotion, or synchronization effects.

## Load Only What The Task Needs

- Read [references/jsvm-scope.md](references/jsvm-scope.md) for every hook, route, middleware, cron handler, or shared module change.
- Read [references/runtime-patterns.md](references/runtime-patterns.md) for hook selection, routing, input binding, queries, authorization, logging, HTTP, or performance work.
- Read [references/migration-patterns.md](references/migration-patterns.md) for schema, index, rule, view, snapshot, seed, or data migration work.
- Reuse [assets/route-hook-template.pb.js](assets/route-hook-template.pb.js), [assets/hook-entrypoint-template.pb.js](assets/hook-entrypoint-template.pb.js), [assets/shared-service-template.js](assets/shared-service-template.js), and [assets/migration-template.js](assets/migration-template.js) when applicable.

## Choose The Correct Extension Point

| Need | Use |
| --- | --- |
| A new application command/query API | Namespaced `routerAdd(...)` route |
| Validate or modify a built-in Web API request | `onRecord*Request` / `onCollection*Request` |
| Enforce an invariant for every save, regardless of caller | Record/collection model hook |
| Observe only committed persistence | `onRecordAfter*Success` |
| Execute a durable external follow-up | Persist an outbox item in the transaction; dispatch after commit |
| Change schema or data exactly once | `migrate(up, down)` |

Do not use a model hook when request auth, headers, body, or query data is required; model hooks have no request context.

## Implement Thin Entrypoints

1. Register only the handler in the root `pb_hooks/*.pb.js` file.
2. Inside the handler, load reusable logic with ``require(`${__hooks}/_shared/...`)``.
3. Keep `_shared` modules stateless, registration-free, and exported with `Object.freeze`.
4. Pass `e.app || $app` to services; inside `runInTransaction`, pass and use only `txApp`.
5. Make commands idempotent with a stable source identity when retries could duplicate business effects.
6. Use collection filters on hooks so unrelated records do not execute the handler.

## Preserve Handler Semantics

- A handler is serialized into an isolated program. It cannot capture custom top-level variables or functions.
- Require shared modules inside the handler or define helpers inside it. Never call a top-level factory from the handler.
- Call `e.next()` exactly once in hooks and middlewares that continue the chain. Routes normally return a response instead.
- Code before `e.next()` runs before the next handler/default action; code after it runs afterward.
- A successful create/update/delete model hook is not proof of commit. Use `After*Success` for commit observation.
- Do not perform external HTTP, email, filesystem, or slow computation inside a database transaction.

## Secure Routes And Queries

- Attach `$apis.requireAuth(...)`; then enforce the domain permission with XpressPOS authorization services. Authentication alone is not authorization.
- Use `$apis.bodyLimit(...)` for bounded JSON commands and uploads.
- Prefer `e.bindBody(new DynamicModel(...))` or `e.requestInfo().body` for structured input. Use raw parsing only when the payload shape requires it.
- Throw PocketBase `ApiError` factories; use `ValidationError` maps for field-level errors.
- Bind all untrusted filter and SQL values with `{:name}` parameters or `$dbx` expressions.
- Custom routes bypass collection API rules. Use explicit domain authorization or `canAccessRecord(...)`.
- Use `$apis.enrichRecord(s)` when returning Record models so expansions and field visibility follow PocketBase behavior.
- Never log tokens, credentials, customer data, request bodies, or hook source.
- Keep structured log data bounded and sanitized before logging; a PocketBase runtime log-size limit is a safeguard, not a substitute for redaction.

## Optimize Without Breaking Invariants

- Query only needed columns/rows, apply a limit, and batch or expand relations instead of creating N+1 lookups.
- Prefer record helpers for domain writes because raw SQL bypasses record hooks. If raw SQL is intentional, prove every skipped invariant.
- Do not use `saveNoValidate()` in normal application code; it skips validation hooks.
- Use PocketBase Go-backed helpers such as `$security` instead of CPU-heavy pure JavaScript.
- Keep shared CommonJS exports immutable because the module registry is shared.
- Tune `--hooksPool` only after measuring concurrency and memory; never treat it as a code fix.

## Migration Rules

- Follow the current `NNNN_descripcion_corta.js` convention.
- Treat the migration `app` as already transactional; do not wrap it in `runInTransaction`.
- Use concrete fields such as `TextField`, `NumberField`, and `RelationField`.
- Batch related collection mutations and save once.
- Use `collection.addIndex(...)` / `removeIndex(...)` when supported by `types.d.ts`.
- Do not silently skip an existing but incompatible field or index; validate expected shape or fail with a useful error.
- Never edit an applied migration. Add a new one, with a safe `down` or an explicit rollback limitation.

## Verify

Run the smallest relevant set, then the integration boundary:

```powershell
node scripts/verify-pocketbase-jsvm.mjs --version-only
node scripts/verify-pocketbase-jsvm.mjs
node scripts/verify-pocketbase-hooks-integration.mjs
```

If the version-only gate rejects a newer bundled version, report the stale verifier pin separately; do not misdiagnose it as a hook failure or weaken the exact runtime check silently. For a runtime upgrade, also follow the version, migration, backup, log, and JSON compatibility gates in [references/runtime-upgrade.md](references/runtime-upgrade.md).

If entrypoints or business effects changed:

```powershell
node scripts/verify-pocketbase-hook-rollback.mjs
```

If a migration changed, test `migrate up`, `migrate down 1`, re-`up`, and a clean temporary `pb_data`. Do not rewrite production migration history.

Report the files changed, the extension point chosen, transaction/idempotency behavior, and exact validation results.

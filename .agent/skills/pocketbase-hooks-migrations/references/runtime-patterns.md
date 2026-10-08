# PocketBase Runtime Patterns For XpressPOS

## Contents

1. Handler and hook selection
2. Routes and middleware
3. Authorization and response safety
4. Database and record APIs
5. Transactions and durable effects
6. HTTP, logging, and realtime
7. Performance
8. Client boundary

Official sources:

- <https://pocketbase.io/docs/js-overview/>
- <https://pocketbase.io/docs/js-event-hooks/>
- <https://pocketbase.io/docs/js-routing/>
- <https://pocketbase.io/docs/js-database/>
- <https://pocketbase.io/docs/js-records/>
- <https://pocketbase.io/docs/js-collections/>
- <https://pocketbase.io/docs/js-migrations/>
- <https://pocketbase.io/jsvm/>

The XpressPOS bundle determines compatibility. Prefer `pb/pb_data/types.d.ts` when current web docs and the executable differ, and regenerate it after a bundled-runtime upgrade. Read [runtime-upgrade.md](runtime-upgrade.md) before changing the executable version.

## 1. Handler And Hook Selection

Every hook handler must call `e.next()` to continue. Throwing or omitting it stops the chain.

Choose phase intentionally:

- Before `e.next()`: validate or modify before the default operation.
- After `e.next()`: observe the completed handler/default DB statement, but not necessarily a committed transaction.
- `onRecordAfter*Success`: run only after persistence commits.
- `onRecordAfter*Error`: observe immediate save errors or delayed transaction rollbacks.
- `onRecord*Request`: use when auth, headers, body, or query context is needed.
- Model hooks: enforce caller-independent invariants; they have no request context.
- `onRecordEnrich`: hide or add request-specific response data. Call `withCustomData(true)` before exporting custom properties.

Filter hooks by collection names. Avoid catch-all hooks on hot record paths.

`onBootstrap` cannot access the database before `e.next()`.

## 2. Routes And Middleware

Namespace routes under `/api/xpos/<domain>/vN/...` to avoid system collisions.

Prefer built-in middleware:

- `$apis.requireAuth("users")`
- `$apis.requireSuperuserAuth()`
- `$apis.requireSuperuserOrOwnerAuth("id")`
- `$apis.bodyLimit(bytes)`
- `$apis.gzip()` for large compressible read responses
- `$apis.skipSuccessActivityLog()` only for intentionally noisy, low-audit-value endpoints

The global rate limiter applies only when configured in PocketBase settings. Do not invent an in-memory per-handler limiter.

Use:

- `e.request.pathValue("id")` for path params
- `e.request.url.query().get("q")` for one query value
- `e.request.header.get("Idempotency-Key")` for headers
- `e.requestInfo()` for normalized request/auth metadata
- `e.bindBody(new DynamicModel({...}))` for typed simple bodies
- `e.findUploadedFiles("field")` for uploads
- `e.set()` / `e.get()` to share request-local middleware data

For field errors:

```js
throw new BadRequestError("Datos invalidos", {
  cantidad: new ValidationError("min", "Debe ser mayor que cero"),
})
```

## 3. Authorization And Response Safety

Custom routes execute with application database authority and do not automatically enforce collection API rules.

- Require authentication with middleware.
- Enforce the XpressPOS permission separately.
- Bind the authenticated actor to payload ownership; do not trust actor IDs from the body.
- Use `e.app.canAccessRecord(record, e.requestInfo(), rule)` when a route must mirror a collection rule.
- Use `$apis.enrichRecord` / `$apis.enrichRecords` before returning Record models. They apply expansion and auth-field visibility behavior.
- Return explicit DTOs for command responses; do not expose internal Records accidentally.
- Use `e.hasSuperuserAuth()` instead of approximating superuser state.

## 4. Database And Record APIs

Use typed getters:

- `getString`, `getBool`, `getInt`, `getInt64` (PocketBase 0.40+), `getFloat`, `getDateTime`, `getStringSlice`
- `original()` to compare persisted old values during updates
- `fresh()` for latest clean model data
- `expandedOne()` / `expandedAll()` after expansion
- `unmarshalJSONField()` for structured JSON

Use bound query values:

```js
const records = appRef.findRecordsByFilter(
  "productos",
  "activo = true && categoria = {:category}",
  "nombre",
  50,
  0,
  { category }
)
```

For raw SQL:

```js
const rows = arrayOf(new DynamicModel({ id: "", total: -0 }))
appRef.db()
  .newQuery("SELECT id, total FROM ventas WHERE fecha >= {:from} LIMIT 100")
  .bind({ from })
  .all(rows)
```

Use `$dbx.hashExp`, `$dbx.exp` with params, `$dbx.in`, `$dbx.like`, `$dbx.between`, and query builder methods for composable queries. `$dbx.like` escapes wildcard characters.

Optimization rules:

- Select only needed columns.
- Apply deterministic sort and limit.
- Use `countRecords` for counts instead of loading rows.
- Use `expandRecords` or a set-based query instead of per-record relation lookups.
- Add an index only after matching the actual filter/join/order pattern.
- Raw SQL writes skip Record hooks; do not bypass domain invariants accidentally.

## 5. Transactions And Durable Effects

`runInTransaction` commits only when the callback returns without throwing.

- Use only `txApp` inside.
- Keep the transaction short.
- Validate cheap input before opening it.
- Re-read authoritative mutable records inside it.
- Write an idempotency marker and the business effect atomically.
- Back the source identity with a unique database index; a read-before-write check alone races.
- Store a canonical payload hash and reject reuse of the same source ID with different input.
- Build the response inside, return it after commit.
- Do not perform `$http.send`, email, file I/O, sleeps, or expensive computation inside.

For external automation, payments, email, or synchronization follow-ups, write an outbox record in the business transaction. Dispatch after commit with retry and deduplication.

## 6. HTTP, Logging, And Realtime

Use `$http.send({ url, method, headers, body, timeout })`; it throws on timeout/connectivity errors. Always set an intentional timeout and inspect `statusCode`.

Log with `$app.logger().info|warn|error(message, key, value, ...)`. Structured logs are debounced and batched, but still avoid noisy hot-loop logs. PocketBase 0.40+ bounds serialized `Log.Data` through `logs.maxDataSize`; keep fields small and redact before logging because truncation is not a privacy boundary.

The native `DELETE /api/logs` route is superuser-only in PocketBase 0.40+. A custom XpressPOS log route must retain its own domain permission and audit behavior rather than forwarding that endpoint to ordinary authenticated users.

Never log secrets, tokens, customer details, bodies, or hook code. Prefer stable operation IDs, safe error codes, duration, and record IDs.

Use realtime messaging only for ephemeral notifications. Durable business truth belongs in records/outbox because disconnected clients can miss messages.

## 7. Performance

PocketBase prewarms a JS runtime pool. `--hooksPool` can increase concurrency and memory use, but should be tuned only from measurements.

- Avoid CPU-heavy pure JavaScript on request paths.
- Prefer Go-backed `$security` helpers for hashes/random values.
- Avoid unbounded loops and record loads.
- Do not use `setTimeout` or `setInterval`; they are unsupported.
- Keep CommonJS modules stateless; the shared registry makes mutable caches unsafe without a proven concurrency design.
- PocketBase 0.40+ reduces database contention during backup generation; still keep backup operations outside business transactions and verify restore behavior after a runtime upgrade.

## 8. Client Boundary

XpressPOS uses the official JavaScript SDK. When changing a custom route:

- Call it with `pb.send(...)`.
- Parse `ClientResponseError.status`, `.response`, and `.isAbort`.
- Use `pb.filter(expr, params)` for client-built filters.
- Remember that duplicate pending SDK requests auto-cancel by request key. Set a deliberate unique `requestKey` for concurrent commands or `null` only when duplicate execution is safe.
- Keep command idempotency server-side; disabling client cancellation is not a substitute.
- Regenerate or update TypeScript contracts when response shapes change.

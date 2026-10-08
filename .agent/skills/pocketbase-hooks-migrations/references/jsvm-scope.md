# PocketBase JSVM Scope And Runtime Boundaries

## Official Runtime Rule

PocketBase serializes every hook, route, and middleware handler and executes it as an isolated program. Custom variables and functions declared outside the handler are unavailable inside it. This is documented behavior, not a repo-specific inference.

Sources:

- <https://pocketbase.io/docs/js-overview/#handlers-scope>
- <https://pocketbase.io/jsvm/>

The isolation also makes stack-trace line numbers imprecise. Diagnose the actual handler and its required modules, not only the reported line.

## Safe Patterns

Use one of these:

1. Define a small helper inside the handler.
2. Load a stateless CommonJS module inside the handler with ``require(`${__hooks}/...`)``.
3. Pass every runtime dependency, especially `appRef` or `txApp`, into the shared service.

## Bad Pattern

```js
function requireAuthPermission(auth, permission) {
  // ...
}

routerAdd("POST", "/api/xpos/example", (e) => {
  requireAuthPermission(e.auth, "pos.return")
  return e.json(200, { ok: true })
})
```

Registration can succeed and the real request can later fail with `ReferenceError`.

## Good Pattern: Handler-Local Helper

```js
routerAdd("POST", "/api/xpos/example", (e) => {
  function requireAuthPermission(auth, permission) {
    if (!auth) throw new UnauthorizedError("Se requiere autenticacion")
    // ...
  }

  requireAuthPermission(e.auth, "pos.return")
  return e.json(200, { ok: true })
})
```

## Good Pattern: Require A Shared Service Inside The Handler

```js
routerAdd("POST", "/api/xpos/example", (e) => {
  const service = require(`${__hooks}/_shared/inventory/example.js`)
  let result = null

  e.app.runInTransaction((txApp) => {
    result = service.execute(txApp, { actorId: e.auth.id })
  })

  return e.json(200, result)
}, $apis.requireAuth("users"))
```

Shared module:

```js
function execute(appRef, input) {
  const collection = appRef.findCollectionByNameOrId("inventario_ajustes")
  const record = new Record(collection)
  record.set("usuario_id", input.actorId)
  appRef.save(record)
  return { id: record.id }
}

module.exports = Object.freeze({ execute })
```

## CommonJS Registry Caveat

Only CommonJS modules are supported directly. Resolve local modules through the absolute `__hooks` path because relative paths use the process working directory.

Loaded modules share a registry:

- Export frozen APIs.
- Keep module state immutable.
- Never cache auth records, actors, permissions, request data, transactions, or mutable Records.
- Do not register `routerAdd`, `onRecord*`, or `cronAdd` from `_shared`.
- Do not depend on Node/browser globals such as `fs`, `fetch`, `window`, or `Buffer`.

## Transaction Boundary

Inside `runInTransaction`, always use the supplied `txApp`. Using `$app` for a write can deadlock because PocketBase allows one writer/transaction at a time. Nested transactions are safe only when nested code continues using the current transactional app.

Never hide `$app` inside a shared write service. Pass `appRef`.

## Runtime Limitations

- No `setTimeout` or `setInterval`; one handler does not execute JavaScript concurrently.
- JSON database fields must be accessed with Record `get()` / `set()` or unmarshaled explicitly.
- Wrapped Go maps/slices are not always native JavaScript values. Normalize at boundaries when needed.
- Prefer `$security`, `$http`, `$filesystem`, and other exposed Go bindings over unsupported runtime APIs or heavy pure-JS work.

## Review Checklist

- Every handler dependency is local or required inside the handler.
- Every shared module is stateless and immutable.
- Every transactional write receives `txApp`.
- Every hook/middleware calls `e.next()` exactly once when continuing.
- No route calls `e.next()` instead of returning its response.

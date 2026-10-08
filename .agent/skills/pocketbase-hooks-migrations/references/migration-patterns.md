# PocketBase Migration Patterns For This Repo

## Current XpressPOS Convention

Use `NNNN_descripcion_corta.js` after the consolidated baseline:

- `1000_collections_snapshot.js` is the schema baseline.
- Seeds remain separate from schema.
- Add a new migration after production; never edit one already applied.
- Module-owned collections use their domain prefix (`hc_`, `rest_`, `taller_`, `farm_`).

Read `pb/pb_migrations/README.md` and `docs/DATABASE.md` before changing schema.

## Runtime Semantics

- PocketBase records applied filenames in `_migrations`.
- Every unapplied migration runs in a transaction on `serve` or `migrate up`.
- Both `up` and `down` receive a transactional `app`; do not open another transaction.
- Each file contains one `migrate(up, down)` call.
- Restart `serve` after manual up/down so cached collections refresh.

## Standard File Shape

```js
/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // up
}, (app) => {
  // down
})
```

Use the generated `pb_data/types.d.ts` for the bundled PocketBase version.

## Schema Mutations

- Use concrete field classes such as `TextField`, `NumberField`, `RelationField`, and `JSONField`.
- Resolve relation collection IDs before constructing relation fields.
- Batch related field/index/rule changes, then save the collection once.
- Prefer `collection.addIndex(name, unique, columnsExpr, whereExpr)` and `removeIndex(name)` when supported.
- Add indexes only for proven filter, join, uniqueness, grouping, or ordering patterns.
- Keep index names stable and explicit.

```js
const field = collection.fields.getByName("source_id")
if (!field) {
  collection.fields.add(new TextField({
    name: "source_id",
    required: false,
    max: 64,
  }))
  changed = true
} else if (field.type() !== "text") {
  throw new Error("source_id exists with an incompatible type")
}

if (!collection.getIndex("idx_events_source")) {
  collection.addIndex("idx_events_source", true, "source_id", "source_id != ''")
  changed = true
}

if (changed) app.save(collection)
```

Existence checks make compatibility safe, but do not silently accept schema drift. Validate critical existing field/index options or fail clearly.

Use `try/catch` only when absence is explicitly acceptable:

```js
try {
  const legacy = app.findCollectionByNameOrId("legacy_view")
  app.delete(legacy)
} catch (_) {
  // Missing is an accepted legacy state.
}
```

## Collection And View Creation

Use `new Collection({...})`, define fields/rules/indexes completely, and save once. Missing system fields are populated automatically.

For view collections, keep SQL readable and explicit. Prefer `COALESCE(...)`, explicit `GROUP BY`, bounded joins, and a stable synthetic `id`.

## Rules And RBAC

This repo commonly uses:

```js
const isAppAdmin = '@request.auth.role.is_super_admin = true'
const hasPerm = (permission) => `@request.auth.role.permissions ?~ "${permission}"`
const requirePerm = (permission) => `(${isAppAdmin} || ${hasPerm(permission)})`
const authOnly = '@request.auth.id != ""'
```

- Keep permission namespaces aligned with the domain.
- Update permission seeding/upgrades when existing roles need a new permission.
- Keep route-level authorization aligned with collection-rule intent.

## Data Migrations

- Bind all data values in raw SQL with named parameters.
- Remember that raw SQL does not fire Record event hooks.
- Prefer Record APIs when hooks own required invariants.
- Never use `saveNoValidate()` casually; it skips validation hooks.
- Make retry/re-entry safe when a partially deployed legacy state is possible.
- Avoid loading unbounded record sets; process deterministic bounded pages when data can be large.

## Down Migration

- Remove only artifacts introduced by `up`.
- Restore previous rule/index/field values when known.
- Do not destroy pre-existing business data.
- If reversal is not safely possible, state the limitation in a short comment and fail safely rather than inventing data.

## Snapshots And History

- `migrate collections` creates a collection snapshot.
- Snapshot import is extend-mode by default; switching the delete-missing flag to true is destructive.
- `migrate history-sync` is for cleaning local development history. Never use it to rewrite deployed production history.

## Verification

Test against a temporary copy or empty `pb_data`:

1. `migrate up`
2. Inspect schema/data invariants.
3. `migrate down 1`
4. Re-run `migrate up`.
5. Start PocketBase and run the hook integration suite.

Never experiment against the user's only production-like database.

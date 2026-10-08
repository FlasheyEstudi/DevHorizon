/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess(function (e) {
  const service = require(`${__hooks}/_shared/example/service.js`)

  // AfterSuccess observes a committed record. Keep the service idempotent
  // because retries or duplicate source events must not duplicate effects.
  e.app.runInTransaction(function (txApp) {
    service.execute(txApp, {
      sourceId: e.record.id,
      actorId: e.record.getString("usuario_id"),
    })
  })

  return e.next()
}, "example_collection")

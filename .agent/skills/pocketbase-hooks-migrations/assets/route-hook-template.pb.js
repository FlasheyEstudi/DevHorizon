/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/xpos/example/v1/commands", function (e) {
  require(`${__hooks}/_shared/license/seat-guard.js`).requireLicenseSeat(e)

  const authorization = require(`${__hooks}/_shared/platform/authorization.js`)
  const service = require(`${__hooks}/_shared/example/service.js`)
  const actor = authorization.requirePermission(e.auth, "example.manage")

  const input = new DynamicModel({
    sourceId: "",
    cantidad: -0,
    notas: "",
  })
  e.bindBody(input)

  const sourceId = String(input.sourceId || "").trim()
  const cantidad = Number(input.cantidad || 0)
  const validation = {}
  if (!sourceId) {
    validation.sourceId = new ValidationError("required", "sourceId es requerido")
  }
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    validation.cantidad = new ValidationError("min", "cantidad debe ser mayor que cero")
  }
  if (Object.keys(validation).length > 0) {
    throw new BadRequestError("Datos invalidos", validation)
  }

  let responsePayload = null
  e.app.runInTransaction(function (txApp) {
    responsePayload = service.execute(txApp, {
      sourceId,
      cantidad,
      notas: String(input.notas || "").trim(),
      actorId: actor.actorId,
    })
  })

  return e.json(200, responsePayload)
}, $apis.requireAuth("users"), $apis.bodyLimit(64 * 1024))

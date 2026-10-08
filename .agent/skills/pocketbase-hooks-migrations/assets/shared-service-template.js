"use strict"

function execute(appRef, input) {
  if (!appRef || !input || !input.sourceId) {
    throw new BadRequestError("Entrada invalida")
  }

  // Back source_id with a UNIQUE index. This lookup optimizes normal replays;
  // the database constraint remains the authority under concurrent requests.
  const matches = appRef.findRecordsByFilter(
    "example_effects",
    "source_id = {:sourceId}",
    "",
    1,
    0,
    { sourceId: input.sourceId }
  )
  const existing = matches.length > 0 ? matches[0] : null

  if (existing) {
    return Object.freeze({ id: existing.id, alreadyProcessed: true })
  }

  const collection = appRef.findCollectionByNameOrId("example_effects")
  const record = new Record(collection)
  record.set("source_id", input.sourceId)
  record.set("actor_id", input.actorId || "")
  appRef.save(record)

  return Object.freeze({ id: record.id, alreadyProcessed: false })
}

module.exports = Object.freeze({ execute })

/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("example_collection")
  let changed = false

  const existingField = collection.fields.getByName("example_field")
  if (!existingField) {
    collection.fields.add(new TextField({
      name: "example_field",
      required: false,
      max: 120,
    }))
    changed = true
  } else if (existingField.type() !== "text") {
    throw new Error("example_field exists with an incompatible type")
  }

  if (!collection.getIndex("idx_example_collection_example_field")) {
    collection.addIndex(
      "idx_example_collection_example_field",
      false,
      "example_field",
      ""
    )
    changed = true
  }

  if (changed) app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("example_collection")
  collection.fields.removeByName("example_field")
  collection.removeIndex("idx_example_collection_example_field")
  app.save(collection)
})

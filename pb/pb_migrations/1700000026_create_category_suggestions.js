/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000026_create_category_suggestions.js
// =============================================================================
// Crea la coleccion `category_suggestions`: el buzon de propuestas de categoria
// que los artesanos (rol seller) envian desde su panel y el admin revisa.
//
// POR QUE UNA COLECCION APARTE:
//   `categories` tiene createRule/updateRule/deleteRule = "@request.auth.role
//   = 'admin'", asi que los sellers no pueden escribir ahi — y no deben: la
//   taxonomia la cura el admin. Las sugerencias viven en su propia coleccion,
//   con reglas que dejan al seller crear/ver las suyas y al admin revisarlas.
//   Al aprobar, el endpoint `/api/admin/suggestions/[id]` crea el registro real
//   en `categories` y marca la sugerencia como 'approved'.
//
// Reglas:
//   list / view : el admin ve todas; el seller ve solo las suyas.
//   create      : seller o admin, pero el registro debe apuntarse a si mismo
//                 (suggested_by = @request.auth.id) — nadie suplanta a otro.
//   update      : solo admin (es quien cambia status / admin_note / revisa).
//   delete      : admin, o el propio seller mientras siga 'pending'
//                 (para poder retirar una propuesta sin molestar al admin).
//
// Patron de dos pasos (igual que 1700000001): primero se crea la coleccion
// base y despues se agregan los campos que referencian otras colecciones ya
// resueltas (`parent` -> categories, `suggested_by`/`reviewed_by` -> users).
//
// created_at/updated_at (autodate) se agregan en el segundo `app.save`, porque
// las colecciones de este proyecto solo traen el system field `id` y
// `created`/`updated` no son ordenables en PB 0.27 (ver 1700000014/1700000023).
//
// Down: elimina la coleccion.
// =============================================================================

migrate((app) => {
  const usersCol = app.findCollectionByNameOrId("users");
  const categoriesCol = app.findCollectionByNameOrId("categories");

  // Paso 1: coleccion base (sin los autodate, que van en el paso 2).
  const collection = new Collection({
    name: "category_suggestions",
    type: "base",
    listRule: '@request.auth.role = "admin" || suggested_by = @request.auth.id',
    viewRule: '@request.auth.role = "admin" || suggested_by = @request.auth.id',
    createRule:
      '(@request.auth.role = "seller" || @request.auth.role = "admin") && suggested_by = @request.auth.id',
    updateRule: '@request.auth.role = "admin"',
    deleteRule:
      '@request.auth.role = "admin" || (suggested_by = @request.auth.id && status = "pending")',
    fields: [
      { name: "name", type: "text", required: true },
      { name: "slug", type: "text", required: true, options: { pattern: "^[a-z0-9-]+$" } },
      { name: "description", type: "text", required: false },
      { name: "icon", type: "text", required: false },
      {
        name: "parent",
        type: "relation",
        required: false,
        collectionId: categoriesCol.id,
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        name: "suggested_by",
        type: "relation",
        required: false,
        collectionId: usersCol.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["pending", "approved", "rejected"],
        defaultValue: "pending",
      },
      { name: "admin_note", type: "text", required: false },
      {
        name: "reviewed_by",
        type: "relation",
        required: false,
        collectionId: usersCol.id,
        cascadeDelete: false,
        maxSelect: 1,
      },
    ],
    indexes: [
      "CREATE INDEX idx_category_suggestions_status ON category_suggestions (status)",
      "CREATE INDEX idx_category_suggestions_suggested_by ON category_suggestions (suggested_by)",
    ],
  });

  app.save(collection);

  // Paso 2: sellos de fecha autodate (patron 1700000014/1700000023 —
  // onCreate/onUpdate van a NIVEL DEL FIELD, no dentro de `options`).
  collection.fields.add(new Field({
    name: "created_at",
    type: "autodate",
    required: false,
    onCreate: true,
    onUpdate: false,
  }));
  collection.fields.add(new Field({
    name: "updated_at",
    type: "autodate",
    required: false,
    onCreate: true,
    onUpdate: true,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("category_suggestions");
  app.delete(collection);
});

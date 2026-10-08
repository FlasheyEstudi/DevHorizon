/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000013_reviews_user_name_snapshot.js
// =============================================================================
// Agrega el campo `user_name_snapshot` (texto) a la coleccion `reviews`.
//
// Problema que resuelve:
//   La coleccion `users` de PocketBase tiene por defecto
//   `viewRule: "id = @request.auth.id"` -> un user solo puede verse a si
//   mismo. Eso significa que al hacer `expand: 'user'` desde /api/reviews,
//   intentando obtener el nombre del autor de cada resena, falla cuando el
//   request lo hace otro user (o sin sesion). Termina en 500.
//
// Solucion:
//   Denormalizar el nombre al momento de crear la resena. Guardamos una
//   copia del nombre del user en `user_name_snapshot`. La GET lo devuelve
//   directo, sin necesidad de expand.
//
// Trade-off:
//   Si un user cambia su `name` despues de dejar una resena, la resena
//   seguira mostrando el nombre VIEJO. Aceptable para v1 (los nombres no
//   cambian seguido).
// =============================================================================

migrate((app) => {
  const collection = app.findCollectionByNameOrId("reviews");
  collection.fields.add(new Field({
    name: "user_name_snapshot",
    type: "text",
    required: false,
    options: { max: 200 },
  }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("reviews");
  collection.fields.removeByName("user_name_snapshot");
  app.save(collection);
});
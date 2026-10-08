/// <reference path="../pb_data/types.d.ts" />

// =============================================================================
// 1700000016_create_news.js
// =============================================================================
// Crea la coleccion `news` para publicaciones y noticias del portal.
// =============================================================================

migrate((app) => {
  const collection = new Collection({
    name: "news",
    type: "base",
    listRule: "status = 'published'",
    viewRule: "status = 'published'",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'",
    fields: [
      { name: "title", type: "text", required: true },
      { name: "slug", type: "text", required: true, options: { pattern: "^[a-z0-9-]+$" } },
      { name: "summary", type: "text", required: false },
      { name: "content", type: "editor", required: true },
      {
        name: "image",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 5 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["draft", "published"],
        defaultValue: "published",
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_news_slug ON news (slug)",
      "CREATE INDEX idx_news_status ON news (status)",
    ],
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("news");
  app.delete(collection);
});

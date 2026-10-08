/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    pb: import('pocketbase').default;
    user: import('pocketbase').RecordModel | null;
    runtime: 'ssr' | 'static';
  }
}

interface ImportMetaEnv {
  readonly POCKETBASE_URL: string;
  readonly PUBLIC_POCKETBASE_URL: string;
  readonly POCKETBASE_ADMIN_EMAIL?: string;
  readonly POCKETBASE_ADMIN_PASSWORD?: string;
  readonly PUBLIC_SITE_ORIGIN: string;
  readonly PUBLIC_ALLOWED_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

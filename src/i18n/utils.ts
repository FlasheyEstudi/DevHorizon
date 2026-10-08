// =============================================================================
// utils.ts — Helpers para i18n
// =============================================================================
// - getLangFromUrl(url): detecta el locale actual segun el path (/... -> es, /en/... -> en).
// - useTranslations(lang): retorna una funcion t(key) que busca en el diccionario.
// =============================================================================

import { ui, defaultLang, type Lang } from './ui';

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang && lang in ui) return lang as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: string): string {
    return (ui[lang] as Record<string, string>)[key]
      ?? (ui[defaultLang] as Record<string, string>)[key]
      ?? key;
  };
}

/** Construye un path en un locale dado, preservando el resto del path. */
export function localizePath(path: string, lang: Lang): string {
  // Quitar /inicial (/) y limpiar
  const cleanPath = path.replace(/^\//, '');
  if (lang === defaultLang) {
    return cleanPath ? `/${cleanPath}` : '/';
  }
  return cleanPath ? `/${lang}/${cleanPath}` : `/${lang}/`;
}

/** Devuelve el path sin prefijo de idioma (/es/..., /en/..., /miq/...) */
export function getPathWithoutLocale(pathname: string): string {
  return pathname.replace(/^\/(es|en|miq)(?=\/|$)/, '') || '/';
}

/** Cambia el idioma preservando el pathname actual y query params */
export function switchLocalePath(pathname: string, targetLang: Lang, search = ''): string {
  const cleanPath = getPathWithoutLocale(pathname);
  const localized = localizePath(cleanPath === '/' ? '' : cleanPath, targetLang);
  return `${localized}${search}`;
}

/** Devuelve el siguiente locale para switchers secuenciales */
export function getOtherLocale(lang: Lang): Lang {
  if (lang === 'es') return 'en';
  if (lang === 'en') return 'miq';
  return 'es';
}
// =============================================================================
// admin/AdminApp.tsx — Isla principal del Panel de Super Admin
// =============================================================================
// Contenedor de tabs del panel /admin. Una sola isla = estado de navegacion
// compartido sin coordinacion cross-island (mismo patron que ProfileApp).
//
// Tabs:
//   - categories  : CRUD de categorias/subcategorias (CategoriesSection).
//   - news        : crear/editar/publicar noticias (NewsSection).
//   - suggestions : revisar propuestas de los artesanos (SuggestionsSection).
// =============================================================================

import { useState } from 'react';
import { Tags, Newspaper, Lightbulb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Lang } from '../../i18n/ui';
import { useTranslations } from '../../i18n/utils';
import CategoriesSection from './CategoriesSection';
import NewsSection from './NewsSection';
import SuggestionsSection from './SuggestionsSection';

type AdminTab = 'categories' | 'news' | 'suggestions';

interface TabDef {
  key: AdminTab;
  labelKey: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { key: 'categories', labelKey: 'admin.tabs.categories', icon: Tags },
  { key: 'news', labelKey: 'admin.tabs.news', icon: Newspaper },
  { key: 'suggestions', labelKey: 'admin.tabs.suggestions', icon: Lightbulb },
];

export default function AdminApp({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const [tab, setTab] = useState<AdminTab>('categories');

  return (
    <div className="space-y-8">
      <nav
        aria-label={t('admin.title')}
        className="flex gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-blanco dark:bg-zinc-900/90 border border-borde shadow-2xs snap-x snap-mandatory"
      >
        {TABS.map(({ key, labelKey, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all select-none snap-center ${
                active
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-texto-secundario hover:bg-fondo dark:hover:bg-zinc-800 hover:text-texto'
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span>{t(labelKey)}</span>
            </button>
          );
        })}
      </nav>

      {tab === 'categories' && <CategoriesSection lang={lang} />}
      {tab === 'news' && <NewsSection lang={lang} />}
      {tab === 'suggestions' && <SuggestionsSection lang={lang} />}
    </div>
  );
}

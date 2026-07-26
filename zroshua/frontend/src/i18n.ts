// Lightweight i18n. The KEY is the English source text — so English needs no
// dictionary (a missing translation falls back to the key) and the UI never
// breaks. The active language is taken from the browser/Home Assistant locale
// once at load; there is no in-app language switch.
import { uk } from './locales/uk';
import { pl } from './locales/pl';
import { de } from './locales/de';
import { sk } from './locales/sk';
import { ro } from './locales/ro';
import { it } from './locales/it';
import { es } from './locales/es';
import { cs } from './locales/cs';
import { fr } from './locales/fr';

export type Dict = Record<string, string>;

const DICTS: Record<string, Dict> = { uk, pl, de, sk, ro, it, es, cs, fr };
export const SUPPORTED = ['en', 'uk', 'pl', 'de', 'sk', 'ro', 'it', 'es', 'cs', 'fr'] as const;

function detectLocale(): string {
  try {
    const prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
    for (const l of prefs) {
      const base = String(l).toLowerCase().split('-')[0];
      if ((SUPPORTED as readonly string[]).includes(base)) return base;
    }
  } catch {
    /* SSR / no navigator */
  }
  return 'en';
}

export const locale = detectLocale();
const active: Dict = DICTS[locale] ?? {};

try {
  document.documentElement.lang = locale;
} catch {
  /* no document */
}

/**
 * Translate an English source string. Unknown keys return the English text, so
 * partially translated locales degrade to English rather than showing blanks.
 * Supports `{name}` placeholders: t('Paused {n}h', { n: 6 }).
 */
export function t(en: string, vars?: Record<string, string | number>): string {
  let s = active[en] ?? en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

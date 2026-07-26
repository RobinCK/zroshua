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

/** Language menu: 'system' follows the device, the rest force a locale. Names are self-labelled. */
export const LANG_OPTIONS: { value: string; label: string }[] = [
  { value: 'system', label: 'System (device language)' },
  { value: 'en', label: 'English' },
  { value: 'uk', label: 'Українська' },
  { value: 'pl', label: 'Polski' },
  { value: 'de', label: 'Deutsch' },
  { value: 'sk', label: 'Slovenčina' },
  { value: 'ro', label: 'Română' },
  { value: 'it', label: 'Italiano' },
  { value: 'es', label: 'Español' },
  { value: 'cs', label: 'Čeština' },
  { value: 'fr', label: 'Français' },
];

const LANG_KEY = 'zroshua.lang';

/** Home Assistant does not pass the account language to an ingress add-on, so
 *  the device language is the automatic default and can be overridden below. */
function detectDeviceLocale(): string {
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

/** Stored preference ('system' or a locale), else null. */
export function storedLang(): string {
  try {
    return localStorage.getItem(LANG_KEY) || 'system';
  } catch {
    return 'system';
  }
}

function resolveLocale(): string {
  const s = storedLang();
  if (s && s !== 'system' && (SUPPORTED as readonly string[]).includes(s)) return s;
  return detectDeviceLocale();
}

/** Persist the language choice and reload so every string re-renders. */
export function setLang(value: string) {
  try {
    localStorage.setItem(LANG_KEY, value);
  } catch {
    /* private mode */
  }
  location.reload();
}

export const locale = resolveLocale();
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

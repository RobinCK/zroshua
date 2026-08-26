// i18next setup. The KEY is the English source text, so English needs no
// dictionary (a missing translation falls back to the key) and the UI never
// breaks. Dictionaries live in src/locales/<lang>.json and are kept in sync
// with the code by `npm run i18n` (see i18next-parser.config.js).
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import cs from './locales/cs.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import pl from './locales/pl.json';
import ro from './locales/ro.json';
import sk from './locales/sk.json';
import uk from './locales/uk.json';
import zh from './locales/zh.json';

export const SUPPORTED = ['en', 'uk', 'pl', 'de', 'sk', 'ro', 'it', 'es', 'cs', 'fr', 'zh'] as const;

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
  { value: 'zh', label: '简体中文' },
];

const LANG_KEY = 'zroshua.lang';

/** Home Assistant does not pass the account language to an ingress add-on, so
 *  the device language is the automatic default and can be overridden below. */
function detectDeviceLocale(): string {
  try {
    const prefs = (navigator.languages?.length ? navigator.languages : [navigator.language]) || [];
    for (const l of prefs) {
      const normalized = String(l).toLowerCase();
      const base = normalized.split('-')[0];
      // `zh` is Simplified Chinese here; do not select it automatically for
      // Traditional Chinese devices (zh-TW/zh-HK/zh-Hant).
      if (base === 'zh') {
        if (normalized === 'zh' || /^zh-(cn|sg|hans)(-|$)/.test(normalized)) return 'zh';
        continue;
      }
      if ((SUPPORTED as readonly string[]).includes(base)) return base;
    }
  } catch {
    /* SSR / no navigator */
  }
  return 'en';
}

/** Stored preference ('system' or a locale), else 'system'. */
export function storedLang(): string {
  try {
    return localStorage.getItem(LANG_KEY) || 'system';
  } catch {
    return 'system';
  }
}

function resolveLocale(): string {
  const s = storedLang();
  if (s !== 'system' && (SUPPORTED as readonly string[]).includes(s)) return s;
  return detectDeviceLocale();
}

/** Persist the language choice and reload, so module-level label tables re-render too. */
export function setLang(value: string) {
  try {
    localStorage.setItem(LANG_KEY, value);
  } catch {
    /* private mode */
  }
  location.reload();
}

export const locale = resolveLocale();

void i18next.use(initReactI18next).init({
  lng: locale,
  fallbackLng: 'en',
  resources: {
    cs: { translation: cs },
    de: { translation: de },
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    it: { translation: it },
    pl: { translation: pl },
    ro: { translation: ro },
    sk: { translation: sk },
    uk: { translation: uk },
    zh: { translation: zh },
  },
  // keys are English sentences, so ':' and '.' inside them must stay literal
  keySeparator: false,
  nsSeparator: false,
  // placeholders are written {name}, not the i18next default {{name}}
  interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
});

try {
  document.documentElement.lang = locale;
} catch {
  /* no document */
}

/**
 * Translate an English source string. Unknown keys return the English text, so
 * partially translated locales degrade to English rather than showing blanks.
 * Supports `{name}` placeholders: t('Pause {n} h', { n: 6 }); pass `count` for
 * plural keys: t('{count} days ago', { count: 3 }).
 */
export function t(en: string, vars?: Record<string, string | number>): string {
  return i18next.t(en, { ...vars, defaultValue: en });
}

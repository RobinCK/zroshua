/**
 * Keeps src/locales/<lang>.json in sync with the t() calls in the code:
 * new strings are added, strings no longer used are removed.
 *
 *   npm run i18n         update the dictionaries
 *   npm run i18n:check   fail if they are out of date (CI)
 *
 * Keys are the English source text, so en.json is the list of source strings
 * and a language file only needs the keys it actually translates.
 */
export default {
  locales: ['en', 'uk', 'pl', 'de', 'sk', 'ro', 'it', 'es', 'cs', 'fr'],
  input: ['src/**/*.{ts,tsx}'],
  output: 'src/locales/$LOCALE.json',


  // keys are English sentences: ':' and '.' inside them are literal, and
  // placeholders are written {name} rather than the i18next default {{name}}
  keySeparator: false,
  namespaceSeparator: false,
  defaultNamespace: 'translation',

  // English needs no translation step — its value is the key itself
  defaultValue: (locale, _namespace, key) => (locale === 'en' ? key : ''),
  keepRemoved: false,
  sort: true,
  createOldCatalogs: false,
  indentation: 2,
  lineEnding: 'lf',
};

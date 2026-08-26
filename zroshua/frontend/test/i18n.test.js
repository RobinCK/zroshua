import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import i18next from 'i18next';

async function dayUnit(locale, count) {
  const catalog = JSON.parse(readFileSync(new URL(`../src/locales/${locale}.json`, import.meta.url), 'utf8'));
  const instance = i18next.createInstance();
  await instance.init({
    lng: locale,
    fallbackLng: false,
    resources: { [locale]: { translation: catalog } },
    keySeparator: false,
    nsSeparator: false,
  });
  return instance.t('day', { count });
}

test('pluralizes the English day unit used by interval schedules', async () => {
  assert.equal(await dayUnit('en', 1), 'day');
  assert.equal(await dayUnit('en', 2), 'days');
});

test('uses every Ukrainian plural form for the day unit', async () => {
  assert.equal(await dayUnit('uk', 1), 'день');
  assert.equal(await dayUnit('uk', 2), 'дні');
  assert.equal(await dayUnit('uk', 5), 'днів');
  assert.equal(await dayUnit('uk', 1.5), 'дня');
});

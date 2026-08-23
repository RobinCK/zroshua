const assert = require('node:assert/strict');
const test = require('node:test');
const { formatNotificationMessage } = require('../dist/notify/messages');

test('formats a German run notification', () => {
  assert.equal(
    formatNotificationMessage('de', 'wateringStarted', { zone: 'Rasen', minutes: 12 }),
    '💧 Bewässerung gestartet: „Rasen“ für 12 Min.',
  );
});

test('localizes a structured skip reason without English fragments', () => {
  assert.equal(
    formatNotificationMessage('de', 'wateringSkipped', {
      targetKind: 'zone',
      targetName: 'Beet',
      reasonKey: 'reasonRain',
    }),
    '⏭ Bewässerung übersprungen für Zone „Beet“: Regensensor ist nass oder in der Abtrocknungszeit',
  );
});

test('all supported languages format the same message', () => {
  for (const language of ['en', 'uk', 'pl', 'de', 'sk', 'ro', 'it', 'es', 'cs', 'fr']) {
    const message = formatNotificationMessage(language, 'wateringFinished', {
      zone: 'A',
      minutes: 5,
      nextTs: Date.UTC(2026, 7, 23, 12),
    });
    assert.match(message, /A/);
    assert.doesNotMatch(message, /\{\w+\}/);
  }
});

test('localizes digest numbers and optional cost', () => {
  const message = formatNotificationMessage('de', 'dailyDigest', {
    dateTs: Date.UTC(2026, 7, 23),
    runs: 3,
    minutes: 20,
    liters: 42,
    energy: 1.25,
    cost: 0.375,
    currency: 'EUR',
    skips: 1,
    faults: 0,
  });
  assert.match(message, /Wasser: ~42 L/);
  assert.match(message, /Energie: 1,25 kWh \(~0,38 EUR\)/);
});

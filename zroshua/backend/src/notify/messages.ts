import type { SupportedLanguage } from '../config/config.service';

export type NotificationMessageKey =
  | 'sourceLow'
  | 'flowDeviation'
  | 'directionHigh'
  | 'directionLow'
  | 'dailyDigest'
  | 'preStartUnavailable'
  | 'zoneOnFailed'
  | 'groupStarted'
  | 'wateringStarted'
  | 'stuckValve'
  | 'rainStopped'
  | 'groupFinished'
  | 'wateringFinished'
  | 'nextWatering'
  | 'pumpUnavailable'
  | 'leak'
  | 'wateringSkipped'
  | 'forZone'
  | 'forGroup'
  | 'groupLiters'
  | 'reasonPaused'
  | 'reasonGroupPaused'
  | 'reasonZonePaused'
  | 'reasonRain'
  | 'reasonSoilWet'
  | 'reasonCondition'
  | 'reasonWeatherRain'
  | 'reasonWeatherFreeze'
  | 'reasonWeatherTemp'
  | 'reasonWeather'
  | 'reasonFault'
  | 'reasonSourceLow'
  | 'reasonBelowMin'
  | 'reasonConflict'
  | 'reasonConflictMutex'
  | 'reasonConflictOrder'
  | 'reasonZoneGone'
  | 'reasonGaveUp'
  | 'reasonUnknown'
  | 'onceNamed'
  | 'onceUnnamed'
  | 'onceStarted'
  | 'onceFinished'
  | 'onceNotRun'
  | 'onceInterrupted'
  | 'onceReasonPaused'
  | 'onceReasonExpired'
  | 'onceReasonNothing';

export type NotificationVars = Record<string, string | number | null | undefined>;

const languages: SupportedLanguage[] = ['en', 'uk', 'pl', 'de', 'sk', 'ro', 'it', 'es', 'cs', 'fr'];
type Row = [string, string, string, string, string, string, string, string, string, string];

// Column order follows `languages`. Keeping each message together makes missing
// translations visible and guarantees every supported locale has every key.
const messages: Record<NotificationMessageKey, Row> = {
  sourceLow: [
    '🪣 Water source "{source}" is low: ~{liters} L ({percent}%).',
    '🪣 Низький рівень джерела води «{source}»: ~{liters} л ({percent}%).',
    '🪣 Niski poziom źródła wody „{source}”: ~{liters} l ({percent}%).',
    '🪣 Wasserquelle „{source}“ hat einen niedrigen Stand: ~{liters} L ({percent} %).',
    '🪣 Nízka hladina zdroja vody „{source}“: ~{liters} l ({percent} %).',
    '🪣 Nivel scăzut al sursei de apă „{source}”: ~{liters} l ({percent}%).',
    '🪣 Livello basso della fonte d’acqua “{source}”: ~{liters} l ({percent}%).',
    '🪣 Nivel bajo de la fuente de agua «{source}»: ~{liters} l ({percent} %).',
    '🪣 Nízká hladina zdroje vody „{source}“: ~{liters} l ({percent} %).',
    '🪣 Niveau bas de la source d’eau « {source} » : ~{liters} l ({percent} %).',
  ],
  flowDeviation: [
    '💦 Flow on "{source}" is {percent}% {direction}: measured {actual} l/min, expected {expected} l/min ({zones} zone(s) running).',
    '💦 Потік «{source}» на {percent}% {direction}: виміряно {actual} л/хв, очікувалося {expected} л/хв (активних зон: {zones}).',
    '💦 Przepływ „{source}” jest o {percent}% {direction}: zmierzono {actual} l/min, oczekiwano {expected} l/min (aktywnych stref: {zones}).',
    '💦 Durchfluss bei „{source}“ ist {percent} % {direction}: gemessen {actual} l/min, erwartet {expected} l/min ({zones} Zone(n) aktiv).',
    '💦 Prietok „{source}“ je o {percent} % {direction}: namerané {actual} l/min, očakávané {expected} l/min (aktívne zóny: {zones}).',
    '💦 Debitul „{source}” este cu {percent}% {direction}: măsurat {actual} l/min, așteptat {expected} l/min ({zones} zone active).',
    '💦 Il flusso di “{source}” è del {percent}% {direction}: misurato {actual} l/min, previsto {expected} l/min ({zones} zone attive).',
    '💦 El caudal de «{source}» es un {percent} % {direction}: medido {actual} l/min, esperado {expected} l/min ({zones} zonas activas).',
    '💦 Průtok „{source}“ je o {percent} % {direction}: naměřeno {actual} l/min, očekáváno {expected} l/min (aktivní zóny: {zones}).',
    '💦 Le débit de « {source} » est {percent} % {direction} : mesuré {actual} l/min, attendu {expected} l/min ({zones} zones actives).',
  ],
  directionHigh: ['too high', 'зависокий', 'za wysoki', 'zu hoch', 'príliš vysoký', 'prea mare', 'troppo alto', 'demasiado alto', 'příliš vysoký', 'trop élevé'],
  directionLow: ['too low', 'занизький', 'za niski', 'zu niedrig', 'príliš nízky', 'prea mic', 'troppo basso', 'demasiado bajo', 'příliš nízký', 'trop faible'],
  dailyDigest: [
    '📊 Zroshua daily digest {date}\nRuns: {runs} · {minutes} min\nWater: ~{liters} L\nEnergy: {energy} kWh{cost}\nSkips: {skips} · Faults: {faults}',
    '📊 Щоденний підсумок Zroshua {date}\nЗапуски: {runs} · {minutes} хв\nВода: ~{liters} л\nЕнергія: {energy} кВт·год{cost}\nПропуски: {skips} · Несправності: {faults}',
    '📊 Dzienne podsumowanie Zroshua {date}\nUruchomienia: {runs} · {minutes} min\nWoda: ~{liters} l\nEnergia: {energy} kWh{cost}\nPominięcia: {skips} · Awarie: {faults}',
    '📊 Zroshua-Tagesübersicht {date}\nLäufe: {runs} · {minutes} Min.\nWasser: ~{liters} L\nEnergie: {energy} kWh{cost}\nÜbersprungen: {skips} · Fehler: {faults}',
    '📊 Denný súhrn Zroshua {date}\nSpustenia: {runs} · {minutes} min\nVoda: ~{liters} l\nEnergia: {energy} kWh{cost}\nVynechané: {skips} · Poruchy: {faults}',
    '📊 Rezumat zilnic Zroshua {date}\nPorniri: {runs} · {minutes} min\nApă: ~{liters} l\nEnergie: {energy} kWh{cost}\nOmisii: {skips} · Defecțiuni: {faults}',
    '📊 Riepilogo giornaliero Zroshua {date}\nAvvii: {runs} · {minutes} min\nAcqua: ~{liters} l\nEnergia: {energy} kWh{cost}\nSaltati: {skips} · Guasti: {faults}',
    '📊 Resumen diario de Zroshua {date}\nRiegos: {runs} · {minutes} min\nAgua: ~{liters} l\nEnergía: {energy} kWh{cost}\nOmitidos: {skips} · Fallos: {faults}',
    '📊 Denní souhrn Zroshua {date}\nSpuštění: {runs} · {minutes} min\nVoda: ~{liters} l\nEnergie: {energy} kWh{cost}\nVynecháno: {skips} · Poruchy: {faults}',
    '📊 Résumé quotidien Zroshua {date}\nArrosages : {runs} · {minutes} min\nEau : ~{liters} l\nÉnergie : {energy} kWh{cost}\nIgnorés : {skips} · Pannes : {faults}',
  ],
  preStartUnavailable: [
    '⚠️ Zone "{zone}" is scheduled at {time}, but {entities} is unavailable — check the controller.',
    '⚠️ Зону «{zone}» заплановано на {time}, але {entities} недоступні — перевірте контролер.',
    '⚠️ Strefa „{zone}” jest zaplanowana na {time}, ale {entities} są niedostępne — sprawdź sterownik.',
    '⚠️ Zone „{zone}“ ist für {time} geplant, aber {entities} ist nicht verfügbar — Controller prüfen.',
    '⚠️ Zóna „{zone}“ je naplánovaná na {time}, ale {entities} nie je dostupné — skontrolujte riadiacu jednotku.',
    '⚠️ Zona „{zone}” este programată la {time}, dar {entities} nu este disponibil — verificați controlerul.',
    '⚠️ La zona “{zone}” è programmata alle {time}, ma {entities} non è disponibile — controlla il controller.',
    '⚠️ La zona «{zone}» está programada a las {time}, pero {entities} no está disponible — comprueba el controlador.',
    '⚠️ Zóna „{zone}“ je naplánována na {time}, ale {entities} není dostupné — zkontrolujte řídicí jednotku.',
    '⚠️ La zone « {zone} » est prévue à {time}, mais {entities} est indisponible — vérifiez le contrôleur.',
  ],
  zoneOnFailed: [
    '⚠️ Zone "{zone}" failed to turn on — skipped; the rest of the plan continues.', '⚠️ Зону «{zone}» не вдалося ввімкнути — пропущено; решта плану продовжується.', '⚠️ Nie udało się włączyć strefy „{zone}” — pominięto; reszta planu jest kontynuowana.', '⚠️ Zone „{zone}“ konnte nicht eingeschaltet werden — übersprungen; der restliche Plan läuft weiter.', '⚠️ Zónu „{zone}“ sa nepodarilo zapnúť — vynechaná; zvyšok plánu pokračuje.', '⚠️ Zona „{zone}” nu a putut fi pornită — omisă; restul planului continuă.', '⚠️ Impossibile attivare la zona “{zone}” — saltata; il resto del piano continua.', '⚠️ No se pudo activar la zona «{zone}» — omitida; el resto del plan continúa.', '⚠️ Zónu „{zone}“ se nepodařilo zapnout — vynechána; zbytek plánu pokračuje.', '⚠️ Impossible d’activer la zone « {zone} » — ignorée ; le reste du programme continue.',
  ],
  groupStarted: [
    '💧 Group "{group}" started: {zones} zone(s) planned.', '💧 Групу «{group}» запущено: заплановано зон — {zones}.', '💧 Uruchomiono grupę „{group}”: zaplanowane strefy: {zones}.', '💧 Gruppe „{group}“ gestartet: {zones} Zone(n) geplant.', '💧 Skupina „{group}“ spustená: naplánované zóny: {zones}.', '💧 Grupul „{group}” a pornit: {zones} zone planificate.', '💧 Gruppo “{group}” avviato: {zones} zone pianificate.', '💧 Grupo «{group}» iniciado: {zones} zonas planificadas.', '💧 Skupina „{group}“ spuštěna: naplánované zóny: {zones}.', '💧 Groupe « {group} » démarré : {zones} zones prévues.',
  ],
  wateringStarted: [
    '💧 Watering started: "{zone}" for {minutes} min.', '💧 Полив розпочато: «{zone}» на {minutes} хв.', '💧 Rozpoczęto podlewanie: „{zone}” przez {minutes} min.', '💧 Bewässerung gestartet: „{zone}“ für {minutes} Min.', '💧 Zavlažovanie spustené: „{zone}“ na {minutes} min.', '💧 Udarea a pornit: „{zone}” pentru {minutes} min.', '💧 Irrigazione avviata: “{zone}” per {minutes} min.', '💧 Riego iniciado: «{zone}» durante {minutes} min.', '💧 Zavlažování spuštěno: „{zone}“ na {minutes} min.', '💧 Arrosage démarré : « {zone} » pendant {minutes} min.',
  ],
  stuckValve: [
    '🚨 CRITICAL: zone "{zone}" did not turn off (stuck valve). Shutting down the source pump.', '🚨 КРИТИЧНО: зона «{zone}» не вимкнулася (клапан застряг). Насос джерела вимикається.', '🚨 KRYTYCZNE: strefa „{zone}” nie wyłączyła się (zablokowany zawór). Wyłączanie pompy źródła.', '🚨 KRITISCH: Zone „{zone}“ wurde nicht ausgeschaltet (Ventil klemmt). Pumpe der Quelle wird abgeschaltet.', '🚨 KRITICKÉ: zóna „{zone}“ sa nevypla (zaseknutý ventil). Čerpadlo zdroja sa vypína.', '🚨 CRITIC: zona „{zone}” nu s-a oprit (supapă blocată). Pompa sursei este oprită.', '🚨 CRITICO: la zona “{zone}” non si è spenta (valvola bloccata). Arresto della pompa della fonte.', '🚨 CRÍTICO: la zona «{zone}» no se apagó (válvula atascada). Se detiene la bomba de la fuente.', '🚨 KRITICKÉ: zóna „{zone}“ se nevypnula (zaseknutý ventil). Čerpadlo zdroje se vypíná.', '🚨 CRITIQUE : la zone « {zone} » ne s’est pas arrêtée (vanne bloquée). Arrêt de la pompe de la source.',
  ],
  rainStopped: [
    '🌧 Watering of "{zone}" stopped: rain detected.', '🌧 Полив «{zone}» зупинено: виявлено дощ.', '🌧 Podlewanie „{zone}” zatrzymane: wykryto deszcz.', '🌧 Bewässerung von „{zone}“ gestoppt: Regen erkannt.', '🌧 Zavlažovanie „{zone}“ zastavené: zistený dážď.', '🌧 Udarea zonei „{zone}” a fost oprită: ploaie detectată.', '🌧 Irrigazione di “{zone}” arrestata: rilevata pioggia.', '🌧 Riego de «{zone}» detenido: lluvia detectada.', '🌧 Zavlažování „{zone}“ zastaveno: zjištěn déšť.', '🌧 Arrosage de « {zone} » arrêté : pluie détectée.',
  ],
  groupFinished: [
    '✅ Group "{group}" finished: {zones} zone(s), {minutes} min{liters}.{next}', '✅ Групу «{group}» завершено: зон — {zones}, {minutes} хв{liters}.{next}', '✅ Grupa „{group}” zakończona: strefy: {zones}, {minutes} min{liters}.{next}', '✅ Gruppe „{group}“ beendet: {zones} Zone(n), {minutes} Min.{liters}.{next}', '✅ Skupina „{group}“ dokončená: zóny: {zones}, {minutes} min{liters}.{next}', '✅ Grupul „{group}” s-a încheiat: {zones} zone, {minutes} min{liters}.{next}', '✅ Gruppo “{group}” terminato: {zones} zone, {minutes} min{liters}.{next}', '✅ Grupo «{group}» finalizado: {zones} zonas, {minutes} min{liters}.{next}', '✅ Skupina „{group}“ dokončena: zóny: {zones}, {minutes} min{liters}.{next}', '✅ Groupe « {group} » terminé : {zones} zones, {minutes} min{liters}.{next}',
  ],
  wateringFinished: [
    '✅ Watering finished: "{zone}", {minutes} min.{next}', '✅ Полив завершено: «{zone}», {minutes} хв.{next}', '✅ Podlewanie zakończone: „{zone}”, {minutes} min.{next}', '✅ Bewässerung beendet: „{zone}“, {minutes} Min.{next}', '✅ Zavlažovanie dokončené: „{zone}“, {minutes} min.{next}', '✅ Udare încheiată: „{zone}”, {minutes} min.{next}', '✅ Irrigazione terminata: “{zone}”, {minutes} min.{next}', '✅ Riego finalizado: «{zone}», {minutes} min.{next}', '✅ Zavlažování dokončeno: „{zone}“, {minutes} min.{next}', '✅ Arrosage terminé : « {zone} », {minutes} min.{next}',
  ],
  nextWatering: [
    ' Next watering: {date}.', ' Наступний полив: {date}.', ' Następne podlewanie: {date}.', ' Nächste Bewässerung: {date}.', ' Ďalšie zavlažovanie: {date}.', ' Următoarea udare: {date}.', ' Prossima irrigazione: {date}.', ' Próximo riego: {date}.', ' Další zavlažování: {date}.', ' Prochain arrosage : {date}.',
  ],
  pumpUnavailable: [
    '⚠️ Pump "{entity}" for source "{source}" is unavailable — starting anyway; check the controller.', '⚠️ Насос «{entity}» джерела «{source}» недоступний — запуск продовжується; перевірте контролер.', '⚠️ Pompa „{entity}” źródła „{source}” jest niedostępna — uruchamianie mimo to; sprawdź sterownik.', '⚠️ Pumpe „{entity}“ der Quelle „{source}“ ist nicht verfügbar — Start erfolgt trotzdem; Controller prüfen.', '⚠️ Čerpadlo „{entity}“ zdroja „{source}“ nie je dostupné — napriek tomu sa spúšťa; skontrolujte riadiacu jednotku.', '⚠️ Pompa „{entity}” a sursei „{source}” nu este disponibilă — pornirea continuă; verificați controlerul.', '⚠️ La pompa “{entity}” della fonte “{source}” non è disponibile — avvio comunque; controlla il controller.', '⚠️ La bomba «{entity}» de la fuente «{source}» no está disponible — se inicia igualmente; comprueba el controlador.', '⚠️ Čerpadlo „{entity}“ zdroje „{source}“ není dostupné — přesto se spouští; zkontrolujte řídicí jednotku.', '⚠️ La pompe « {entity} » de la source « {source} » est indisponible — démarrage maintenu ; vérifiez le contrôleur.',
  ],
  leak: [
    '🚨 Source "{source}": water is flowing ({flow} l/min) while no zones are running — possible leak or stuck valve.', '🚨 Джерело «{source}»: вода тече ({flow} л/хв), коли жодна зона не працює — можливий витік або застряглий клапан.', '🚨 Źródło „{source}”: przepływ wody ({flow} l/min) bez aktywnych stref — możliwy wyciek lub zablokowany zawór.', '🚨 Quelle „{source}“: Wasser fließt ({flow} l/min), obwohl keine Zone aktiv ist — mögliches Leck oder klemmendes Ventil.', '🚨 Zdroj „{source}“: voda tečie ({flow} l/min), hoci nie je aktívna žiadna zóna — možný únik alebo zaseknutý ventil.', '🚨 Sursa „{source}”: apa curge ({flow} l/min) fără zone active — posibilă scurgere sau supapă blocată.', '🚨 Fonte “{source}”: scorre acqua ({flow} l/min) senza zone attive — possibile perdita o valvola bloccata.', '🚨 Fuente «{source}»: fluye agua ({flow} l/min) sin zonas activas — posible fuga o válvula atascada.', '🚨 Zdroj „{source}“: voda teče ({flow} l/min), přestože není aktivní žádná zóna — možný únik nebo zaseknutý ventil.', '🚨 Source « {source} » : débit d’eau ({flow} l/min) sans zone active — fuite ou vanne bloquée possible.',
  ],
  wateringSkipped: [
    '⏭ Watering skipped{target}: {reason}', '⏭ Полив пропущено{target}: {reason}', '⏭ Podlewanie pominięte{target}: {reason}', '⏭ Bewässerung übersprungen{target}: {reason}', '⏭ Zavlažovanie vynechané{target}: {reason}', '⏭ Udare omisă{target}: {reason}', '⏭ Irrigazione saltata{target}: {reason}', '⏭ Riego omitido{target}: {reason}', '⏭ Zavlažování vynecháno{target}: {reason}', '⏭ Arrosage ignoré{target} : {reason}',
  ],
  forZone: [' for zone "{name}"', ' для зони «{name}»', ' dla strefy „{name}”', ' für Zone „{name}“', ' pre zónu „{name}“', ' pentru zona „{name}”', ' per la zona “{name}”', ' para la zona «{name}»', ' pro zónu „{name}“', ' pour la zone « {name} »'],
  forGroup: [' for group "{name}"', ' для групи «{name}»', ' dla grupy „{name}”', ' für Gruppe „{name}“', ' pre skupinu „{name}“', ' pentru grupul „{name}”', ' per il gruppo “{name}”', ' para el grupo «{name}»', ' pro skupinu „{name}“', ' pour le groupe « {name} »'],
  groupLiters: [' · ~{liters} L', ' · ~{liters} л', ' · ~{liters} l', ' · ~{liters} L', ' · ~{liters} l', ' · ~{liters} l', ' · ~{liters} l', ' · ~{liters} l', ' · ~{liters} l', ' · ~{liters} l'],
  reasonPaused: ['all watering is paused until {until}', 'усі поливи призупинено до {until}', 'wszystkie podlewania są wstrzymane do {until}', 'alle Bewässerungen sind bis {until} pausiert', 'všetko zavlažovanie je pozastavené do {until}', 'toate udările sunt întrerupte până la {until}', 'tutte le irrigazioni sono in pausa fino al {until}', 'todos los riegos están en pausa hasta {until}', 'veškeré zavlažování je pozastaveno do {until}', 'tous les arrosages sont en pause jusqu’au {until}'],
  reasonGroupPaused: ['group is paused until {until}', 'групу призупинено до {until}', 'grupa jest wstrzymana do {until}', 'Gruppe ist bis {until} pausiert', 'skupina je pozastavená do {until}', 'grupul este întrerupt până la {until}', 'il gruppo è in pausa fino al {until}', 'el grupo está en pausa hasta {until}', 'skupina je pozastavena do {until}', 'le groupe est en pause jusqu’au {until}'],
  reasonZonePaused: ['zone is paused until {until}', 'зону призупинено до {until}', 'strefa jest wstrzymana do {until}', 'Zone ist bis {until} pausiert', 'zóna je pozastavená do {until}', 'zona este întreruptă până la {until}', 'la zona è in pausa fino al {until}', 'la zona está en pausa hasta {until}', 'zóna je pozastavena do {until}', 'la zone est en pause jusqu’au {until}'],
  reasonRain: ['rain sensor is wet or inside its dry-out window', 'датчик дощу мокрий або діє час висихання', 'czujnik deszczu jest mokry lub trwa okres schnięcia', 'Regensensor ist nass oder in der Abtrocknungszeit', 'dažďový senzor je mokrý alebo v čase vysychania', 'senzorul de ploaie este ud sau în perioada de uscare', 'il sensore pioggia è bagnato o nel periodo di asciugatura', 'el sensor de lluvia está mojado o en el periodo de secado', 'dešťový senzor je mokrý nebo v době vysychání', 'le capteur de pluie est mouillé ou en période de séchage'],
  reasonSoilWet: ['soil moisture is above the blocking threshold', 'вологість ґрунту перевищує поріг блокування', 'wilgotność gleby przekracza próg blokady', 'Bodenfeuchte liegt über dem Sperrwert', 'vlhkosť pôdy je nad blokovacou hranicou', 'umiditatea solului depășește pragul de blocare', 'l’umidità del suolo supera la soglia di blocco', 'la humedad del suelo supera el umbral de bloqueo', 'vlhkost půdy je nad blokovací hranicí', 'l’humidité du sol dépasse le seuil de blocage'],
  reasonCondition: ['run condition not met ({actual} {compare} {expected})', 'умову запуску не виконано ({actual} {compare} {expected})', 'warunek uruchomienia niespełniony ({actual} {compare} {expected})', 'Laufbedingung nicht erfüllt ({actual} {compare} {expected})', 'podmienka spustenia nebola splnená ({actual} {compare} {expected})', 'condiția de pornire nu este îndeplinită ({actual} {compare} {expected})', 'condizione di avvio non soddisfatta ({actual} {compare} {expected})', 'condición de inicio no cumplida ({actual} {compare} {expected})', 'podmínka spuštění nebyla splněna ({actual} {compare} {expected})', 'condition de démarrage non remplie ({actual} {compare} {expected})'],
  reasonWeatherRain: ['rain forecast exceeds thresholds ({probability}% / {amount} mm)', 'прогноз дощу перевищує пороги ({probability}% / {amount} мм)', 'prognoza deszczu przekracza progi ({probability}% / {amount} mm)', 'Regenvorhersage überschreitet Grenzwerte ({probability} % / {amount} mm)', 'predpoveď dažďa prekračuje hranice ({probability} % / {amount} mm)', 'prognoza de ploaie depășește pragurile ({probability}% / {amount} mm)', 'la previsione di pioggia supera le soglie ({probability}% / {amount} mm)', 'la previsión de lluvia supera los umbrales ({probability} % / {amount} mm)', 'předpověď deště překračuje limity ({probability} % / {amount} mm)', 'les prévisions de pluie dépassent les seuils ({probability} % / {amount} mm)'],
  reasonWeatherFreeze: ['freeze protection ({temperature} °C)', 'захист від замерзання ({temperature} °C)', 'ochrona przed mrozem ({temperature} °C)', 'Frostschutz ({temperature} °C)', 'ochrana pred mrazom ({temperature} °C)', 'protecție la îngheț ({temperature} °C)', 'protezione antigelo ({temperature} °C)', 'protección contra heladas ({temperature} °C)', 'ochrana před mrazem ({temperature} °C)', 'protection contre le gel ({temperature} °C)'],
  reasonWeatherTemp: ['temperature {temperature} °C is below the skip threshold', 'температура {temperature} °C нижча за поріг пропуску', 'temperatura {temperature} °C jest poniżej progu pominięcia', 'Temperatur {temperature} °C liegt unter dem Grenzwert', 'teplota {temperature} °C je pod hranicou vynechania', 'temperatura {temperature} °C este sub pragul de omitere', 'la temperatura di {temperature} °C è sotto la soglia', 'la temperatura de {temperature} °C está por debajo del umbral', 'teplota {temperature} °C je pod hranicí vynechání', 'la température de {temperature} °C est sous le seuil'],
  reasonWeather: ['weather rule prevents watering', 'погодні правила блокують полив', 'reguła pogodowa blokuje podlewanie', 'Wetterregel verhindert die Bewässerung', 'pravidlo počasia bráni zavlažovaniu', 'regula meteo împiedică udarea', 'la regola meteo impedisce l’irrigazione', 'la regla meteorológica impide el riego', 'pravidlo počasí brání zavlažování', 'la règle météo empêche l’arrosage'],
  reasonFault: ['zone is in a fault state', 'зона перебуває в стані несправності', 'strefa jest w stanie awarii', 'Zone befindet sich im Fehlerzustand', 'zóna je v poruchovom stave', 'zona este în stare de defecțiune', 'la zona è in stato di guasto', 'la zona está en estado de fallo', 'zóna je v poruchovém stavu', 'la zone est en état de panne'],
  reasonSourceLow: ['source "{source}" is below {percent}% (~{liters} L)', 'джерело «{source}» нижче {percent}% (~{liters} л)', 'źródło „{source}” jest poniżej {percent}% (~{liters} l)', 'Quelle „{source}“ liegt unter {percent} % (~{liters} L)', 'zdroj „{source}“ je pod {percent} % (~{liters} l)', 'sursa „{source}” este sub {percent}% (~{liters} l)', 'la fonte “{source}” è sotto il {percent}% (~{liters} l)', 'la fuente «{source}» está por debajo del {percent} % (~{liters} l)', 'zdroj „{source}“ je pod {percent} % (~{liters} l)', 'la source « {source} » est sous {percent} % (~{liters} l)'],
  reasonBelowMin: ['{minutes} min is below the minimum and was rolled over to the next run', '{minutes} хв менше мінімуму й перенесено до наступного запуску', '{minutes} min jest poniżej minimum i przeniesiono je do następnego uruchomienia', '{minutes} Min. liegen unter dem Minimum und wurden auf den nächsten Lauf übertragen', '{minutes} min je pod minimom a prenieslo sa do ďalšieho spustenia', '{minutes} min este sub minim și a fost reportat la următoarea pornire', '{minutes} min è sotto il minimo ed è stato riportato al prossimo avvio', '{minutes} min está por debajo del mínimo y se acumuló para el próximo riego', '{minutes} min je pod minimem a bylo převedeno do dalšího spuštění', '{minutes} min est sous le minimum et a été reporté au prochain arrosage'],
  reasonConflict: ['could not start on time because of a conflict', 'не вдалося запустити вчасно через конфлікт', 'nie można było uruchomić na czas z powodu konfliktu', 'konnte wegen eines Konflikts nicht rechtzeitig starten', 'nepodarilo sa spustiť načas pre konflikt', 'nu a putut porni la timp din cauza unui conflict', 'impossibile avviare in tempo a causa di un conflitto', 'no se pudo iniciar a tiempo debido a un conflicto', 'nepodařilo se spustit včas kvůli konfliktu', 'impossible de démarrer à temps en raison d’un conflit'],
  reasonConflictMutex: ['could not start on time because group "{group}" is running', 'не вдалося запустити вчасно, оскільки працює група «{group}»', 'nie można było uruchomić na czas, ponieważ działa grupa „{group}”', 'konnte nicht rechtzeitig starten, weil Gruppe „{group}“ läuft', 'nepodarilo sa spustiť načas, pretože beží skupina „{group}“', 'nu a putut porni la timp deoarece rulează grupul „{group}”', 'impossibile avviare in tempo perché è in esecuzione il gruppo “{group}”', 'no se pudo iniciar a tiempo porque se está ejecutando el grupo «{group}»', 'nepodařilo se spustit včas, protože běží skupina „{group}“', 'impossible de démarrer à temps car le groupe « {group} » est actif'],
  reasonConflictOrder: ['could not start on time while waiting for group "{group}"', 'не вдалося запустити вчасно під час очікування групи «{group}»', 'nie można było uruchomić na czas podczas oczekiwania na grupę „{group}”', 'konnte während des Wartens auf Gruppe „{group}“ nicht rechtzeitig starten', 'nepodarilo sa spustiť načas počas čakania na skupinu „{group}“', 'nu a putut porni la timp în așteptarea grupului „{group}”', 'impossibile avviare in tempo durante l’attesa del gruppo “{group}”', 'no se pudo iniciar a tiempo mientras se esperaba al grupo «{group}»', 'nepodařilo se spustit včas při čekání na skupinu „{group}“', 'impossible de démarrer à temps en attendant le groupe « {group} »'],
  reasonZoneGone: ['the zone is disabled or no longer exists', 'зону вимкнено або її більше не існує', 'strefa jest wyłączona lub już nie istnieje', 'die Zone ist deaktiviert oder existiert nicht mehr', 'zóna je vypnutá alebo už neexistuje', 'zona este dezactivată sau nu mai există', 'la zona è disabilitata o non esiste più', 'la zona está deshabilitada o ya no existe', 'zóna je vypnutá nebo už neexistuje', 'la zone est désactivée ou n’existe plus'],
  reasonGaveUp: ['it could not start within {minutes} min of its slot and was dropped', 'не вдалося стартувати протягом {minutes} хв після свого часу — скасовано', 'nie udało się wystartować w ciągu {minutes} min od terminu — pominięto', 'der Start war nicht innerhalb von {minutes} Min. möglich — verworfen', 'nepodarilo sa spustiť do {minutes} min od termínu — zrušené', 'nu a putut porni în {minutes} min de la ora sa — a fost renunțat', 'non è riuscita ad avviarsi entro {minutes} min — annullata', 'no pudo iniciarse en {minutes} min desde su hora — se descartó', 'nepodařilo se spustit do {minutes} min od termínu — zrušeno', 'impossible de démarrer dans les {minutes} min suivant l’heure prévue — abandonné'],
  reasonUnknown: ['see the journal for the reason', 'причина — у журналі', 'powód znajdziesz w dzienniku', 'der Grund steht im Journal', 'dôvod nájdete v denníku', 'motivul este în jurnal', 'il motivo è nel giornale', 'el motivo está en el registro', 'důvod najdete v deníku', 'la raison est dans le journal'],
  onceNamed: ['One-off "{name}"', 'Разовий полив «{name}»', 'Podlewanie jednorazowe „{name}”', 'Einmalige Bewässerung „{name}“', 'Jednorazové zavlažovanie „{name}“', 'Udarea unică „{name}”', 'Irrigazione una tantum “{name}”', 'Riego puntual «{name}»', 'Jednorázové zavlažování „{name}“', 'Arrosage ponctuel « {name} »'],
  onceUnnamed: ['One-off watering', 'Разовий полив', 'Podlewanie jednorazowe', 'Einmalige Bewässerung', 'Jednorazové zavlažovanie', 'Udare unică', 'Irrigazione una tantum', 'Riego puntual', 'Jednorázové zavlažování', 'Arrosage ponctuel'],
  onceStarted: ['💧 {label} started: {zones} zone(s).', '💧 {label} розпочато: зон — {zones}.', '💧 {label} rozpoczęte: strefy: {zones}.', '💧 {label} gestartet: {zones} Zone(n).', '💧 {label} spustené: zóny: {zones}.', '💧 {label} a pornit: {zones} zone.', '💧 {label} avviata: {zones} zone.', '💧 {label} iniciado: {zones} zonas.', '💧 {label} spuštěno: zóny: {zones}.', '💧 {label} démarré : {zones} zones.'],
  onceFinished: ['✅ {label} finished: {zones} zone(s), {minutes} min{liters}.', '✅ {label} завершено: зон — {zones}, {minutes} хв{liters}.', '✅ {label} zakończone: strefy: {zones}, {minutes} min{liters}.', '✅ {label} beendet: {zones} Zone(n), {minutes} Min.{liters}.', '✅ {label} dokončené: zóny: {zones}, {minutes} min{liters}.', '✅ {label} s-a încheiat: {zones} zone, {minutes} min{liters}.', '✅ {label} terminata: {zones} zone, {minutes} min{liters}.', '✅ {label} finalizado: {zones} zonas, {minutes} min{liters}.', '✅ {label} dokončeno: zóny: {zones}, {minutes} min{liters}.', '✅ {label} terminé : {zones} zones, {minutes} min{liters}.'],
  onceNotRun: ['⏭ {label} did not run: {reason}', '⏭ {label} не відбувся: {reason}', '⏭ {label} nie odbyło się: {reason}', '⏭ {label} fand nicht statt: {reason}', '⏭ {label} sa neuskutočnilo: {reason}', '⏭ {label} nu a avut loc: {reason}', '⏭ {label} non è avvenuta: {reason}', '⏭ {label} no se ejecutó: {reason}', '⏭ {label} se neuskutečnilo: {reason}', '⏭ {label} n’a pas eu lieu : {reason}'],
  onceInterrupted: ['⏭ {label} was cut short by a restart: {watered} of {planned} zone(s) watered.', '⏭ {label} перервано перезапуском: полито зон — {watered} з {planned}.', '⏭ {label} przerwane restartem: podlano {watered} z {planned} stref.', '⏭ {label} durch einen Neustart abgebrochen: {watered} von {planned} Zone(n) bewässert.', '⏭ {label} prerušené reštartom: zavlažených {watered} z {planned} zón.', '⏭ {label} a fost întreruptă de o repornire: {watered} din {planned} zone udate.', '⏭ {label} interrotta da un riavvio: {watered} di {planned} zone irrigate.', '⏭ {label} interrumpido por un reinicio: {watered} de {planned} zonas regadas.', '⏭ {label} přerušeno restartem: zavlaženo {watered} z {planned} zón.', '⏭ {label} interrompu par un redémarrage : {watered} zones sur {planned} arrosées.'],
  onceReasonPaused: ['it was paused before its start time', 'його поставили на паузу до часу старту', 'zostało wstrzymane przed czasem startu', 'sie wurde vor dem Startzeitpunkt pausiert', 'bolo pozastavené pred časom štartu', 'a fost pusă în pauză înainte de ora de start', 'è stata messa in pausa prima dell’orario di avvio', 'se puso en pausa antes de su hora de inicio', 'bylo pozastaveno před časem startu', 'il a été mis en pause avant son heure de départ'],
  onceReasonExpired: ['it missed its {time} start — the controller was busy or offline', 'пропущено старт о {time} — контролер був зайнятий або вимкнений', 'przegapiono start o {time} — sterownik był zajęty lub offline', 'der Start um {time} wurde verpasst — die Steuerung war beschäftigt oder offline', 'zmeškal sa štart o {time} — ovládač bol zaneprázdnený alebo offline', 'a ratat startul de la {time} — controlerul era ocupat sau offline', 'ha perso l’avvio delle {time} — il controller era occupato o offline', 'se perdió el inicio de las {time} — el controlador estaba ocupado o sin conexión', 'zmeškal se start v {time} — ovladač byl zaneprázdněný nebo offline', 'le départ de {time} a été manqué — le contrôleur était occupé ou hors ligne'],
  onceReasonNothing: ['every zone was skipped', 'усі зони було пропущено', 'wszystkie strefy zostały pominięte', 'jede Zone wurde übersprungen', 'všetky zóny boli preskočené', 'toate zonele au fost omise', 'tutte le zone sono state saltate', 'se omitieron todas las zonas', 'všechny zóny byly přeskočeny', 'toutes les zones ont été ignorées'],
};

const zhMessages: Record<NotificationMessageKey, string> = {
  sourceLow: '🪣 水源“{source}”水位偏低：约 {liters} 升（{percent}%）。',
  flowDeviation: '💦 “{source}”的流量{direction} {percent}%：实测 {actual} 升/分钟，预期 {expected} 升/分钟（{zones} 个区域正在浇水）。',
  directionHigh: '偏高',
  directionLow: '偏低',
  dailyDigest: '📊 Zroshua 每日摘要 {date}\n运行：{runs} 次 · {minutes} 分钟\n用水：约 {liters} 升\n能耗：{energy} 千瓦时{cost}\n跳过：{skips} 次 · 故障：{faults} 次',
  preStartUnavailable: '⚠️ 区域“{zone}”计划于 {time} 启动，但 {entities} 不可用——请检查控制器。',
  zoneOnFailed: '⚠️ 区域“{zone}”无法开启——已跳过；其余计划继续执行。',
  groupStarted: '💧 组“{group}”已启动：计划浇水 {zones} 个区域。',
  wateringStarted: '💧 已开始浇水：“{zone}”，持续 {minutes} 分钟。',
  stuckValve: '🚨 严重故障：区域“{zone}”未能关闭（阀门卡住）。正在关闭水源泵。',
  rainStopped: '🌧 已停止区域“{zone}”的浇水：检测到降雨。',
  groupFinished: '✅ 组“{group}”已完成：{zones} 个区域，{minutes} 分钟{liters}。{next}',
  wateringFinished: '✅ 浇水已完成：“{zone}”，{minutes} 分钟。{next}',
  nextWatering: ' 下次浇水：{date}。',
  pumpUnavailable: '⚠️ 水源“{source}”的水泵“{entity}”不可用——仍将启动；请检查控制器。',
  leak: '🚨 水源“{source}”：没有区域运行时仍有水流（{flow} 升/分钟）——可能漏水或阀门卡住。',
  wateringSkipped: '⏭ 已跳过浇水{target}：{reason}',
  forZone: '，区域“{name}”',
  forGroup: '，组“{name}”',
  groupLiters: '，约 {liters} 升',
  reasonPaused: '所有浇水均已暂停至 {until}',
  reasonGroupPaused: '该组已暂停至 {until}',
  reasonZonePaused: '该区域已暂停至 {until}',
  reasonRain: '雨水传感器处于湿润状态或仍在干燥等待期内',
  reasonSoilWet: '土壤湿度高于阻止浇水的阈值',
  reasonCondition: '未满足运行条件（{actual} {compare} {expected}）',
  reasonWeatherRain: '降雨预报超过阈值（{probability}% / {amount} 毫米）',
  reasonWeatherFreeze: '防冻保护（{temperature} °C）',
  reasonWeatherTemp: '温度 {temperature} °C 低于跳过阈值',
  reasonWeather: '天气规则阻止浇水',
  reasonFault: '区域处于故障状态',
  reasonSourceLow: '水源“{source}”低于 {percent}%（约 {liters} 升）',
  reasonBelowMin: '{minutes} 分钟低于最短时长，已累积至下次运行',
  reasonConflict: '由于冲突，无法按时启动',
  reasonConflictMutex: '由于组“{group}”正在运行，无法按时启动',
  reasonConflictOrder: '等待组“{group}”时无法按时启动',
  reasonZoneGone: '该区域已停用或不再存在',
  reasonGaveUp: '在预定时间后的 {minutes} 分钟内仍无法启动——已放弃',
  reasonUnknown: '原因请查看日志',
  onceNamed: '一次性浇水“{name}”',
  onceUnnamed: '一次性浇水',
  onceStarted: '💧 {label}已开始：{zones} 个区域。',
  onceFinished: '✅ {label}已完成：{zones} 个区域，{minutes} 分钟{liters}。',
  onceNotRun: '⏭ {label}未执行：{reason}',
  onceInterrupted: '⏭ {label}因重启中断：已浇水 {watered} / {planned} 个区域。',
  onceReasonPaused: '在启动时间之前被暂停',
  onceReasonExpired: '错过了 {time} 的启动时间——控制器繁忙或离线',
  onceReasonNothing: '所有区域均被跳过',
};

function template(language: SupportedLanguage, key: NotificationMessageKey): string {
  if (language === 'zh') return zhMessages[key];
  return messages[key][Math.max(0, languages.indexOf(language))];
}

export function formatNotification(language: SupportedLanguage, key: NotificationMessageKey, vars: NotificationVars = {}): string {
  return template(language, key).replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}

export function formatNotificationDate(language: SupportedLanguage, timestamp: number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(language, options ?? { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
}

export function formatNotificationNumber(language: SupportedLanguage, value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits }).format(value);
}

export function formatNotificationMessage(
  language: SupportedLanguage,
  key: NotificationMessageKey,
  input: NotificationVars = {},
): string {
  const vars = { ...input };
  if (typeof vars.nextTs === 'number') {
    vars.next = formatNotification(language, 'nextWatering', { date: formatNotificationDate(language, vars.nextTs) });
  }
  if (typeof vars.dateTs === 'number') vars.date = formatNotificationDate(language, vars.dateTs, { dateStyle: 'medium' });
  if (typeof vars.timeTs === 'number') vars.time = formatNotificationDate(language, vars.timeTs, { hour: '2-digit', minute: '2-digit' });
  if (typeof vars.untilTs === 'number') vars.until = formatNotificationDate(language, vars.untilTs);
  for (const [name, digits] of [['actual', 1], ['expected', 1], ['energy', 2], ['temperature', 1], ['amount', 1], ['flow', 1], ['minutes', 1]] as const) {
    if (typeof vars[name] === 'number') vars[name] = formatNotificationNumber(language, vars[name], digits);
  }
  if (typeof vars.liters === 'number') {
    const liters = formatNotificationNumber(language, vars.liters, 0);
    // these two carry litres as an optional trailing fragment, so it has to bring
    // its own separator; everywhere else {liters} is a bare number
    vars.liters =
      key === 'groupFinished' || key === 'onceFinished'
        ? formatNotification(language, 'groupLiters', { liters })
        : liters;
  }
  if (typeof vars.direction === 'string') {
    vars.direction = formatNotification(language, vars.direction === 'high' ? 'directionHigh' : 'directionLow');
  }
  // A one-off is named by the user or not at all; the label is a localized fragment
  // so every message about it can be one sentence in every language.
  if (typeof vars.onceName === 'string') {
    vars.label = vars.onceName.trim()
      ? formatNotification(language, 'onceNamed', { name: vars.onceName.trim() })
      : formatNotification(language, 'onceUnnamed');
  }
  if (typeof vars.cost === 'number') {
    const currency = String(vars.currency ?? '').trim();
    vars.cost = ` (~${formatNotificationNumber(language, vars.cost, 2)}${currency ? ` ${currency}` : ''})`;
  }
  // any message can carry a nested reason, not just a skip
  if (typeof vars.reasonKey === 'string') {
    vars.reason = formatNotification(language, vars.reasonKey as NotificationMessageKey, vars);
  }
  if (key === 'wateringSkipped') {
    if (typeof vars.reason !== 'string') vars.reason = formatNotification(language, 'reasonUnknown', vars);
    vars.target = vars.targetKind && vars.targetName
      ? formatNotification(language, vars.targetKind === 'zone' ? 'forZone' : 'forGroup', { name: vars.targetName })
      : '';
  }
  return formatNotification(language, key, vars);
}

import * as fs from 'fs';

/**
 * Add-on options come from /data/options.json (written by the Supervisor from
 * the user's add-on configuration). Environment variables act as overrides for
 * local development. MQTT credentials are fetched at runtime from the
 * Supervisor services API (see MqttService) — no bashio required.
 */
/**
 * The stand: `ZROSHUA_SIMULATE=1` replaces Home Assistant with an in-process fake that hosts a
 * virtual garden (see src/sim), replaces the MQTT broker with an in-process one and keeps its
 * database in ./.sim-data, so it never touches a real installation.
 */
const simulate = process.env.ZROSHUA_SIMULATE === '1' || process.env.ZROSHUA_SIMULATE === 'true';
const simHaPort = Number(process.env.ZROSHUA_SIM_HA_PORT ?? 8124);

const dataDir = process.env.ZROSHUA_DATA_DIR ?? (simulate ? './.sim-data' : '/data');

function loadOptions(): Record<string, any> {
  try {
    return JSON.parse(fs.readFileSync(`${dataDir}/options.json`, 'utf8'));
  } catch {
    return {};
  }
}

const opts = loadOptions();
const dbOpts = opts.database ?? {};

export const env = {
  port: Number(process.env.ZROSHUA_PORT ?? 8099),
  dataDir,
  publicDir: process.env.ZROSHUA_PUBLIC_DIR ?? '../frontend/dist',
  logLevel: process.env.ZROSHUA_LOG_LEVEL ?? opts.log_level ?? 'info',
  supervisorToken: simulate ? 'simulator' : process.env.SUPERVISOR_TOKEN ?? '',
  haWsUrl: simulate ? `ws://127.0.0.1:${simHaPort}/api/websocket` : process.env.ZROSHUA_HA_WS_URL ?? 'ws://supervisor/core/websocket',
  supervisorApi: process.env.ZROSHUA_SUPERVISOR_API ?? 'http://supervisor',
  telegramToken: process.env.ZROSHUA_TELEGRAM_TOKEN ?? opts.telegram_bot_token ?? '',
  mqtt: {
    // env (dev) → add-on options (manual/external broker) → Supervisor services API (Mosquitto add-on)
    host: process.env.ZROSHUA_MQTT_HOST ?? opts.mqtt_host,
    port: process.env.ZROSHUA_MQTT_PORT ? Number(process.env.ZROSHUA_MQTT_PORT) : opts.mqtt_port,
    user: process.env.ZROSHUA_MQTT_USER ?? opts.mqtt_username,
    password: process.env.ZROSHUA_MQTT_PASSWORD ?? opts.mqtt_password,
  },
  sim: {
    enabled: simulate,
    haPort: simHaPort,
    /** summer (a group waters, the barrel pump is offline) | calm (the same garden, the pump online) | season_off (schedules off, a cold week) */
    scenario: (process.env.ZROSHUA_SIM_SCENARIO ?? 'summer') as 'summer' | 'calm' | 'season_off',
    /** start from an empty database and seed the garden again */
    reset: process.env.ZROSHUA_SIM_RESET !== '0',
  },
  db: {
    driver: (process.env.ZROSHUA_DB_DRIVER ?? dbOpts.driver ?? 'sqlite') as 'sqlite' | 'mariadb' | 'postgres',
    host: process.env.ZROSHUA_DB_HOST ?? dbOpts.host,
    port: process.env.ZROSHUA_DB_PORT ? Number(process.env.ZROSHUA_DB_PORT) : dbOpts.port,
    name: process.env.ZROSHUA_DB_NAME ?? dbOpts.name,
    user: process.env.ZROSHUA_DB_USER ?? dbOpts.username,
    password: process.env.ZROSHUA_DB_PASSWORD ?? dbOpts.password,
  },
};

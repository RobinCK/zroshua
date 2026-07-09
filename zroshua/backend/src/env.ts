import * as fs from 'fs';

/**
 * Add-on options come from /data/options.json (written by the Supervisor from
 * the user's add-on configuration). Environment variables act as overrides for
 * local development. MQTT credentials are fetched at runtime from the
 * Supervisor services API (see MqttService) — no bashio required.
 */
const dataDir = process.env.ZROSHUA_DATA_DIR ?? '/data';

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
  supervisorToken: process.env.SUPERVISOR_TOKEN ?? '',
  haWsUrl: process.env.ZROSHUA_HA_WS_URL ?? 'ws://supervisor/core/websocket',
  supervisorApi: process.env.ZROSHUA_SUPERVISOR_API ?? 'http://supervisor',
  telegramToken: process.env.ZROSHUA_TELEGRAM_TOKEN ?? opts.telegram_bot_token ?? '',
  mqtt: {
    // env (dev) → add-on options (manual/external broker) → Supervisor services API (Mosquitto add-on)
    host: process.env.ZROSHUA_MQTT_HOST ?? opts.mqtt_host,
    port: process.env.ZROSHUA_MQTT_PORT ? Number(process.env.ZROSHUA_MQTT_PORT) : opts.mqtt_port,
    user: process.env.ZROSHUA_MQTT_USER ?? opts.mqtt_username,
    password: process.env.ZROSHUA_MQTT_PASSWORD ?? opts.mqtt_password,
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

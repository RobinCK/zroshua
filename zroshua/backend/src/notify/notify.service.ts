import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { HaService } from '../ha/ha.service';
import { env } from '../env';

export type NotifyEvent =
  | 'run_start'
  | 'run_end'
  | 'skip'
  | 'stop_rain'
  | 'fault'
  | 'system';

/**
 * Event router with pluggable providers. Telegram and HA notify ship first;
 * new providers only need a case in deliver().
 */
@Injectable()
export class NotifyService {
  private readonly log = new Logger('Notify');

  constructor(
    private readonly config: ConfigService,
    private readonly ha: HaService,
  ) {}

  async emit(event: NotifyEvent, message: string) {
    const settings = await this.config.getSettings();
    // quiet hours: suppress everything except faults (the daily digest still summarizes)
    const quiet = settings.notifications.quiet;
    if (quiet?.enabled && event !== 'fault') {
      const hhmm = new Date().toTimeString().slice(0, 5);
      const inWindow = quiet.from <= quiet.to ? hhmm >= quiet.from && hhmm < quiet.to : hhmm >= quiet.from || hhmm < quiet.to;
      if (inWindow) return;
    }
    for (const provider of settings.notifications.providers) {
      if (provider.events.length && !provider.events.includes(event)) continue;
      try {
        await this.deliver(provider, message);
      } catch (e: any) {
        this.log.warn(`Provider ${provider.type} failed: ${e.message}`);
      }
    }
  }

  private async deliver(provider: any, message: string) {
    switch (provider.type) {
      case 'telegram': {
        if (!env.telegramToken) throw new Error('telegram_bot_token is not configured in add-on options');
        for (const chatId of provider.chatIds ?? []) {
          const res = await fetch(`https://api.telegram.org/bot${env.telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message }),
          });
          if (!res.ok) throw new Error(`telegram HTTP ${res.status}`);
        }
        break;
      }
      case 'ha_notify': {
        const [domain, service] = String(provider.service ?? 'notify.notify').split('.');
        await this.ha.callService(domain, service, undefined, { message });
        break;
      }
      default:
        throw new Error(`unknown provider ${provider.type}`);
    }
  }
}

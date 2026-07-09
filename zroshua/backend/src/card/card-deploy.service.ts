import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { HaService } from '../ha/ha.service';

const RESOURCE_URL = '/local/zroshua-card.js';
const CARD_SRC = '/app/card/zroshua-card.js';
// Home Assistant config dir is mounted here when `homeassistant_config` map is set.
const WWW_CANDIDATES = ['/homeassistant/www', '/config/www'];

/**
 * Copies the bundled Lovelace card into the HA `www` folder and registers it as
 * a dashboard resource, so the user only has to add the card to a view. No-op
 * when the config dir is not mounted or dashboards run in YAML mode.
 */
@Injectable()
export class CardDeployService implements OnModuleInit {
  private readonly log = new Logger('Card');

  constructor(private readonly ha: HaService) {}

  async onModuleInit() {
    if (!fs.existsSync(CARD_SRC)) return;
    const wwwDir = WWW_CANDIDATES.find((d) => fs.existsSync(path.dirname(d)));
    if (!wwwDir) {
      this.log.log('HA config dir not mounted — add the card manually (see docs)');
      return;
    }
    try {
      fs.mkdirSync(wwwDir, { recursive: true });
      const dest = path.join(wwwDir, 'zroshua-card.js');
      const next = fs.readFileSync(CARD_SRC, 'utf8');
      const prev = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
      if (prev !== next) {
        fs.writeFileSync(dest, next);
        this.log.log(`Deployed Lovelace card to ${dest}`);
      }
    } catch (e: any) {
      this.log.warn(`Could not deploy card file: ${e.message}`);
      return;
    }
    // register the resource once HA is connected
    const tryRegister = async () => {
      const res = await this.ha.ensureLovelaceResource(RESOURCE_URL);
      if (res === 'created') this.log.log(`Registered Lovelace resource ${RESOURCE_URL}`);
      else if (res === 'unsupported')
        this.log.log(`Add a Lovelace resource manually: ${RESOURCE_URL} (module)`);
    };
    if (this.ha.connected) void tryRegister();
    this.ha.on('connection', (ok: boolean) => ok && void tryRegister());
  }
}

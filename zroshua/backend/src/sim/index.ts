import { Logger, type INestApplication } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { DataSource } from 'typeorm';
import { env } from '../env';
import { DATA_SOURCE } from '../db/database.module';
import { ConfigService } from '../config/config.service';
import { EngineService } from '../engine/engine.service';
import { Group } from '../db/entities';
import { FakeHa } from './fake-ha';
import { Garden, type Scenario } from './garden';
import { seedConfig, seedHistory } from './seed';

const log = new Logger('Stand');
let ha: FakeHa | null = null;
let garden: Garden | null = null;

function scenario(): Scenario {
  const s = env.sim.scenario as string;
  return s === 'calm' || s === 'season_off' ? s : 'summer';
}

/**
 * Before Nest boots: a clean database (unless ZROSHUA_SIM_RESET=0), the fake Home Assistant on
 * its own port and the garden behind it — so HaService connects to it on its first try.
 */
export async function startSimulator() {
  if (env.sim.reset) {
    for (const f of ['zroshua.sqlite', 'zroshua.sqlite-wal', 'zroshua.sqlite-shm']) fs.rmSync(path.join(env.dataDir, f), { force: true });
  }
  ha = new FakeHa(env.sim.haPort);
  await ha.start();
  garden = new Garden(ha, scenario());
  garden.start();
  log.log(`Scenario «${scenario()}» — the panel is on http://localhost:${env.port}, the cards on http://localhost:${env.port}/api/dev/cards`);
}

/** After Nest boots: seed the garden into an empty database and set the scene. */
export async function afterBoot(app: INestApplication) {
  const ds = app.get<DataSource>(DATA_SOURCE);
  const config = app.get(ConfigService);
  const engine = app.get(EngineService);
  const fresh = await seedConfig(ds, config, scenario());
  await seedHistory(ds);
  await engine.reloadConfig();
  if (!fresh) return;
  if (scenario() === 'summer') {
    // the front lawn is mid-way through its night run when you open the stand
    const g = await ds.getRepository(Group).findOneBy({ id: 'front_lawn' });
    setTimeout(() => {
      if (g) void engine.startGroupRun(g, 'schedule').catch((e) => log.warn(`could not start the scene: ${e.message}`));
    }, 3000);
  }
}

export function fakeHa(): FakeHa | null {
  return ha;
}

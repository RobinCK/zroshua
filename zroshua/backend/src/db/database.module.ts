import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { env } from '../env';
import { Group, GroupRule, JournalEntry, KV, Run, WaterSource, Zone } from './entities';

export const DATA_SOURCE = 'DATA_SOURCE';
const entities = [Zone, Group, GroupRule, WaterSource, Run, JournalEntry, KV];

async function createDataSource(): Promise<DataSource> {
  let ds: DataSource;
  if (env.db.driver === 'mariadb' || env.db.driver === 'postgres') {
    ds = new DataSource({
      type: env.db.driver === 'mariadb' ? 'mysql' : 'postgres',
      host: env.db.host,
      port: env.db.port ?? (env.db.driver === 'mariadb' ? 3306 : 5432),
      database: env.db.name ?? 'zroshua',
      username: env.db.user,
      password: env.db.password,
      entities,
      synchronize: true,
    });
  } else {
    fs.mkdirSync(env.dataDir, { recursive: true });
    ds = new DataSource({
      type: 'better-sqlite3',
      database: path.join(env.dataDir, 'zroshua.sqlite'),
      entities,
      synchronize: true,
    });
  }
  await ds.initialize();
  return ds;
}

@Global()
@Module({
  providers: [{ provide: DATA_SOURCE, useFactory: createDataSource }],
  exports: [DATA_SOURCE],
})
export class DatabaseModule {}

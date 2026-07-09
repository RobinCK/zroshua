import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../db/database.module';
import { JournalEntry } from '../db/entities';
import { EventsService } from '../events/events.service';

@Injectable()
export class JournalService {
  private readonly log = new Logger('Journal');
  repo: Repository<JournalEntry>;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource,
    private readonly events: EventsService,
  ) {
    this.repo = ds.getRepository(JournalEntry);
  }

  async add(kind: string, opts: { zoneId?: string; groupId?: string; code?: string; detail?: string } = {}) {
    const entry = await this.repo.save({
      ts: Date.now(),
      kind,
      zoneId: opts.zoneId ?? null,
      groupId: opts.groupId ?? null,
      code: opts.code ?? null,
      detail: opts.detail ?? null,
    });
    this.log.log(`${kind} ${opts.code ?? ''} ${opts.zoneId ?? opts.groupId ?? ''} ${opts.detail ?? ''}`);
    this.events.broadcast('journal', entry);
    return entry;
  }

  async list(limit = 200, kind?: string) {
    return this.repo.find({
      where: kind ? { kind } : {},
      order: { ts: 'DESC' },
      take: Math.min(limit, 1000),
    });
  }
}

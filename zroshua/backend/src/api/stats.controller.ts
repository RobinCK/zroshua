import { Controller, Get, Inject, Query } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../db/database.module';
import { Run } from '../db/entities';
import { ConfigService } from '../config/config.service';

@Controller('api/stats')
export class StatsController {
  private runs: Repository<Run>;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource,
    private readonly config: ConfigService,
  ) {
    this.runs = ds.getRepository(Run);
  }

  @Get('runs')
  async list(@Query('days') days = '30') {
    const from = Date.now() - Number(days) * 24 * 3600_000;
    return this.runs
      .createQueryBuilder('r')
      .where('r.startTs >= :from', { from })
      .orderBy('r.startTs', 'DESC')
      .take(1000)
      .getMany();
  }

  /** Daily aggregates per zone: minutes, liters (min/max), energy. */
  @Get('daily')
  async daily(@Query('days') days = '30') {
    const from = Date.now() - Number(days) * 24 * 3600_000;
    const rows = await this.runs
      .createQueryBuilder('r')
      .where('r.startTs >= :from AND r.endTs IS NOT NULL', { from })
      .getMany();

    const settings = await this.config.getSettings();
    const byDay = new Map<string, any>();
    for (const r of rows) {
      const day = new Date(Number(r.startTs)).toISOString().slice(0, 10);
      const d = byDay.get(day) ?? { day, minutes: 0, litersMin: 0, litersMax: 0, energyKwh: 0, tailKwh: 0, zones: {} as Record<string, any> };
      if (r.category === 'tail') {
        d.tailKwh += r.energyKwh ?? 0;
      } else {
        d.minutes += r.actualMin;
        d.litersMin += r.litersMin ?? 0;
        d.litersMax += r.litersMax ?? 0;
        d.energyKwh += r.energyKwh ?? 0;
        if (r.zoneId) {
          const z = d.zones[r.zoneId] ?? { minutes: 0, litersMin: 0, litersMax: 0, energyKwh: 0 };
          z.minutes += r.actualMin;
          z.litersMin += r.litersMin ?? 0;
          z.litersMax += r.litersMax ?? 0;
          z.energyKwh += r.energyKwh ?? 0;
          d.zones[r.zoneId] = z;
        }
      }
      byDay.set(day, d);
    }
    const daysArr = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
    const tariff = settings.energyTariffPerKwh;
    return {
      days: daysArr,
      totals: daysArr.reduce(
        (acc, d) => ({
          minutes: acc.minutes + d.minutes,
          litersMin: acc.litersMin + d.litersMin,
          litersMax: acc.litersMax + d.litersMax,
          energyKwh: acc.energyKwh + d.energyKwh,
          tailKwh: acc.tailKwh + d.tailKwh,
        }),
        { minutes: 0, litersMin: 0, litersMax: 0, energyKwh: 0, tailKwh: 0 },
      ),
      tariff,
      currency: settings.energyCurrency,
    };
  }

  @Get('export.csv')
  async csv(@Query('days') days = '365') {
    const from = Date.now() - Number(days) * 24 * 3600_000;
    const rows = await this.runs
      .createQueryBuilder('r')
      .where('r.startTs >= :from', { from })
      .orderBy('r.startTs', 'ASC')
      .getMany();
    const header = 'start,end,zone,group,source,category,planned_min,actual_min,liters_min,liters_max,energy_kwh,stop_reason,manual';
    const lines = rows.map((r) =>
      [
        new Date(Number(r.startTs)).toISOString(),
        r.endTs ? new Date(Number(r.endTs)).toISOString() : '',
        r.zoneId ?? '',
        r.groupId ?? '',
        r.sourceId ?? '',
        r.category,
        r.plannedMin,
        r.actualMin,
        r.litersMin ?? '',
        r.litersMax ?? '',
        r.energyKwh ?? '',
        r.stopReason,
        r.manual,
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }
}

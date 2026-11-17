import { Controller, Get, Query } from '@nestjs/common';
import { OverviewService } from '../overview/overview.service';
import { MqttService } from '../mqtt/mqtt.service';
import { HaService } from '../ha/ha.service';

@Controller('api')
export class OverviewController {
  constructor(
    private readonly overview: OverviewService,
    private readonly mqtt: MqttService,
    private readonly ha: HaService,
  ) {}

  @Get('sources/live')
  sources() {
    return this.overview.sources();
  }

  @Get('sensors/live')
  sensors() {
    return this.overview.sensors(true);
  }

  @Get('attention')
  async attention() {
    const list = await this.overview.attention();
    // the Lovelace cards depend on MQTT; the panel says so when it is down
    if (this.mqtt.status.configured && !this.mqtt.status.connected) list.push({ code: 'mqtt_down', severity: 'warn', params: { detail: this.mqtt.status.detail } });
    return list;
  }

  /** Litres, minutes and kWh per calendar day (local days, the charts' bars). */
  @Get('stats/days')
  days(@Query('days') days = '14') {
    return this.overview.daily(Math.max(1, Math.min(120, Number(days) || 14)));
  }

  @Get('insights')
  insights(@Query('days') days = '7') {
    return this.overview.insights(Math.max(1, Math.min(90, Number(days) || 7)));
  }

  /** Hourly-ish history of one entity (a flow or pressure sensor) for a line chart. */
  @Get('ha/history')
  async history(@Query('entity') entity: string, @Query('hours') hours = '24') {
    if (!entity) return [];
    const h = Math.max(1, Math.min(168, Number(hours) || 24));
    const res = await this.ha.history([entity], h);
    return (res[entity] ?? []).map((p) => ({ ts: Math.round(p.lu * 1000), v: Number(p.s) })).filter((p) => Number.isFinite(p.v));
  }
}

import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EngineService } from '../engine/engine.service';
import { ConfigService } from '../config/config.service';
import { WeatherService } from '../weather/weather.service';
import { JournalService } from '../journal/journal.service';
import { MqttService } from '../mqtt/mqtt.service';

@Controller('api')
export class ActionsController {
  constructor(
    private readonly engine: EngineService,
    private readonly config: ConfigService,
    private readonly weather: WeatherService,
    private readonly journal: JournalService,
    private readonly mqtt: MqttService,
  ) {}

  @Get('mqtt-status')
  mqttStatus() {
    return this.mqtt.status;
  }

  @Get('state')
  state() {
    return this.engine.snapshot();
  }

  @Get('upcoming')
  upcoming() {
    return this.engine.upcoming(7);
  }

  @Get('plan')
  plan(@Query('days') days = '7') {
    return this.engine.plan(Number(days) || 7);
  }

  @Get('busy-week')
  busyWeek(@Query('excludeKind') excludeKind?: 'group' | 'zone', @Query('excludeId') excludeId?: string) {
    return this.engine.busyWeek(excludeKind && excludeId ? { kind: excludeKind, id: excludeId } : undefined);
  }

  @Get('weather')
  weatherNow() {
    return this.weather.currentWeather();
  }

  @Get('health')
  health() {
    return { ok: true, ts: Date.now() };
  }

  @Get('journal')
  journalList() {
    return this.journal.list(300);
  }

  @Get('zones/:id/next')
  async nextRun(@Param('id') id: string) {
    return { ts: await this.engine.nextRunTs(id) };
  }

  @Post('zones/:id/run')
  async runZone(@Param('id') id: string, @Body() body: { minutes?: number }) {
    return this.engine.startZoneManual(id, body?.minutes);
  }

  @Post('zones/:id/stop')
  async stopZone(@Param('id') id: string) {
    await this.engine.stopZone(id, 'manual_stop');
    return { ok: true };
  }

  @Post('zones/:id/extend')
  async extendZone(@Param('id') id: string, @Body() body: { minutes: number }) {
    if (!body?.minutes) throw new BadRequestException('minutes required');
    await this.engine.extendZone(id, body.minutes);
    return { ok: true };
  }

  @Post('zones/:id/clear-fault')
  clearFault(@Param('id') id: string) {
    this.engine.clearFault(id);
    return { ok: true };
  }

  @Post('groups/:id/run')
  async runGroup(@Param('id') id: string, @Body() body: { minutes?: number }) {
    const group = (await this.config.groups.findOneBy({ id }))!;
    if (!group) throw new BadRequestException('group not found');
    const enqueued = await this.engine.startGroupRun(group, 'manual', body?.minutes);
    return { ok: true, enqueued };
  }

  @Post('stop-all')
  async stopAll() {
    await this.engine.stopAll('manual_stop');
    return { ok: true };
  }

  @Post('rain-delay')
  async rainDelay(@Body() body: { hours: number }) {
    await this.engine.setRainDelay(body?.hours ?? 0);
    return { ok: true };
  }

  @Post('snooze')
  async snooze(@Body() body: { hours: number }) {
    await this.engine.setSnooze(body?.hours ?? 0);
    return { ok: true };
  }

  @Post('pause')
  pause(@Body() body: { paused: boolean }) {
    this.engine.paused = !!body?.paused;
    return { ok: true, paused: this.engine.paused };
  }
}

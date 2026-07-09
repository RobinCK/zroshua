import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ConfigService, Settings } from '../config/config.service';
import { EngineService } from '../engine/engine.service';
import { HaService } from '../ha/ha.service';
import { Group, GroupRule, WaterSource, Zone } from '../db/entities';

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/gi, '_').replace(/^_+|_+$/g, '') || `id_${Date.now()}`;

@Controller('api')
export class ConfigController {
  constructor(
    private readonly config: ConfigService,
    private readonly engine: EngineService,
    private readonly ha: HaService,
  ) {}

  // ---- entities from HA (pickers) ----
  @Get('ha/entities')
  entities() {
    return this.ha.allStates().map((s) => ({
      entity_id: s.entity_id,
      state: s.state,
      name: s.attributes?.friendly_name ?? s.entity_id,
      unit: s.attributes?.unit_of_measurement ?? null,
    }));
  }

  // ---- zones ----
  @Get('zones')
  zones() {
    return this.config.zones.find({ order: { orderIndex: 'ASC' } });
  }

  @Post('zones')
  async createZone(@Body() body: Partial<Zone>) {
    const zone = await this.config.zones.save({ ...body, id: body.id || slug(body.name ?? 'zone') } as Zone);
    await this.engine.reloadConfig();
    return zone;
  }

  @Put('zones/:id')
  async updateZone(@Param('id') id: string, @Body() body: Partial<Zone>) {
    await this.config.zones.update(id, { ...body, id });
    await this.engine.reloadConfig();
    return this.config.zones.findOneBy({ id });
  }

  @Delete('zones/:id')
  async deleteZone(@Param('id') id: string) {
    await this.config.zones.delete(id);
    const groups = await this.config.groups.find();
    for (const g of groups) {
      if (g.zoneIds.includes(id)) {
        g.zoneIds = g.zoneIds.filter((z) => z !== id);
        await this.config.groups.save(g);
      }
    }
    await this.engine.reloadConfig();
    return { ok: true };
  }

  // ---- groups ----
  @Get('groups')
  groups() {
    return this.config.groups.find({ order: { orderIndex: 'ASC' } });
  }

  @Post('groups')
  async createGroup(@Body() body: Partial<Group>) {
    const group = await this.config.groups.save({
      schedules: [],
      zoneIds: [],
      ...body,
      id: body.id || slug(body.name ?? 'group'),
    } as Group);
    await this.engine.reloadConfig();
    return group;
  }

  @Put('groups/:id')
  async updateGroup(@Param('id') id: string, @Body() body: Partial<Group>) {
    await this.config.groups.update(id, { ...body, id });
    await this.engine.reloadConfig();
    return this.config.groups.findOneBy({ id });
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id') id: string) {
    await this.config.groups.delete(id);
    await this.engine.reloadConfig();
    return { ok: true };
  }

  // ---- rules ----
  @Get('rules')
  rules() {
    return this.config.rules.find();
  }

  @Post('rules')
  async createRule(@Body() body: Partial<GroupRule>) {
    const rule = await this.config.rules.save(body as GroupRule);
    await this.engine.reloadConfig();
    return rule;
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id') id: string) {
    await this.config.rules.delete(Number(id));
    await this.engine.reloadConfig();
    return { ok: true };
  }

  // ---- water sources ----
  @Get('sources')
  sources() {
    return this.config.sources.find();
  }

  @Post('sources')
  async createSource(@Body() body: Partial<WaterSource>) {
    const source = await this.config.sources.save({ ...body, id: body.id || slug(body.name ?? 'source') } as WaterSource);
    await this.engine.reloadConfig();
    return source;
  }

  @Put('sources/:id')
  async updateSource(@Param('id') id: string, @Body() body: Partial<WaterSource>) {
    await this.config.sources.update(id, { ...body, id });
    await this.engine.reloadConfig();
    return this.config.sources.findOneBy({ id });
  }

  @Delete('sources/:id')
  async deleteSource(@Param('id') id: string) {
    await this.config.sources.delete(id);
    await this.engine.reloadConfig();
    return { ok: true };
  }

  // ---- settings ----
  @Get('settings')
  settings() {
    return this.config.getSettings();
  }

  @Put('settings')
  async patchSettings(@Body() body: Partial<Settings>) {
    const s = await this.config.patchSettings(body);
    await this.engine.reloadConfig();
    return s;
  }

  // ---- export / import ----
  @Get('export')
  exportAll() {
    return this.config.exportAll();
  }

  @Post('import')
  async importAll(@Body() body: any) {
    await this.config.importAll(body);
    await this.engine.reloadConfig();
    return { ok: true };
  }
}

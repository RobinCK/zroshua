import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { EngineService, OneTimeDraft } from '../engine/engine.service';
import { OneTimeStepZone } from '../db/entities';

/** One-off watering: a dated, one-shot run — not a schedule, not a manual run. */
@Controller('api')
export class OneTimeController {
  constructor(private readonly engine: EngineService) {}

  @Get('one-time')
  list(@Query('all') all?: string) {
    return this.engine.listOneTimeRuns(all === '1' || all === 'true');
  }

  @Post('one-time')
  async create(@Body() body: OneTimeDraft) {
    const draft = this.validate(body, { future: true });
    return this.engine.createOneTimeRun(draft);
  }

  @Put('one-time/:id')
  async update(@Param('id') id: string, @Body() body: OneTimeDraft) {
    const existing = await this.engine.getOneTimeRun(id);
    if (!existing) throw new NotFoundException('one-off run not found');
    if (existing.status !== 'scheduled')
      throw new BadRequestException(`a one-off can only be edited while it is scheduled (this one is ${existing.status})`);
    const draft = this.validate(body, { future: true });
    return this.engine.updateOneTimeRun(id, draft);
  }

  @Post('one-time/preview')
  preview(@Body() body: OneTimeDraft) {
    // a preview must also work for a start that has already slipped into the past
    return this.engine.oneTimePreview(this.validate(body, { future: false }));
  }

  @Post('one-time/:id/pause')
  async pause(@Param('id') id: string, @Body() body: { paused: boolean }) {
    const row = await this.engine.setOneTimePause(id, !!body?.paused);
    if (!row) throw new NotFoundException('one-off run not found');
    if (row === 'running') throw new BadRequestException('this one-off is already running — cancel it to stop the water');
    return row;
  }

  @Delete('one-time/:id')
  async remove(@Param('id') id: string) {
    const result = await this.engine.cancelOneTimeRun(id);
    if (!result) throw new NotFoundException('one-off run not found');
    return { ok: true, ...result };
  }

  /**
   * Shared validation for create/edit/preview. The minutes are taken literally
   * at runtime, so anything nonsensical has to be rejected here.
   */
  private validate(body: OneTimeDraft, opts: { future: boolean }): OneTimeDraft {
    if (!body || typeof body !== 'object') throw new BadRequestException('body required');
    const startTs = Number(body.startTs);
    if (!Number.isFinite(startTs)) throw new BadRequestException('startTs must be a timestamp in ms');
    if (body.anchor && body.anchor !== 'start' && body.anchor !== 'finish')
      throw new BadRequestException('anchor must be "start" or "finish"');
    if (!Array.isArray(body.steps) || !body.steps.length) throw new BadRequestException('at least one step is required');

    const seen = new Set<string>();
    // empty steps are dropped, not rejected: the wizard lets a step be emptied by
    // moving its zones elsewhere, and every index the preview returns is an index
    // into this normalized list
    const steps: OneTimeStepZone[][] = body.steps.filter((s) => Array.isArray(s) && s.length).map((step, i) => {
      return step.map((entry) => {
        const zoneId = String(entry?.zoneId ?? '');
        if (!zoneId) throw new BadRequestException(`step ${i + 1} has a zone without an id`);
        if (seen.has(zoneId)) throw new BadRequestException(`zone ${zoneId} appears in more than one step`);
        seen.add(zoneId);
        const minutes = Number(entry?.minutes);
        if (!Number.isFinite(minutes) || minutes <= 0)
          throw new BadRequestException(`zone ${zoneId}: minutes must be greater than 0`);
        return { zoneId, minutes };
      });
    });

    const interStepDelayS = Number(body.interStepDelayS ?? 0);
    if (!Number.isFinite(interStepDelayS) || interStepDelayS < 0)
      throw new BadRequestException('interStepDelayS must be 0 or more');

    const draft: OneTimeDraft = {
      name: typeof body.name === 'string' ? body.name : null,
      startTs,
      anchor: body.anchor,
      steps,
      interStepDelayS,
      force: !!body.force,
    };
    // with a finish anchor the real start sits earlier — check the resolved one
    if (opts.future && this.engine.resolveOneTimeStart(draft) <= Date.now())
      throw new BadRequestException('the start time must be in the future');
    return draft;
  }
}

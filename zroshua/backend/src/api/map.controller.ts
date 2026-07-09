import { BadRequestException, Body, Controller, Get, Header, Post } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

/** Strips scripts/event handlers from an uploaded SVG before it is stored. */
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, '');
}

/** Extracts candidate element ids (and inkscape labels) from the SVG. */
function extractIds(svg: string): { id: string; label: string | null }[] {
  const out = new Map<string, string | null>();
  const tagRe = /<(path|polygon|rect|circle|ellipse|g)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(svg))) {
    const tag = m[0];
    const id = /\bid\s*=\s*["']([^"']+)["']/.exec(tag)?.[1];
    if (!id) continue;
    const label = /\binkscape:label\s*=\s*["']([^"']+)["']/.exec(tag)?.[1] ?? null;
    out.set(id, label);
  }
  return [...out.entries()].map(([id, label]) => ({ id, label }));
}

@Controller('api/map')
export class MapController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  async get() {
    const svg = await this.config.getKV<string | null>('siteMapSvg', null);
    return { svg, ids: svg ? extractIds(svg) : [] };
  }

  @Get('svg')
  @Header('content-type', 'image/svg+xml')
  async raw() {
    return (await this.config.getKV<string | null>('siteMapSvg', null)) ?? '<svg xmlns="http://www.w3.org/2000/svg"/>';
  }

  @Post()
  async upload(@Body() body: { svg: string }) {
    if (!body?.svg || !/<svg[\s>]/i.test(body.svg)) throw new BadRequestException('not an SVG document');
    if (body.svg.length > 5 * 1024 * 1024) throw new BadRequestException('SVG larger than 5 MB');
    const clean = sanitizeSvg(body.svg);
    await this.config.setKV('siteMapSvg', clean);
    return { ok: true, ids: extractIds(clean) };
  }

  @Post('clear')
  async clear() {
    await this.config.setKV('siteMapSvg', null);
    return { ok: true };
  }
}

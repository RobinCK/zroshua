import { BadRequestException, Body, Controller, Get, Header, Post } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

/** Every drawable SVG shape we let the user assign to a zone. */
const SHAPE_TAGS = 'path|polygon|polyline|rect|circle|ellipse|line';

/** Strips scripts/event handlers from an uploaded SVG before it is stored. */
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, '');
}

/**
 * Guarantees every shape has a stable id so it can be assigned to a zone.
 * Figma/Sketch/most exporters produce shapes (rect/path/…) with no id at all;
 * we inject deterministic `zr-N` ids (in document order) into any shape missing one.
 */
function ensureShapeIds(svg: string): string {
  const used = new Set<string>();
  const idRe = /\bid\s*=\s*["']([^"']+)["']/g;
  let mm: RegExpExecArray | null;
  while ((mm = idRe.exec(svg))) used.add(mm[1]);
  let n = 0;
  const nextId = () => {
    let id: string;
    do {
      id = `zr-${n++}`;
    } while (used.has(id));
    used.add(id);
    return id;
  };
  const tagRe = new RegExp(`<(${SHAPE_TAGS})\\b([^>]*)>`, 'gi');
  return svg.replace(tagRe, (full, tag, attrs) => (/\bid\s*=/.test(attrs) ? full : `<${tag} id="${nextId()}"${attrs}>`));
}

/** Extracts candidate element ids (and inkscape labels) from the SVG. */
function extractIds(svg: string): { id: string; label: string | null }[] {
  const out = new Map<string, string | null>();
  const tagRe = new RegExp(`<(${SHAPE_TAGS})\\b[^>]*>`, 'gi');
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

  /** Loads the stored SVG, backfilling shape ids for maps uploaded before id injection. */
  private async loadSvg(): Promise<string | null> {
    const stored = await this.config.getKV<string | null>('siteMapSvg', null);
    if (!stored) return null;
    const normalized = ensureShapeIds(stored);
    if (normalized !== stored) await this.config.setKV('siteMapSvg', normalized);
    return normalized;
  }

  @Get()
  async get() {
    const svg = await this.loadSvg();
    return { svg, ids: svg ? extractIds(svg) : [] };
  }

  @Get('svg')
  @Header('content-type', 'image/svg+xml')
  async raw() {
    return (await this.loadSvg()) ?? '<svg xmlns="http://www.w3.org/2000/svg"/>';
  }

  @Post()
  async upload(@Body() body: { svg: string }) {
    if (!body?.svg || !/<svg[\s>]/i.test(body.svg)) throw new BadRequestException('not an SVG document');
    if (body.svg.length > 5 * 1024 * 1024) throw new BadRequestException('SVG larger than 5 MB');
    const clean = ensureShapeIds(sanitizeSvg(body.svg));
    await this.config.setKV('siteMapSvg', clean);
    return { ok: true, ids: extractIds(clean) };
  }

  @Post('clear')
  async clear() {
    await this.config.setKV('siteMapSvg', null);
    return { ok: true };
  }
}

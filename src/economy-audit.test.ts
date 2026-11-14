/**
 * Economy audit: compares our modelled economies against what Spansh reports, for a set of known systems.
 *
 * Run:   yarn test:economy            (watch mode - re-runs when economy-model2.ts / system-model2.ts change)
 *        yarn test:economy --watchAll=false
 *
 * Data from the RCC API (system + Spansh economies) is cached on disk for CACHE_HOURS to keep re-runs fast.
 * To force fresh data:   set ECONOMY_AUDIT_REFRESH=1   (PowerShell: $env:ECONOMY_AUDIT_REFRESH=1)
 *
 * A system test fails only when there are ERRORS. Small differences (<= its tolerance) are WARNINGS, as people
 * often add +5% buffs without revisiting every station to update Spansh. Stations Spansh still reports as
 * 'Colony' (never re-docked since completion) are reported as STALE.
 */
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import { GetRealEconomies, systemV2 } from './api/v2-system';
import { apiSvcUrl } from './api/api-util';
import { buildSystemModel2, EconomyMap, SiteMap2 } from './system-model2';
import { Sys } from './types2';

interface AuditSystem {
  name: string;
  architect?: string;
  /** Free text, shown alongside any problems for this system */
  notes?: string;
  /** Notes for specific stations, keyed by station name */
  siteNotes?: Record<string, string>;
  /** Override the default warning tolerance (percentage points) */
  tolerance?: number;
  /** Set true to skip this system entirely */
  skip?: boolean;
}

/** Differences up to this many percentage points are warnings, not errors */
const DEFAULT_TOLERANCE = 15;

// ---------------------------------------------------------------------------------------------------------------
// Master table: add systems here
// ---------------------------------------------------------------------------------------------------------------
const systems: AuditSystem[] = [
  { name: '52 Herculis', architect: 'GuitarPlayer990' },
  { name: 'HIP 90297', architect: 'Grinning2001', notes: 'Fresh build not updated' },
  { name: 'Col 285 Sector GL-X c1-11', architect: 'kekosummer' },
  { name: 'IC 2391 Sector LH-V b2-5', architect: 'Grinning2002', notes: 'Fresh build not updated' },
  { name: 'Synuefe UW-Q b51-1', architect: 'Smartee', notes: 'Off by 5% in a few places' },
  { name: 'Col 285 Sector UU-K b23-4', architect: 'BobDenBest' },
  { name: 'Synuefe KD-J c25-10', architect: 'Smartee' },
  { name: 'Synuefe TG-S b50-1', architect: 'Smartee', notes: 'Off by 5% in a few places' },
  { name: 'IC 2391 Sector FG-Y d16', architect: 'Akovsky', notes: 'Needs a revisit?' },
  { name: 'Synuefe DJ-F D12-50', architect: 'Smartee' },
  { name: 'Synuefe EM-M c23-8', architect: 'Disnaematter', notes: 'Off by 5% in a few places' },
  { name: 'Col 69 Sector MS-S c4-1', architect: 'DSN' },
  { name: 'HIP 6104', architect: 'Smartee' },
  { name: 'DM99 54.2', architect: 'Grinning2001' },
  { name: 'IC 2391 Sector EL-Y c9', architect: 'Grinning2001' },
  { name: 'Synuefe VJ-H c26-1', architect: 'Icky Nuggets' },
  { name: 'IC 2602 Sector DL-Y d62', architect: 'Jayzet' },
  { name: 'HIP 12323', architect: 'KHobbits' },
  { name: 'HIP 40108', architect: 'Jayzet' },
  { name: 'Running Man Sector BQ-Y d27', architect: 'Rudi Raumkraut' },
  { name: 'Antliae Sector CB-X c1-7', architect: 'Ro Anne' },
  { name: 'Swoiwns SK-C d14-21', architect: 'Asleep (Dubior)' },
  { name: 'Synuefe GQ-C b46-1', architect: 'Bulli57' },

  // Project Galtea Hubs
  { name: 'Greae Phoea RF-I c25-207', architect: 'GFJake' },
  { name: 'Pueloi VY-S d3-94', architect: 'GFJake' },
  { name: 'Preae Aihm EH-D d12-64', architect: 'GFJake' },
  { name: 'Plio Aihm UC-V d2-159', architect: 'GFJake' },
  { name: 'NGC 6357 Sector BQ-Y d146', architect: 'GFJake' },
  { name: `Cat's Paw Sector GW-W c1-9`, architect: 'GFJake' },
  { name: 'Tr 24 Sector QH-U b32-2', architect: 'GFJake' },
  { name: 'Bleia Eohn QT-O d7-10', architect: 'GFJake' },

];

// ---------------------------------------------------------------------------------------------------------------

type Level = 'ERROR' | 'WARN' | 'STALE' | 'FETCH';

interface Finding {
  system: string;
  site: string;
  body: string;
  economy: string;
  estimate?: number;
  spansh?: number;
  level: Level;
  updated?: string;
  notes?: string;
}

const CACHE_HOURS = 6;
const cacheDir = path.join(process.cwd(), 'node_modules', '.cache', 'economy-audit');
const refresh = !!process.env.ECONOMY_AUDIT_REFRESH;

const httpsGetJson = <T>(url: string): Promise<T> => new Promise((resolve, reject) => {
  https.get(url, res => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}: ${body.slice(0, 200)}`));
      } else {
        try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
      }
    });
  }).on('error', reject);
});

const getCached = async <T>(key: string, uri: string): Promise<T> => {
  const file = path.join(cacheDir, key.replace(/[^\w.-]+/g, '_') + '.json');
  if (!refresh && fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < CACHE_HOURS * 3_600_000) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  const result = await httpsGetJson<T>(new URL(uri, apiSvcUrl).toString());
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(result));
  return result;
};

/** Same matching rule as EconomyTable2 */
const findReal = (reals: GetRealEconomies[], site: SiteMap2) => reals.find(r => typeof r.id === 'number'
  ? r.id === site.marketId
  : r.id.substring(1) === site.marketId.toString());

const auditSystem = async (entry: AuditSystem): Promise<Finding[]> => {
  const findings: Finding[] = [];
  const tolerance = entry.tolerance ?? DEFAULT_TOLERANCE;
  const enc = encodeURIComponent(entry.name);

  let sys: Sys;
  let reals: GetRealEconomies[];
  try {
    sys = await getCached<Sys>(`${entry.name}.sys`, `/api/v2/system/${enc}`);
    reals = await getCached<GetRealEconomies[]>(`${entry.name}.spansh`, `/api/v2/system/${sys.id64}/spanshEconomies`);
  } catch (err: any) {
    return [{ system: entry.name, site: '-', body: '-', economy: '-', level: 'FETCH', notes: err?.message }];
  }

  // mirror SystemView2.useLoadedData: default to calculating with ALL sites, complete sites only, with buff/nerf
  if (sys.idxCalcLimit === undefined) { sys.idxCalcLimit = sys.sites.length; }
  const sysMap = buildSystemModel2(sys, false, true);

  const sites = sysMap.siteMaps
    .filter(s => !!s.economies && s.marketId > 4_200_000_000)
    .sort((a, b) => a.bodyNum - b.bodyNum);

  for (const site of sites) {
    const real = findReal(reals, site);
    if (!real?.economies) { continue; }

    const base = {
      system: entry.name,
      site: site.name,
      body: site.body?.name.replace(sys.name, '').trim() ?? '?',
      updated: real.updated?.slice(0, 10),
      notes: entry.siteNotes?.[site.name],
    };

    // Spansh has not seen this station since it was completed
    const realKeys = Object.keys(real.economies).filter(k => (real.economies as any)[k] > 0);
    if (realKeys.length === 1 && realKeys[0] === 'colony') {
      findings.push({ ...base, economy: '(colony)', level: 'STALE' });
      continue;
    }

    const keys = Array.from(new Set([...Object.keys(site.economies!), ...Object.keys(real.economies)])) as (keyof EconomyMap)[];
    for (const key of keys) {
      const estimate = Math.round((site.economies![key] ?? 0) * 100);
      const spansh = Math.round(real.economies[key] ?? 0);
      if (estimate === spansh) { continue; }
      const level: Level = Math.abs(estimate - spansh) <= tolerance ? 'WARN' : 'ERROR';
      findings.push({ ...base, economy: key, estimate, spansh, level });
    }
  }

  if (sys.v < systemV2.currentSchemaVersion) {
    findings.unshift({ system: entry.name, site: '-', body: '-', economy: '-', level: 'STALE', notes: `Schema v${sys.v}: needs re-import` });
  }
  return findings;
};

// ---------------------------------------------------------------------------------------------------------------
// Reporting

const pct = (n?: number) => n === undefined ? '' : `${n}%`;
const diffTxt = (f: Finding) => f.estimate === undefined || f.spansh === undefined ? '' : `${f.estimate - f.spansh > 0 ? '+' : ''}${f.estimate - f.spansh}%`;
const icon: Record<Level, string> = { ERROR: '✗ ERROR', WARN: '⚠ warn', STALE: '~ stale', FETCH: '✗ FETCH' };
const passIcon = '✓ pass';

/** ANSI colours for the Level column (disabled when NO_COLOR is set or output is not a terminal) */
const useColor = !process.env.NO_COLOR && (!!process.stdout.isTTY || !!process.env.FORCE_COLOR);
const levelColor: Record<string, string> = { [icon.ERROR]: '\x1b[31m', [icon.FETCH]: '\x1b[31m', [icon.WARN]: '\x1b[33m', [icon.STALE]: '\x1b[90m', [passIcon]: '\x1b[32m' };
const colorize = (txt: string, raw: string) => useColor && levelColor[raw] ? `${levelColor[raw]}${txt}\x1b[0m` : txt;

const renderTable = (results: Map<AuditSystem, Finding[]>): string => {
  const header = ['System', 'Level', 'Station', 'Body', 'Economy', 'Est', 'Spansh', 'Diff', 'Spansh as of', 'Notes'];
  const rows: string[][] = [];
  let passCount = 0;

  /** System name colour: red if any error, else yellow if any warn/stale, else green */
  const systemLevel = new Map<string, string>();

  for (const [entry, findings] of Array.from(results.entries())) {
    systemLevel.set(entry.name,
      findings.some(f => f.level === 'ERROR' || f.level === 'FETCH') ? icon.ERROR
        : findings.length > 0 ? icon.WARN
          : passIcon);

    if (findings.length === 0) {
      // every compared station matches Spansh exactly
      passCount++;
      rows.push([entry.name, passIcon, '', '', '', '', '', '', '', entry.notes ?? '']);
      continue;
    }
    let lastSys = '', lastSite = '';
    findings.forEach((f, i) => {
      const firstOfSite = f.site !== lastSite || f.system !== lastSys;
      rows.push([
        f.system !== lastSys ? f.system : '',
        icon[f.level],
        firstOfSite ? f.site : '',
        firstOfSite ? f.body : '',
        f.economy,
        pct(f.estimate),
        pct(f.spansh),
        diffTxt(f),
        firstOfSite ? f.updated ?? '' : '',
        [i === 0 ? entry.notes : undefined, firstOfSite ? f.notes : undefined].filter(Boolean).join(' / '),
      ]);
      lastSys = f.system; lastSite = f.site;
    });
  }

  const widths = header.map((h, c) => Math.max(h.length, ...rows.map(r => r[c].length)));
  // pad first, then colour, so invisible ANSI codes don't break column alignment
  const line = (cells: string[]) => cells.map((v, c) => colorize(v.padEnd(widths[c]), c === 0 ? systemLevel.get(v) ?? '' : v)).join(' | ').trimEnd();
  const sep = widths.map(w => '-'.repeat(w)).join('-+-');

  const all = Array.from(results.values()).flat();
  const count = (l: Level) => all.filter(f => f.level === l).length;
  const failedSystems = Array.from(results.values()).filter(fs => fs.some(f => f.level === 'ERROR' || f.level === 'FETCH')).length;

  return [
    '',
    '=== Economy audit vs Spansh ===',
    '',
    line(header), sep, ...rows.map(line),
    '',
    `Systems: ${results.size} | fully matching: ${passCount} | failing: ${failedSystems} | errors: ${count('ERROR')} | warnings: ${count('WARN')} | stale: ${count('STALE')} | fetch failures: ${count('FETCH')}`,
    '',
  ].join('\n');
};

// ---------------------------------------------------------------------------------------------------------------

const results = new Map<AuditSystem, Finding[]>();
const active = systems.filter(s => !s.skip);

jest.setTimeout(120_000);

beforeAll(async () => {
  // fetch a few at a time so we don't hammer the server
  const queue = [...active];
  const worker = async () => {
    for (let entry = queue.shift(); entry; entry = queue.shift()) {
      results.set(entry, await auditSystem(entry));
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
});

afterAll(() => {
  // keep master-table order in the report
  const ordered = new Map(active.filter(e => results.has(e)).map(e => [e, results.get(e)!]));
  process.stdout.write(renderTable(ordered) + '\n');
});

describe('Economy audit vs Spansh', () => {
  it.each(active.map(s => [s.name, s] as const))('%s', (_name, entry) => {
    const findings = results.get(entry) ?? [];
    const errors = findings.filter(f => f.level === 'ERROR' || f.level === 'FETCH');
    if (errors.length > 0) {
      const err = new Error(errors.map(f => f.level === 'FETCH'
        ? `Fetch failed: ${f.notes}`
        : `${f.site}: ${f.economy} est ${f.estimate}% vs Spansh ${f.spansh}% (${diffTxt(f)})`
      ).join('\n'));
      err.stack = err.message; // no code frame / stack trace noise
      throw err;
    }
  });
});

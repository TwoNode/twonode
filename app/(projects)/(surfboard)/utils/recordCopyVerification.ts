import { RecordCopyVerificationTolerances } from "../actions/settingsActions";

// ============================================================
// PDF EXTRACTION LOGIC
// ============================================================

const RE_BEARING = /(\d{1,3})[^\d\s]{1,3}\s*(\d{1,2})[^\d\s]{0,3}/g;
const RE_EASTING  = /((?:\d+\s)*\d+\.\d+)\s*mE/gi;
const RE_NORTHING = /((?:\d+\s)*\d+\.\d+)\s*mN/gi;

export interface ExtractedBearing { degrees: number; raw: string; }
export interface ExtractedDistance { metres: number; raw: string; }
export interface RefCoord { easting: number; northing: number; }

export function extractFromPDFText(allText: string, allItemsParam?: string[]) {
  const warnings: string[] = [];

  // Bearings
  const bearings: ExtractedBearing[] = [];
  const RE_BRG = /(\d{1,3})\s*[^\d\s]{1,3}\s*(\d{1,2})\s*[^\d\s]{0,3}/g;
  let m;
  RE_BRG.lastIndex = 0;
  while ((m = RE_BRG.exec(allText)) !== null) {
    const deg = parseFloat(m[1]), min = parseFloat(m[2]);
    if (deg > 360 || min >= 60) continue;
    bearings.push({ degrees: deg + min / 60, raw: m[0] });
  }

  // Distances
  const distances: ExtractedDistance[] = [];
  // Use provided allItems from pagerender, or fallback to tokenizing text
  const allItems = allItemsParam || allText.split(/\s+/);
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    if (/\d+\.\d+\s*m[EN]/i.test(item)) continue; // skip coords

    const inlineRE = /(\d+\.\d+)\s*m(?![ENen\w])/gi;
    let mD;
    inlineRE.lastIndex = 0;
    while ((mD = inlineRE.exec(item)) !== null) {
      const d = parseFloat(mD[1]);
      if (d > 0 && d < 10000) distances.push({ metres: d, raw: mD[1] + 'm' });
    }

    if (/^\d+\.\d+$/.test(item) && i + 1 < allItems.length && /^m$/i.test(allItems[i+1])) {
      const d = parseFloat(item);
      if (d > 0 && d < 10000) { distances.push({ metres: d, raw: d + 'm' }); i++; }
    }
  }

  // Reference coordinates
  const bestCoord = (raw: string, plausible: (v: number) => boolean) => {
    const parts = raw.trim().split(/\s+/);
    for (let i = 0; i < parts.length; i++) {
      const v = parseFloat(parts.slice(i).join(''));
      if (!isNaN(v) && plausible(v)) return v;
    }
    return null;
  };
  const plausibleE = (v: number) => v >= 100000 && v <= 999999;
  const plausibleN = (v: number) => v >= 100000 && v <= 9999999;

  const eastings: number[] = [], northings: number[] = [];
  RE_EASTING.lastIndex = 0;
  RE_NORTHING.lastIndex = 0;
  while ((m = RE_EASTING.exec(allText)) !== null) {
    const v = bestCoord(m[1], plausibleE);
    if (v !== null) eastings.push(v);
  }
  while ((m = RE_NORTHING.exec(allText)) !== null) {
    const v = bestCoord(m[1], plausibleN);
    if (v !== null) northings.push(v);
  }

  const refCoords: RefCoord[] = [];
  for (let i = 0; i < Math.min(eastings.length, northings.length); i++) {
    refCoords.push({ easting: eastings[i], northing: northings[i] });
  }

  // Areas
  const pdfAreas: any[] = [];
  const areaRE = /AREA\s*(?:\(([^)]*)\))?\s*[:\-\=\s]{0,3}\s*([\d,]+\.?\d*)\s*(SQ(?:UARE)?\.?\s*M(?:TS?|ETRES?)?|M2|HA|HECTARES?|ACRES?)/gi;
  let am;
  while ((am = areaRE.exec(allText)) !== null) {
    const label = am[1] ? am[1].trim() : String(pdfAreas.length + 1);
    const rawVal = parseFloat(am[2].replace(/,/g, ''));
    const unitRaw = am[3].toUpperCase().replace(/\s+/g,'');
    let sqm;
    if (unitRaw === 'HA' || unitRaw.startsWith('HECTARE')) sqm = rawVal * 10000;
    else if (unitRaw.startsWith('ACRE')) sqm = rawVal * 4046.856422;
    else sqm = rawVal;
    pdfAreas.push({ label, rawValue: rawVal, unit: am[3].trim(), sqm });
  }
  const pdfArea = pdfAreas.length > 0 ? pdfAreas[0].sqm : null;

  return { bearings, distances, refCoords, pdfArea, pdfAreas, warnings };
}

// ============================================================
// VERIFICATION LOGIC
// ============================================================

export function identifyAnchor(refCoords: RefCoord[], csvVertices: any[], tolAnchor: number) {
  let best: any = null;
  for (const ref of refCoords) {
    for (const v of csvVertices) {
      const res = Math.hypot(ref.easting - v.easting, ref.northing - v.northing);
      if (!best || res < best.residual) best = { ref, vertex: v, residual: res };
    }
  }
  if (!best) return null;
  best.isExact = best.residual <= 0.01;
  best.withinTol = best.residual <= tolAnchor;
  return best;
}

export function computeWCB(fromV: any, toV: any) {
  const dE = toV.easting - fromV.easting;
  const dN = toV.northing - fromV.northing;
  let deg = Math.atan2(dE, dN) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export function shoelaceArea(vertices: any[]) {
  const n = vertices.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].easting * vertices[j].northing;
    area -= vertices[j].easting * vertices[i].northing;
  }
  return Math.abs(area) / 2;
}

export function roundWCBToMinute(deg: number) {
  const rounded = Math.round(deg * 60) / 60;
  return rounded >= 360 ? 0 : rounded;
}

export function roundDistTo2dp(m: number) {
  return Math.round(m * 100) / 100;
}

export function computeLegsFromCSV(anchor: any, csvVertices: any[]) {
  const idx = csvVertices.findIndex(v => v.id === anchor.vertex.id);
  if (idx < 0) return [];
  const n = csvVertices.length;
  const legs = [];
  for (let i = 0; i < n; i++) {
    const from = csvVertices[(idx + i) % n];
    const to = csvVertices[(idx + i + 1) % n];
    const rawDist = Math.hypot(to.easting - from.easting, to.northing - from.northing);
    const rawWCB = computeWCB(from, to);
    const dist = roundDistTo2dp(rawDist);
    const wcb = roundWCBToMinute(rawWCB);
    legs.push({ from, to, wcb, dist, rawWCB, rawDist });
  }
  return legs;
}

export function buildExpectedPool(computedLegs: any[], tolWCB: number, tolDist: number) {
  const pool: any[] = [];
  for (const leg of computedLegs) {
    const existing = pool.find(
      e => Math.abs(e.wcb - leg.wcb) <= tolWCB && Math.abs(e.dist - leg.dist) <= tolDist
    );
    if (existing) {
      existing.count++;
      existing.legs.push(leg);
    } else {
      pool.push({ wcb: leg.wcb, dist: leg.dist, count: 1, available: 1, legs: [leg] });
    }
  }
  pool.forEach(e => e.available = e.count);
  return pool;
}

export function matchLegs(
  computedLegs: any[],
  extractedBearings: ExtractedBearing[],
  extractedDistances: ExtractedDistance[],
  expectedPool: any[],
  tolWCB: number,
  tolDist: number
) {
  const bPool: any[] = [];
  for (const b of extractedBearings) {
    const existing = bPool.find(e => Math.abs(e.degrees - b.degrees) <= tolWCB);
    if (existing) {
      existing.extractedCount++;
    } else {
      const csvCount = expectedPool
        .filter(e => Math.abs(e.wcb - b.degrees) <= tolWCB)
        .reduce((s, e) => s + e.count, 0);
      bPool.push({ degrees: b.degrees, raw: b.raw, extractedCount: 1, remaining: csvCount || 1 });
    }
  }

  const dPool: any[] = [];
  for (const d of extractedDistances) {
    const existing = dPool.find(e => Math.abs(e.metres - d.metres) <= tolDist);
    if (existing) {
      existing.extractedCount++;
    } else {
      const csvCount = expectedPool
        .filter(e => Math.abs(e.dist - d.metres) <= tolDist)
        .reduce((s, e) => s + e.count, 0);
      dPool.push({ metres: d.metres, raw: d.raw, extractedCount: 1, remaining: csvCount || 1 });
    }
  }

  const legResults = [];
  const errors = [];

  for (let step = 0; step < computedLegs.length; step++) {
    const cLeg = computedLegs[step];

    const matchedBrg = bPool.find(b => b.remaining > 0 && Math.abs(b.degrees - cLeg.wcb) <= tolWCB);
    const matchedDist = dPool.find(d => d.remaining > 0 && Math.abs(d.metres - cLeg.dist) <= tolDist);

    const bMatch = !!matchedBrg;
    const dMatch = !!matchedDist;

    if (bMatch && dMatch) {
      matchedBrg.remaining--;
      matchedDist.remaining--;
      legResults.push({
        index: step,
        computedWCB: cLeg.wcb,
        computedDist: cLeg.dist,
        extractedWCB: matchedBrg.degrees,
        extractedDist: matchedDist.metres,
        wcbResidual: Math.abs(matchedBrg.degrees - cLeg.wcb),
        distResidual: Math.abs(matchedDist.metres - cLeg.dist),
        fromVertex: cLeg.from,
        toVertex: cLeg.to,
        accepted: true,
      });
    } else {
      const msg = 'Leg ' + (step + 1) + ' (' + cLeg.from.id + '\u2192' + cLeg.to.id + '): ' +
        (!bMatch ? 'WCB ' + cLeg.wcb.toFixed(4) + '\u00b0 not found. ' : '') +
        (!dMatch ? 'Distance ' + cLeg.dist.toFixed(4) + 'm not found.' : '');
      errors.push({ type: 'MISSING_IN_PDF', msg, step });
      legResults.push({
        index: step,
        computedWCB: cLeg.wcb,
        computedDist: cLeg.dist,
        extractedWCB: matchedBrg?.degrees ?? null,
        extractedDist: matchedDist?.metres ?? null,
        wcbResidual: matchedBrg ? Math.abs(matchedBrg.degrees - cLeg.wcb) : null,
        distResidual: matchedDist ? Math.abs(matchedDist.metres - cLeg.dist) : null,
        fromVertex: cLeg.from,
        toVertex: cLeg.to,
        accepted: false,
      });
    }
  }

  return { legResults, errors };
}

export function reconstructTraverse(
  anchor: any,
  extractedBearings: ExtractedBearing[],
  extractedDistances: ExtractedDistance[],
  csvVertices: any[],
  tolWCB: number,
  tolDist: number
) {
  const computedLegs = computeLegsFromCSV(anchor, csvVertices);
  if (!computedLegs.length) return {
    computedLegs: [], legResults: [], errors: [],
    closed: true, totalLength: 0,
    warnings: ['Could not build CSV leg sequence'],
  };

  const expectedPool = buildExpectedPool(computedLegs, tolWCB, tolDist);
  const { legResults, errors } = matchLegs(computedLegs, extractedBearings, extractedDistances, expectedPool, tolWCB, tolDist);

  const totalLength = computedLegs.reduce((s, l) => s + l.dist, 0);
  const nMatched = legResults.filter(lr => lr.accepted).length;
  const allMatched = nMatched === computedLegs.length;
  const closed = allMatched;

  const warnings: string[] = [];
  if (!allMatched) warnings.push(`${computedLegs.length - nMatched} CSV leg(s) not found in extracted text`);

  return {
    computedLegs, legResults, errors,
    closed, totalLength,
    warnings, expectedPool,
  };
}

export function residualToPct(res: number, tolerance: number) {
  return Math.max(0, 100 * (1 - res / (tolerance * 2)));
}

export function scoreResults(
  traverse: any,
  tolerances: RecordCopyVerificationTolerances,
  areaMatch = true,
  pdfArea: number | null = null
) {
  const { legResults, errors } = traverse;
  const { tolWCB, tolDist, tolPass, tolWarn } = tolerances;

  const scores = legResults.map((lr: any) => {
    const wcbPct = lr.accepted && lr.wcbResidual != null ? residualToPct(lr.wcbResidual, tolWCB) : 0;
    const distPct = lr.accepted && lr.distResidual != null ? residualToPct(lr.distResidual, tolDist) : 0;
    const legPct = lr.accepted ? (wcbPct + distPct) / 2 : 0;
    return {
      fromId: lr.fromVertex?.id || lr.fromVertex?.pillarNumber || lr.fromVertex?.pillar || lr.fromVertex?.point || lr.fromVertex?.no || '?',
      toId: lr.toVertex?.id || lr.toVertex?.pillarNumber || lr.toVertex?.pillar || lr.toVertex?.point || lr.toVertex?.no || '?',
      computedWCB: lr.computedWCB,
      computedDist: lr.computedDist,
      extractedWCB: lr.extractedWCB,
      extractedDist: lr.extractedDist,
      wcbResidual: lr.wcbResidual,
      distResidual: lr.distResidual,
      wcbPct, distPct, legPct,
      accepted: lr.accepted,
    };
  });

  const overall = scores.length ? scores.reduce((a: number, s: any) => a + s.legPct, 0) / scores.length : 0;
  const matched = legResults.filter((lr: any) => lr.accepted).length;

  const hasLegErrors = errors.length > 0;
  const hasAreaFail = pdfArea != null && !areaMatch;
  const hasAnyIssue = hasLegErrors || hasAreaFail;

  let status: "VERIFIED" | "REVIEW" | "NOT_VERIFIED" | "ERROR";
  if (hasAnyIssue) status = 'NOT_VERIFIED';
  else if (overall >= tolPass) status = 'VERIFIED';
  else if (overall >= tolWarn) status = 'REVIEW';
  else status = 'NOT_VERIFIED';

  return {
    scores, overall, matched, status,
    hasAnyIssue, hasLegErrors, hasAreaFail,
    errors,
  };
}

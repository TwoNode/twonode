// =============================================
// File: geojson.ts
// =============================================
export function closeRing(ring: number[][]): number[][] {
  if (!ring?.length) return ring;
  const first = ring[0];
  const last = ring[ring?.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1])
    return [...ring, [...first]];
  return ring;
}

export function normalizePolygon(geom: any): any {
  if (!geom) return geom;
  if (geom.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: (geom.coordinates || []).map((ring: number[][]) =>
        closeRing(ring)
      ),
    };
  }
  if (geom.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: (geom.coordinates || []).map((poly: number[][][]) =>
        poly.map((r) => closeRing(r))
      ),
    };
  }
  return geom;
}

export function featureFromPlan(plan: {
  id?: string;
  planNumber: string;
  geometry: any;
  properties?: Record<string, any>;
}) {
  return {
    type: "Feature",
    id: plan.id || plan.planNumber,
    geometry: normalizePolygon(plan.geometry),
    properties: { planNumber: plan.planNumber, ...(plan.properties || {}) },
  };
}

export function toFeatureCollection(features: any[]) {
  return { type: "FeatureCollection", features };
}

/** Ensures polygon rings are closed; supports Polygon & MultiPolygon */
export function normalizeGeoJSONPolygon(geom: any) {
  if (!geom) return geom;
  const close = (ring: number[][]) => {
    if (!ring.length) return ring;
    const [fx, fy] = ring[0];
    const [lx, ly] = ring[ring.length - 1];
    if (fx !== lx || fy !== ly) ring.push([fx, fy]);
    return ring;
  };
  if (geom.type === "Polygon") {
    geom.coordinates = geom.coordinates.map((r: number[][]) => close([...r]));
    return geom;
  }
  if (geom.type === "MultiPolygon") {
    geom.coordinates = geom.coordinates.map((poly: number[][][]) =>
      poly.map((r) => close([...r]))
    );
    return geom;
  }
  return geom;
}

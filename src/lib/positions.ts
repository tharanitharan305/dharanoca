import { haversineKm, round, type SatellitePass } from "./orbit";

export type SatStatus = "conflict" | "caution" | "clear" | "inactive";

export type SatState = {
  name: string;
  lat: number;
  lon: number;
  altitude_km: number;
  distanceKm: number;
  status: SatStatus;
  nextConflictMin: number | null;
};

type Track = { name: string; altitude_km: number; pts: { min: number; lat: number; lon: number }[] };

/** Group same-day passes per satellite into an ordered ground track. */
export function buildTracks(passes: SatellitePass[], date: string): Track[] {
  const byName = new Map<string, Track>();
  for (const p of passes) {
    if (p.pass_datetime.slice(0, 10) !== date) continue;
    const [hh = 0, mm = 0] = p.pass_datetime.slice(11, 16).split(":").map(Number);
    let t = byName.get(p.satellite_name);
    if (!t) {
      t = { name: p.satellite_name, altitude_km: p.altitude_km ?? 550, pts: [] };
      byName.set(p.satellite_name, t);
    }
    t.pts.push({ min: hh * 60 + mm, lat: p.latitude, lon: p.longitude });
  }
  const tracks = [...byName.values()];
  tracks.forEach((t) => t.pts.sort((a, b) => a.min - b.min));
  return tracks;
}

function toVec(lat: number, lon: number): [number, number, number] {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)];
}

function toLatLon(v: [number, number, number]) {
  const [x, y, z] = v;
  const len = Math.hypot(x, y, z) || 1;
  const lat = (Math.asin(y / len) * 180) / Math.PI;
  const lon = (Math.atan2(z, x) * 180) / Math.PI;
  return { lat, lon };
}

/** Great-circle (slerp) interpolation between two ground points. */
function slerp(a: [number, number, number], b: [number, number, number], f: number) {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  dot = Math.max(-1, Math.min(1, dot));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return a;
  const s1 = Math.sin((1 - f) * omega) / Math.sin(omega);
  const s2 = Math.sin(f * omega) / Math.sin(omega);
  return [a[0] * s1 + b[0] * s2, a[1] * s1 + b[1] * s2, a[2] * s1 + b[2] * s2] as [
    number,
    number,
    number,
  ];
}

const MAX_GAP = 1440; // interpolate across the whole day between recorded passes
const SOLO_WINDOW = 1440;

/** Position of a satellite at minute-of-day `min`, or null when not in the tracked window. */
export function positionAt(track: Track, min: number): { lat: number; lon: number } | null {
  const pts = track.pts;
  if (pts.length === 0) return null;
  if (pts.length === 1) {
    const p = pts[0]!;
    return Math.abs(min - p.min) <= SOLO_WINDOW ? { lat: p.lat, lon: p.lon } : null;
  }
  if (min < pts[0]!.min) {
    return pts[0]!.min - min <= SOLO_WINDOW ? { lat: pts[0]!.lat, lon: pts[0]!.lon } : null;
  }
  const last = pts[pts.length - 1]!;
  if (min > last.min) {
    return min - last.min <= SOLO_WINDOW ? { lat: last.lat, lon: last.lon } : null;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (min >= a.min && min <= b.min) {
      if (b.min - a.min > MAX_GAP) {
        if (min - a.min <= SOLO_WINDOW) return { lat: a.lat, lon: a.lon };
        if (b.min - min <= SOLO_WINDOW) return { lat: b.lat, lon: b.lon };
        return null;
      }
      const f = b.min === a.min ? 0 : (min - a.min) / (b.min - a.min);
      return toLatLon(slerp(toVec(a.lat, a.lon), toVec(b.lat, b.lon), f));
    }
  }
  return null;
}

/** Satellite states (position + conflict colour) at a given minute of the day. */
export function statesAt(
  tracks: Track[],
  min: number,
  site: { latitude: number; longitude: number } | null,
  radiusKm: number,
): SatState[] {
  return tracks.map((t) => {
    const pos = positionAt(t, min);
    if (!pos || !site) {
      return {
        name: t.name,
        lat: pos?.lat ?? 0,
        lon: pos?.lon ?? 0,
        altitude_km: t.altitude_km,
        distanceKm: pos && site ? round(haversineKm(site.latitude, site.longitude, pos.lat, pos.lon), 0) : 0,
        status: (pos ? "clear" : "inactive") as SatStatus,
        nextConflictMin: null,
      };
    }
    const d = haversineKm(site.latitude, site.longitude, pos.lat, pos.lon);
    let status: SatStatus = "clear";
    let nextConflictMin: number | null = null;
    if (d <= radiusKm) {
      status = "conflict";
      nextConflictMin = min;
    } else {
      for (let dt = 5; dt <= 60; dt += 5) {
        const p2 = positionAt(t, min + dt);
        if (!p2) continue;
        if (haversineKm(site.latitude, site.longitude, p2.lat, p2.lon) <= radiusKm) {
          status = "caution";
          nextConflictMin = min + dt;
          break;
        }
      }
    }
    return {
      name: t.name,
      lat: pos.lat,
      lon: pos.lon,
      altitude_km: t.altitude_km,
      distanceKm: round(d, 0),
      status,
      nextConflictMin,
    };
  });
}

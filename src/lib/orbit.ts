export type SatellitePass = {
  id: string;
  satellite_name: string;
  latitude: number;
  longitude: number;
  pass_datetime: string; // ISO
  altitude_km?: number;
  source?: string;
};

const SATELLITES: { name: string; alt: number }[] = [
  { name: "ISS (ZARYA)", alt: 420 },
  { name: "NOAA-15", alt: 810 },
  { name: "NOAA-18", alt: 854 },
  { name: "NOAA-19", alt: 870 },
  { name: "HUBBLE (HST)", alt: 540 },
  { name: "CARTOSAT-3", alt: 509 },
  { name: "CARTOSAT-2F", alt: 505 },
  { name: "RISAT-2B", alt: 555 },
  { name: "OCEANSAT-3", alt: 720 },
  { name: "INSAT-3DR", alt: 35786 },
  { name: "GSAT-30", alt: 35786 },
  { name: "STARLINK-3021", alt: 550 },
  { name: "STARLINK-4127", alt: 545 },
  { name: "STARLINK-5583", alt: 560 },
  { name: "STARLINK-6210", alt: 535 },
  { name: "SENTINEL-2B", alt: 786 },
  { name: "LANDSAT-9", alt: 705 },
  { name: "TERRA", alt: 705 },
  { name: "AQUA", alt: 705 },
  { name: "ASTROSAT", alt: 650 },
];

/** Busy ground-track hubs near well-known launch sites, so the demo shows conflicts. */
const HUBS = [
  { lat: 13.72, lon: 80.23 },
  { lat: 28.57, lon: -80.65 },
  { lat: 45.96, lon: 63.31 },
];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic-ish simulated ground-track passes for the next 14 days. */
export function generateSeedData(startDate = new Date()): SatellitePass[] {
  const rand = mulberry32(20260823);
  const rows: SatellitePass[] = [];
  const base = new Date(startDate);
  base.setHours(0, 0, 0, 0);

  SATELLITES.forEach((sat, si) => {
    const inclinationSpread = 20 + rand() * 60;
    const nodeDrift = -15 - rand() * 20; // deg per pass (ground track drift)
    let lon = -180 + rand() * 360;
    for (let day = 0; day < 14; day++) {
      const passes = 4 + Math.floor(rand() * 4);
      for (let p = 0; p < passes; p++) {
        const minutesOfDay = Math.floor(rand() * 1440);
        const dt = new Date(base.getTime() + day * 86400000 + minutesOfDay * 60000);
        lon += nodeDrift + (rand() - 0.5) * 30;
        while (lon > 180) lon -= 360;
        while (lon < -180) lon += 360;
        let lat = Math.max(
          -85,
          Math.min(85, Math.sin((si + p + day) * 1.7) * inclinationSpread + (rand() - 0.5) * 18),
        );
        if (rand() < 0.22) {
          const hub = HUBS[Math.floor(rand() * HUBS.length)]!;
          lat = hub.lat + (rand() - 0.5) * 8;
          lon = hub.lon + (rand() - 0.5) * 8;
        }
        rows.push({
          id: `seed-${si}-${day}-${p}`,
          satellite_name: sat.name,
          latitude: round(lat, 3),
          longitude: round(lon, 3),
          pass_datetime: toLocalIso(dt),
          altitude_km: sat.alt,
          source: "simulated",
        });
      }
    }
  });

  const step = Math.max(1, Math.floor(rows.length / 140));
  return rows
    .filter((_, i) => i % step === 0)
    .slice(0, 140)
    .sort((a, b) => a.pass_datetime.localeCompare(b.pass_datetime));
}

export function round(n: number, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/** Local (non-UTC) ISO string: YYYY-MM-DDTHH:mm */
export function toLocalIso(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type PlanInput = {
  latitude: number;
  longitude: number;
  date: string; // YYYY-MM-DD
  radiusKm: number;
  bufferMin: number;
  earliestHour: number;
};

export type ConsideredPass = {
  satellite_name: string;
  time: string; // HH:mm
  minutesOfDay: number;
  distanceKm: number;
  conflict: boolean;
  altitude_km?: number | undefined;
};

export type Window = { startMin: number; endMin: number; blocked: boolean; causes: string[] };

export type PlanResult = {
  considered: ConsideredPass[];
  conflicts: ConsideredPass[];
  windows: Window[];
  recommended: Window | null;
  reasons: { kind: "blocked" | "clear"; text: string }[];
};

export function formatMinutes(m: number) {
  const h = Math.floor(m / 60) % 24;
  const mm = Math.floor(m % 60);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ampm}`;
}

export function planLaunch(passes: SatellitePass[], input: PlanInput): PlanResult {
  const sameDay = passes.filter((p) => p.pass_datetime.slice(0, 10) === input.date);

  const considered: ConsideredPass[] = sameDay
    .map((p) => {
      const d = haversineKm(input.latitude, input.longitude, p.latitude, p.longitude);
      const t = p.pass_datetime.slice(11, 16);
      const [hh = 0, mm = 0] = t.split(":").map(Number);
      return {
        satellite_name: p.satellite_name,
        time: t,
        minutesOfDay: hh * 60 + mm,
        distanceKm: round(d, 1),
        conflict: d <= input.radiusKm,
        altitude_km: p.altitude_km,
      };
    })
    .sort((a, b) => a.minutesOfDay - b.minutesOfDay);

  const conflicts = considered.filter((c) => c.conflict);

  // Build blocked intervals
  type Iv = { s: number; e: number; causes: string[] };
  const intervals: Iv[] = conflicts
    .map((c) => ({
      s: Math.max(0, c.minutesOfDay - input.bufferMin),
      e: Math.min(1440, c.minutesOfDay + input.bufferMin),
      causes: [`${c.satellite_name} @ ${formatMinutes(c.minutesOfDay)} (${c.distanceKm} km)`],
    }))
    .sort((a, b) => a.s - b.s);

  const merged: Iv[] = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (last && iv.s <= last.e) {
      last.e = Math.max(last.e, iv.e);
      last.causes.push(...iv.causes);
    } else merged.push({ ...iv });
  }

  const windows: Window[] = [];
  let cursor = 0;
  for (const iv of merged) {
    if (iv.s > cursor) windows.push({ startMin: cursor, endMin: iv.s, blocked: false, causes: [] });
    windows.push({ startMin: iv.s, endMin: iv.e, blocked: true, causes: iv.causes });
    cursor = iv.e;
  }
  if (cursor < 1440) windows.push({ startMin: cursor, endMin: 1440, blocked: false, causes: [] });

  const clear = windows.filter((w) => !w.blocked && w.endMin - w.startMin >= 15);
  const daytime = clear.filter((w) => w.endMin > input.earliestHour * 60 + 15);
  const pool = (daytime.length ? daytime : clear).map((w) => ({
    ...w,
    startMin: Math.max(w.startMin, Math.min(input.earliestHour * 60, w.endMin - 15)),
  }));
  const recommended =
    pool.sort((a, b) => b.endMin - b.startMin - (a.endMin - a.startMin))[0] ?? null;

  const reasons: PlanResult["reasons"] = conflicts.map((c) => ({
    kind: "blocked" as const,
    text: `${c.satellite_name} crosses within ${c.distanceKm} km of your coordinates at ${formatMinutes(
      c.minutesOfDay,
    )} — ±${input.bufferMin} min around it is blocked.`,
  }));
  if (recommended) {
    reasons.push({
      kind: "clear",
      text: `No satellite traffic detected between ${formatMinutes(recommended.startMin)} and ${formatMinutes(
        Math.min(recommended.endMin, recommended.startMin + 45),
      )} — safe to launch.`,
    });
  }

  return { considered, conflicts, windows, recommended, reasons };
}

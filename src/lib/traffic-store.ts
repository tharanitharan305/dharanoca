import { useSyncExternalStore } from "react";
import { generateSeedData, type SatellitePass } from "./orbit";

const KEY = "orbitclear.traffic.v2";

let data: SatellitePass[] = [];
let seeded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function load() {
  if (seeded) return;
  seeded = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      data = JSON.parse(raw) as SatellitePass[];
      return;
    }
  } catch {
    /* ignore */
  }
  data = generateSeedData();
  persist();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function setTraffic(rows: SatellitePass[]) {
  data = rows;
  persist();
  emit();
}

export function appendTraffic(rows: SatellitePass[]) {
  setTraffic([...data, ...rows].sort((a, b) => a.pass_datetime.localeCompare(b.pass_datetime)));
}

export function resetToSeed() {
  setTraffic(generateSeedData());
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const empty: SatellitePass[] = [];

export function useTraffic(): SatellitePass[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return data;
    },
    () => empty,
  );
}

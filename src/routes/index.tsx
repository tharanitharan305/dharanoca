import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Rocket, Radar, ShieldCheck, TriangleAlert, Gauge, MapPin, Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TimelineScrubber } from "@/components/orbit/TimelineScrubber";
import { useTraffic } from "@/lib/traffic-store";
import { formatMinutes, planLaunch, toLocalIso, type PlanResult } from "@/lib/orbit";
import { buildTracks, statesAt } from "@/lib/positions";

const Globe = lazy(() => import("@/components/orbit/Globe"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Launch Planner — OrbitClear" },
      {
        name: "description",
        content:
          "Pick your launch site on an interactive 3D globe, scrub through the day and get a recommended collision-free satellite launch window.",
      },
      { property: "og:title", content: "Launch Planner — OrbitClear" },
      {
        property: "og:description",
        content:
          "Interactive globe, live satellite positions and a recommended safe launch window for any site and date.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LaunchPlanner,
});

const PRESETS = [
  { label: "Satish Dhawan SC, Sriharikota", lat: 13.72, lon: 80.23 },
  { label: "Kennedy Space Center, USA", lat: 28.57, lon: -80.65 },
  { label: "Baikonur Cosmodrome", lat: 45.96, lon: 63.31 },
];

function LaunchPlanner() {
  const traffic = useTraffic();
  const today = toLocalIso(new Date()).slice(0, 10);

  const [siteName, setSiteName] = useState("Satish Dhawan Space Centre");
  const [site, setSite] = useState<{ latitude: number; longitude: number } | null>({
    latitude: 13.72,
    longitude: 80.23,
  });
  const [date, setDate] = useState(today);
  const [minute, setMinute] = useState(9 * 60);
  const [radiusKm, setRadiusKm] = useState(500);
  const [bufferMin, setBufferMin] = useState(15);
  const [earliestHour, setEarliestHour] = useState(8);
  const [scanning, setScanning] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [launchMin, setLaunchMin] = useState<number | null>(null);
  const [launching, setLaunching] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const tracks = useMemo(() => buildTracks(traffic, date), [traffic, date]);
  const sats = useMemo(() => statesAt(tracks, minute, site, radiusKm), [tracks, minute, site, radiusKm]);

  const live = useMemo(
    () => ({
      conflict: sats.filter((s) => s.status === "conflict").length,
      caution: sats.filter((s) => s.status === "caution").length,
      visible: sats.filter((s) => s.status !== "inactive").length,
    }),
    [sats],
  );

  // play the day back over ~13 seconds
  const rafRef = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      setMinute((m) => (m + (dt / 13000) * 1440) % 1440);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  function tweenTo(target: number) {
    setPlaying(false);
    const start = minute;
    const t0 = performance.now();
    const dur = 900;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - k) ** 3;
      setMinute(start + (target - start) * e);
      if (k < 1) requestAnimationFrame(step);
      else {
        setMinute(target);
        setLaunching(true);
        window.setTimeout(() => setLaunching(false), 2200);
      }
    };
    requestAnimationFrame(step);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!site) return setError("Click the globe to choose a launch site first.");
    if (!date) return setError("Pick a launch date.");
    setError(null);
    setScanning(true);
    setResult(null);
    setLaunchMin(null);
    setPlaying(false);
    window.setTimeout(() => {
      const r = planLaunch(traffic, {
        latitude: site.latitude,
        longitude: site.longitude,
        date,
        radiusKm,
        bufferMin,
        earliestHour,
      });
      setResult(r);
      setScanning(false);
      setFocusKey((k) => k + 1);
      if (r.recommended) {
        setLaunchMin(r.recommended.startMin);
        tweenTo(r.recommended.startMin);
      }
    }, 900);
  }

  const prettyDate = date
    ? new Date(`${date}T00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const conflictRows = result
    ? [...result.considered].sort((a, b) => Number(b.conflict) - Number(a.conflict) || a.minutesOfDay - b.minutesOfDay)
    : [];
  const morningConflicts = result?.conflicts.filter((c) => c.minutesOfDay < 12 * 60).length ?? 0;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Badge variant="outline" className="border-primary/40 text-primary">
          Simulated / demo data · {traffic.length} passes loaded
        </Badge>
        <h1 className="glow-text text-3xl font-semibold tracking-tight sm:text-4xl">
          Plan a collision-free launch window
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Click the globe to drop your launch site, scrub the timeline to watch satellite traffic move,
          then run the scan for a recommended safe lift-off time.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* ---------------- globe + timeline ---------------- */}
        <div className="space-y-6">
          <div className="panel space-y-4 p-4 sm:p-5">
            <Suspense
              fallback={
                <div className="flex h-[clamp(320px,52vh,560px)] items-center justify-center rounded-lg border border-border bg-[#04070f] text-sm text-muted-foreground">
                  Loading globe…
                </div>
              }
            >
              <Globe
                focusKey={focusKey}
                satellites={sats}
                site={site}
                radiusKm={radiusKm}
                onPick={(lat, lon) => {
                  setSite({ latitude: lat, longitude: lon });
                  setSiteName((n) => (PRESETS.some((p) => p.label === n) || !n ? "Custom site" : n));
                }}
                launching={launching}
                pulseConflicts={launching || live.conflict > 0}
              />
            </Suspense>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1.5">
                <Label>Latitude</Label>
                <Input readOnly value={site ? site.latitude.toFixed(2) : "—"} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Longitude</Label>
                <Input readOnly value={site ? site.longitude.toFixed(2) : "—"} className="font-mono" />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={() => setSite(null)} className="w-full sm:w-auto">
                  <Eraser className="size-4" /> Clear selection
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setSiteName(p.label);
                    setSite({ latitude: p.lat, longitude: p.lon });
                    setFocusKey((k) => k + 1);
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {p.label.split(",")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="panel space-y-4 p-4 sm:p-5">
            <TimelineScrubber
              minute={Math.round(minute)}
              onMinute={(m) => {
                setPlaying(false);
                setMinute(m);
              }}
              windows={result?.windows ?? []}
              recommended={result?.recommended ?? null}
              launchMin={launchMin}
              playing={playing}
              onTogglePlay={() => setPlaying((p) => !p)}
              dateLabel={prettyDate}
            />
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="In conflict now" value={live.conflict} tone="text-blocked" />
              <Stat label="Caution (1 hr)" value={live.caution} tone="text-[#ffd24a]" />
              <Stat label="Tracked in view" value={live.visible} tone="text-primary" />
            </div>
          </div>
        </div>

        {/* ---------------- form + results ---------------- */}
        <div className="space-y-6">
          <form onSubmit={submit} className="panel space-y-5 p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Radar className="size-4 text-primary" /> Launch parameters
            </div>

            <div className="space-y-2">
              <Label htmlFor="site">Launch site name</Label>
              <Input id="site" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Preferred launch date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
                <Gauge className="size-3.5" /> Advanced settings
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label>Conflict radius: {radiusKm} km</Label>
                  <Slider min={100} max={2000} step={50} value={[radiusKm]} onValueChange={(v) => setRadiusKm(v[0] ?? 500)} />
                </div>
                <div className="space-y-2">
                  <Label>Conflict window: ±{bufferMin} min</Label>
                  <Slider min={5} max={60} step={5} value={[bufferMin]} onValueChange={(v) => setBufferMin(v[0] ?? 15)} />
                </div>
                <div className="space-y-2">
                  <Label>Earliest acceptable hour: {String(earliestHour).padStart(2, "0")}:00</Label>
                  <Slider min={0} max={20} step={1} value={[earliestHour]} onValueChange={(v) => setEarliestHour(v[0] ?? 8)} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={scanning}>
              <Rocket className="size-4" />
              {scanning ? "Scanning orbital traffic..." : "Find safe launch window"}
            </Button>
          </form>

          {scanning && (
            <div className="panel space-y-4 p-6">
              <p className="font-mono text-sm text-primary">Scanning orbital traffic...</p>
              <div className="scan-sweep h-1.5 rounded-full bg-primary/15" />
              <p className="text-xs text-muted-foreground">
                Comparing {traffic.length} predicted passes against your ground coordinates.
              </p>
            </div>
          )}

          {!scanning && !result && (
            <div className="panel flex min-h-40 flex-col items-center justify-center gap-2 p-8 text-center">
              <Radar className="size-8 text-primary/60" />
              <p className="text-sm text-muted-foreground">
                Pick a site on the globe and run the scan to see the recommended window.
              </p>
            </div>
          )}

          {!scanning && result && (
            <div className="panel animate-fade-in space-y-5 p-5 sm:p-6">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                  <MapPin className="size-3.5 text-primary" /> Launch site
                </p>
                <p className="text-sm">
                  {siteName || "Custom site"} — <span className="font-mono">{site?.latitude.toFixed(2)}°, {site?.longitude.toFixed(2)}°</span>
                </p>
              </div>

              {result.recommended ? (
                <div className="space-y-2 rounded-lg border border-clear/40 bg-clear/5 p-4">
                  <div className="flex items-center gap-2 text-clear">
                    <ShieldCheck className="size-5" />
                    <span className="text-xs font-medium tracking-wide uppercase">
                      Recommended launch window
                    </span>
                  </div>
                  <p className="font-display text-xl font-semibold sm:text-2xl">
                    {formatMinutes(result.recommended.startMin)} –{" "}
                    {formatMinutes(Math.min(result.recommended.endMin, result.recommended.startMin + 45))}
                    <span className="text-muted-foreground"> on {prettyDate}</span>
                  </p>
                  <p className="text-sm text-clear/90">
                    🎯 No satellites within {radiusKm} km during this window.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-destructive">
                  <TriangleAlert className="size-5" />
                  <p className="text-sm">
                    No clear window found on this date. Try a smaller radius, shorter buffer, or another date.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="text-xs font-medium tracking-wide uppercase">📋 Conflict report</h2>
                <div className="max-h-72 space-y-1.5 overflow-auto pr-1">
                  {conflictRows.map((c, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                        c.conflict ? "border-blocked/40 bg-blocked/5" : "border-border"
                      }`}
                    >
                      <span className="truncate">
                        {c.conflict ? "🔴" : "🟢"} <span className="font-medium">{c.satellite_name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {formatMinutes(c.minutesOfDay)} · {c.distanceKm.toLocaleString()} km ·{" "}
                        <span className={c.conflict ? "text-blocked" : "text-clear"}>
                          {c.conflict ? "CONFLICT" : "CLEAR"}
                        </span>
                      </span>
                    </div>
                  ))}
                  {conflictRows.length === 0 && (
                    <p className="text-sm text-muted-foreground">No passes recorded for this date.</p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {result.conflicts.length} satellite{result.conflicts.length === 1 ? "" : "s"} conflict on
                  this date{morningConflicts ? ` (${morningConflicts} in the morning window)` : ""}.
                  {result.recommended
                    ? ` Clear to launch at ${formatMinutes(result.recommended.startMin)}.`
                    : ""}
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-xs font-medium tracking-wide uppercase">Why times were rejected</h2>
                <ul className="space-y-2 text-sm">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span>{r.kind === "clear" ? "✅" : "🛰️"}</span>
                      <span className={r.kind === "clear" ? "text-clear" : "text-muted-foreground"}>{r.text}</span>
                    </li>
                  ))}
                  {result.reasons.length === 0 && (
                    <li className="text-muted-foreground">
                      ✅ No satellite traffic within {radiusKm} km on this date — the whole day is clear.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2.5">
      <p className={`font-display text-xl font-semibold ${tone}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

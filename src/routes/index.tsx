import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Rocket, Radar, ShieldCheck, TriangleAlert, Gauge } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DayTimeline } from "@/components/orbit/Timeline";
import { useTraffic } from "@/lib/traffic-store";
import { formatMinutes, planLaunch, toLocalIso, type PlanResult } from "@/lib/orbit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Launch Planner — OrbitClear" },
      {
        name: "description",
        content:
          "Enter your launch site coordinates and date to get a recommended collision-free launch window based on nearby satellite passes.",
      },
      { property: "og:title", content: "Launch Planner — OrbitClear" },
      {
        property: "og:description",
        content: "Find a safe, traffic-free satellite launch window for any site and date.",
      },
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
  const [lat, setLat] = useState("13.72");
  const [lon, setLon] = useState("80.23");
  const [date, setDate] = useState(today);
  const [radiusKm, setRadiusKm] = useState(500);
  const [bufferMin, setBufferMin] = useState(15);
  const [earliestHour, setEarliestHour] = useState(8);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const la = Number(lat);
    const lo = Number(lon);
    if (!Number.isFinite(la) || la < -90 || la > 90) return setError("Latitude must be between -90 and 90.");
    if (!Number.isFinite(lo) || lo < -180 || lo > 180)
      return setError("Longitude must be between -180 and 180.");
    if (!date) return setError("Pick a launch date.");
    setError(null);
    setScanning(true);
    setResult(null);
    window.setTimeout(() => {
      setResult(planLaunch(traffic, { latitude: la, longitude: lo, date, radiusKm, bufferMin, earliestHour }));
      setScanning(false);
    }, 900);
  }

  const prettyDate = date
    ? new Date(`${date}T00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Badge variant="outline" className="border-primary/40 text-primary">
          Simulated / demo data · {traffic.length} passes loaded
        </Badge>
        <h1 className="glow-text text-3xl font-semibold tracking-tight sm:text-4xl">
          Plan a collision-free launch window
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          OrbitClear scans predicted satellite passes near your ground station and recommends the
          safest time to lift off — with a plain-language reason for every rejected slot.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={submit} className="panel h-fit space-y-5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Radar className="size-4 text-primary" /> Launch parameters
          </div>

          <div className="space-y-2">
            <Label htmlFor="site">Launch site label</Label>
            <Input id="site" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lon">Longitude</Label>
              <Input id="lon" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Preferred launch date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setSiteName(p.label);
                  setLat(String(p.lat));
                  setLon(String(p.lon));
                }}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                {p.label.split(",")[0]}
              </button>
            ))}
          </div>

          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
              <Gauge className="size-3.5" /> Advanced settings
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label>Proximity radius: {radiusKm} km</Label>
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

        <div className="space-y-6">
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
            <div className="panel flex h-full min-h-64 flex-col items-center justify-center gap-2 p-8 text-center">
              <Radar className="size-8 text-primary/60" />
              <p className="text-sm text-muted-foreground">
                Enter your launch site and date, then run the scan to see the recommended window.
              </p>
            </div>
          )}

          {!scanning && result && (
            <>
              <div className="panel space-y-4 p-6">
                {result.recommended ? (
                  <>
                    <div className="flex items-center gap-2 text-clear">
                      <ShieldCheck className="size-5" />
                      <span className="text-sm font-medium tracking-wide uppercase">
                        Recommended launch window
                      </span>
                    </div>
                    <p className="font-display text-2xl font-semibold sm:text-3xl">
                      {formatMinutes(result.recommended.startMin)} –{" "}
                      {formatMinutes(Math.min(result.recommended.endMin, result.recommended.startMin + 45))}
                      <span className="text-muted-foreground"> on {prettyDate}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {siteName || "Launch site"} · {lat}°, {lon}° — clear of all satellite passes
                      within {radiusKm} km for a ±{bufferMin} min buffer.
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <TriangleAlert className="size-5" />
                    <p className="text-sm">
                      No clear window found on this date with the current settings. Try a wider
                      buffer setting or a different date.
                    </p>
                  </div>
                )}
              </div>

              <div className="panel space-y-4 p-6">
                <h2 className="text-sm font-medium tracking-wide uppercase">Day timeline</h2>
                <DayTimeline windows={result.windows} />
              </div>

              <div className="panel space-y-3 p-6">
                <h2 className="text-sm font-medium tracking-wide uppercase">Why times were rejected</h2>
                {result.reasons.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    ✅ No satellite traffic at all within {radiusKm} km on this date — the whole day
                    is clear.
                  </p>
                )}
                <ul className="space-y-2 text-sm">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span>{r.kind === "clear" ? "✅" : "🛰️"}</span>
                      <span className={r.kind === "clear" ? "text-clear" : "text-muted-foreground"}>
                        {r.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel space-y-3 p-6">
                <h2 className="text-sm font-medium tracking-wide uppercase">
                  All passes considered for {prettyDate} ({result.considered.length})
                </h2>
                <div className="max-h-80 overflow-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Satellite</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Distance</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.considered.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.satellite_name}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatMinutes(c.minutesOfDay)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {c.distanceKm.toLocaleString()} km
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={
                                c.conflict
                                  ? "border-blocked/50 text-blocked"
                                  : "border-clear/50 text-clear"
                              }
                            >
                              {c.conflict ? "Blocked" : "Clear"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {result.considered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                            No passes recorded for this date.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, RefreshCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { appendTraffic, resetToSeed, setTraffic, useTraffic } from "@/lib/traffic-store";
import { toLocalIso, type SatellitePass } from "@/lib/orbit";

export const Route = createFileRoute("/traffic")({
  head: () => ({
    meta: [
      { title: "Traffic Data — OrbitClear" },
      {
        name: "description",
        content:
          "View the satellite pass dataset used by OrbitClear, upload your own .xlsx traffic file, or download the sample template.",
      },
      { property: "og:title", content: "Traffic Data — OrbitClear" },
      {
        property: "og:description",
        content: "Upload or inspect the satellite pass dataset powering the launch window advisor.",
      },
    ],
  }),
  component: TrafficPage,
});

type ParsedRow = { row: number; pass?: SatellitePass; error?: string };

function pick(obj: Record<string, unknown>, keys: string[]) {
  const map = new Map(Object.keys(obj).map((k) => [k.toLowerCase().replace(/[\s_]+/g, ""), k]));
  for (const key of keys) {
    const found = map.get(key.toLowerCase().replace(/[\s_]+/g, ""));
    if (found !== undefined && obj[found] !== "" && obj[found] != null) return obj[found];
  }
  return undefined;
}

function excelToDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S));
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseRows(raw: Record<string, unknown>[]): ParsedRow[] {
  return raw.map((r, i) => {
    const name = pick(r, ["satellitename", "satellite", "name"]);
    const lat = Number(pick(r, ["latitude", "lat"]));
    const lon = Number(pick(r, ["longitude", "lon", "long", "lng"]));
    const combined = pick(r, ["datetime", "passdatetime", "timestamp"]);
    const dateVal = pick(r, ["date"]);
    const timeVal = pick(r, ["time"]);
    const alt = Number(pick(r, ["altitudekm", "altitude"]));

    if (!name) return { row: i + 2, error: "Missing satellite name" };
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { row: i + 2, error: "Invalid latitude" };
    if (!Number.isFinite(lon) || lon < -180 || lon > 180)
      return { row: i + 2, error: "Invalid longitude" };

    let dt: Date | null = null;
    if (combined != null) dt = excelToDate(combined);
    else if (dateVal != null) {
      const d = excelToDate(dateVal);
      const t = timeVal != null ? excelToDate(timeVal) : null;
      if (d) {
        dt = new Date(d);
        if (t) dt.setHours(t.getHours(), t.getMinutes(), 0, 0);
        else if (typeof timeVal === "string") {
          const m = /^(\d{1,2}):(\d{2})/.exec(timeVal.trim());
          if (m) dt.setHours(Number(m[1]), Number(m[2]), 0, 0);
        }
      }
    }
    if (!dt || Number.isNaN(dt.getTime())) return { row: i + 2, error: "Invalid or missing date/time" };

    return {
      row: i + 2,
      pass: {
        id: `up-${Date.now()}-${i}`,
        satellite_name: String(name),
        latitude: lat,
        longitude: lon,
        pass_datetime: toLocalIso(dt),
        ...(Number.isFinite(alt) ? { altitude_km: alt } : {}),
        source: "upload",
      },
    };
  });
}

function TrafficPage() {
  const traffic = useTraffic();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [query, setQuery] = useState("");

  const valid = parsed?.filter((p) => p.pass).map((p) => p.pass!) ?? [];
  const errors = parsed?.filter((p) => p.error) ?? [];

  async function onFile(file: File) {
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const sheetName = wb.SheetNames[0];
      const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
      if (!sheet) throw new Error("No sheet found");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      setFileName(file.name);
      setParsed(parseRows(rows));
    } catch {
      toast.error("Could not read that file. Please upload a valid .xlsx spreadsheet.");
    }
  }

  function commit(mode: "append" | "replace") {
    if (!valid.length) return;
    if (mode === "append") appendTraffic(valid);
    else setTraffic([...valid].sort((a, b) => a.pass_datetime.localeCompare(b.pass_datetime)));
    toast.success(
      `${valid.length} passes ${mode === "append" ? "appended" : "loaded"} — launch calculator updated.`,
    );
    setParsed(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Satellite Name": "ISS (ZARYA)",
        Latitude: 13.42,
        Longitude: 80.91,
        Date: "2026-08-24",
        Time: "09:02",
        "Altitude km": 420,
      },
      {
        "Satellite Name": "NOAA-19",
        Latitude: 12.88,
        Longitude: 79.75,
        Date: "2026-08-24",
        Time: "09:40",
        "Altitude km": 870,
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Traffic");
    XLSX.writeFile(wb, "orbitclear-traffic-template.xlsx");
  }

  const filtered = query
    ? traffic.filter((t) => t.satellite_name.toLowerCase().includes(query.toLowerCase()))
    : traffic;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Badge variant="outline" className="border-primary/40 text-primary">
          Simulated / demo data
        </Badge>
        <h1 className="glow-text text-3xl font-semibold tracking-tight">Satellite traffic data</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The advisor compares your launch site against this dataset of predicted overhead passes.
          Upload a spreadsheet to use your own numbers — changes apply to the planner immediately.
        </p>
      </section>

      <div className="panel space-y-4 p-6">
        <div className="flex flex-wrap gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Upload traffic data (.xlsx)
          </Button>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" /> Download sample template
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              resetToSeed();
              toast.success("Reset to the simulated demo dataset.");
            }}
          >
            <RefreshCcw className="size-4" /> Reset demo data
          </Button>
        </div>

        {parsed && (
          <div className="space-y-4 rounded-md border border-border p-4">
            <p className="text-sm">
              <span className="font-medium">{fileName}</span> — {valid.length} valid rows,{" "}
              <span className={errors.length ? "text-destructive" : ""}>{errors.length} errors</span>
            </p>

            {errors.length > 0 && (
              <ul className="max-h-32 space-y-1 overflow-auto font-mono text-xs text-destructive">
                {errors.map((e) => (
                  <li key={e.row}>Row {e.row}: {e.error}</li>
                ))}
              </ul>
            )}

            {valid.length > 0 && (
              <div className="max-h-64 overflow-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Satellite</TableHead>
                      <TableHead>Latitude</TableHead>
                      <TableHead>Longitude</TableHead>
                      <TableHead>Pass time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valid.slice(0, 25).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.satellite_name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.latitude}</TableCell>
                        <TableCell className="font-mono text-xs">{p.longitude}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.pass_datetime.replace("T", " ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => commit("append")} disabled={!valid.length}>
                Append to existing data
              </Button>
              <Button variant="outline" onClick={() => commit("replace")} disabled={!valid.length}>
                Replace all data
              </Button>
              <Button variant="ghost" onClick={() => setParsed(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium tracking-wide uppercase">
            Dataset ({traffic.length} passes)
          </h2>
          <Input
            placeholder="Filter by satellite name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="max-h-[32rem] overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Satellite</TableHead>
                <TableHead>Pass date & time</TableHead>
                <TableHead className="text-right">Lat</TableHead>
                <TableHead className="text-right">Lon</TableHead>
                <TableHead className="text-right">Alt (km)</TableHead>
                <TableHead className="text-right">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.satellite_name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {p.pass_datetime.replace("T", " ")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{p.latitude}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{p.longitude}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {p.altitude_km ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {p.source ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

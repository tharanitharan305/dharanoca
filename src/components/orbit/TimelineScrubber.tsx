import { Pause, Play, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatMinutes, type Window } from "@/lib/orbit";

export function TimelineScrubber({
  minute,
  onMinute,
  windows,
  recommended,
  launchMin,
  playing,
  onTogglePlay,
  dateLabel,
}: {
  minute: number;
  onMinute: (m: number) => void;
  windows: Window[];
  recommended: Window | null;
  launchMin: number | null;
  playing: boolean;
  onTogglePlay: () => void;
  dateLabel: string;
}) {
  const pct = (m: number) => (m / 1440) * 100;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {formatMinutes(minute)}
          <span className="text-muted-foreground text-base font-normal"> on {dateLabel}</span>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onTogglePlay}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? "Pause" : "Play day"}
        </Button>
      </div>

      <div className="relative pt-6">
        <div className="relative h-9 w-full overflow-hidden rounded-md border border-border bg-muted/30 shadow-inner">
          {windows.map((w, i) => (
            <div
              key={i}
              className={w.blocked ? "absolute inset-y-0 bg-blocked/70" : "absolute inset-y-0 bg-clear/25"}
              style={{ left: `${pct(w.startMin)}%`, width: `${pct(w.endMin - w.startMin)}%` }}
            />
          ))}
          {recommended && (
            <div
              className="absolute inset-y-1 rounded-sm border border-clear/70 bg-clear/70 shadow-[0_0_18px_rgba(52,211,153,0.55)]"
              style={{
                left: `${pct(recommended.startMin)}%`,
                width: `${pct(Math.min(recommended.endMin, recommended.startMin + 45) - recommended.startMin)}%`,
              }}
            />
          )}
          {launchMin != null && (
            <div className="absolute inset-y-0 w-0.5 bg-blocked" style={{ left: `${pct(launchMin)}%` }} />
          )}
          <div
            className="absolute inset-y-0 w-px bg-primary shadow-[0_0_10px_var(--primary)]"
            style={{ left: `${pct(minute)}%` }}
          />
        </div>

        {launchMin != null && (
          <div
            className="absolute top-0 flex -translate-x-1/2 items-center gap-1 rounded-full border border-blocked/50 bg-background/90 px-2 py-0.5 text-[10px] tracking-wide whitespace-nowrap text-blocked uppercase"
            style={{ left: `${Math.min(92, Math.max(8, pct(launchMin)))}%` }}
          >
            <Rocket className="size-3" /> Recommended launch time
          </div>
        )}

        <Slider
          className="mt-3"
          min={0}
          max={1439}
          step={1}
          value={[minute]}
          onValueChange={(v) => onMinute(v[0] ?? 0)}
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
          {["00:00", "06:00", "12:00", "18:00", "23:59"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Legend color="bg-[#ff4d4d]" label="Conflict (inside radius now)" />
        <Legend color="bg-[#ffd24a]" label="Caution (within 1 hour)" />
        <Legend color="bg-[#4ade80]" label="Clear" />
        <Legend color="bg-[#64748b]" label="Not in window" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-full ${color}`} /> {label}
    </span>
  );
}

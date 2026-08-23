import { formatMinutes, type Window } from "@/lib/orbit";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function DayTimeline({ windows }: { windows: Window[] }) {
  return (
    <div className="space-y-2">
      <div className="flex h-10 w-full overflow-hidden rounded-md border border-border">
        {windows.map((w, i) => {
          const pct = ((w.endMin - w.startMin) / 1440) * 100;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  style={{ width: `${pct}%` }}
                  className={
                    w.blocked
                      ? "h-full bg-blocked/80 transition-opacity hover:opacity-80"
                      : "h-full bg-clear/70 transition-opacity hover:opacity-80"
                  }
                />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-mono text-xs">
                  {formatMinutes(w.startMin)} – {formatMinutes(Math.min(w.endMin, 1439))}
                </p>
                <p className="text-xs">
                  {w.blocked ? w.causes.join(" · ") : "Clear — no traffic in range"}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        {["00:00", "06:00", "12:00", "18:00", "24:00"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-clear/70" /> Clear
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blocked/80" /> Blocked
        </span>
      </div>
    </div>
  );
}

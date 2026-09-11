import { money } from "@/lib/format";

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaChart({
  data,
  accent,
  currency,
}: {
  data: { label: string; date: string; value: number }[];
  accent: string;
  currency: string;
}) {
  const W = 720;
  const H = 200;
  const PAD = { top: 16, right: 8, bottom: 4, left: 8 };
  const max = Math.max(...data.map((d) => d.value), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const points = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * innerW,
    y: PAD.top + innerH - (d.value / max) * innerH,
    ...d,
  }));

  const line = smoothPath(points);
  const area = `${line} L ${points[points.length - 1].x} ${PAD.top + innerH} L ${points[0].x} ${PAD.top + innerH} Z`;
  const best = points.reduce((a, b) => (b.value > a.value ? b : a), points[0]);
  const labelEvery = Math.ceil(data.length / 7);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + innerH * (1 - f)}
            y2={PAD.top + innerH * (1 - f)}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeDasharray="3 6"
          />
        ))}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + innerH}
          y2={PAD.top + innerH}
          stroke="currentColor"
          strokeOpacity="0.15"
        />
        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={best.x} cy={best.y} r="9" fill={accent} fillOpacity="0.15" />
        <circle cx={best.x} cy={best.y} r="3.5" fill={accent} stroke="#fff" strokeWidth="1.5" />
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] font-semibold uppercase tracking-wide text-ink/35">
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <span key={i}>{d.date}</span>
          ) : (
            <span key={i} className="opacity-0">·</span>
          ),
        )}
      </div>
      <p className="mt-2 text-right text-xs font-medium text-ink/45">
        Best day: <span className="font-semibold text-ink">{best.date}</span> · {money(best.value, currency)}
      </p>
    </div>
  );
}

export function TopItems({
  items,
  accent,
  currency,
}: {
  items: { name: string; qty: number; revenue: number }[];
  accent: string;
  currency: string;
}) {
  const max = Math.max(...items.map((i) => i.qty), 1);
  if (items.length === 0)
    return <p className="py-8 text-center text-sm text-ink/40">No sales recorded yet.</p>;
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.name} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <span className="w-4 shrink-0 font-display text-[11px] font-bold text-ink/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate">{item.name}</span>
            </p>
            <p className="shrink-0 text-[13px] font-semibold tabular-nums">
              {item.qty} sold
              <span className="ml-2 font-normal text-ink/40">{money(item.revenue, currency)}</span>
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(3, (item.qty / max) * 100)}%`,
                background: `linear-gradient(90deg, ${accent}cc, ${accent})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Donut({
  slices,
  size = 120,
}: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const R = 40;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
      <circle cx="50" cy="50" r={R} fill="none" strokeWidth="14" stroke="currentColor" strokeOpacity="0.07" />
      {slices.map((s) => {
        const frac = s.value / total;
        const el = (
          <circle
            key={s.label}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth="14"
            stroke={s.color}
            strokeDasharray={`${frac * C} ${C}`}
            strokeDashoffset={-offset * C}
            strokeLinecap="butt"
          />
        );
        offset += frac;
        return el;
      })}
    </svg>
  );
}

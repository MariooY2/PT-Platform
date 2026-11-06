import { parseISO } from 'date-fns';
import type { SeriesPoint } from '../lib';

/**
 * A minimal inline-SVG line chart — no chart library. `line` is the highlighted series (chart-1 with
 * dots and a direct label on the latest value); `dots` is an optional faint context series (the daily
 * body-weight points under the 7-day average). Both share one domain so they line up. Colours come from
 * token classes only; nothing animates, so it is reduced-motion-safe by construction. The `summary`
 * sentence is the accessible name and is also shown in text (charts are never the only way to read a value).
 */
export function LineChart({
  line,
  dots = [],
  summary,
  formatValue,
  height = 128,
}: {
  line: SeriesPoint[];
  dots?: SeriesPoint[];
  summary: string;
  formatValue: (v: number) => string;
  height?: number;
}) {
  const width = 320;
  const pad = 12;
  const all = [...line, ...dots];
  if (all.length === 0 || line.length === 0) return null;

  const times = all.map((p) => parseISO(p.date).getTime());
  const values = all.map((p) => p.value);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanT = maxT - minT || 1;
  const spanV = maxV - minV || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const single = all.length === 1;

  const project = (p: SeriesPoint) => {
    const x =
      single || spanT === 0
        ? width / 2
        : pad + ((parseISO(p.date).getTime() - minT) / spanT) * innerW;
    const t = (p.value - minV) / spanV;
    const y = pad + innerH * (1 - (0.05 + t * 0.9));
    return { x, y };
  };

  const linePts = line.map(project);
  const dotPts = dots.map(project);
  const path = linePts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const last = linePts[linePts.length - 1];
  const lastValue = line[line.length - 1].value;
  const labelAnchor = last.x > width - 56 ? 'end' : 'middle';

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={summary}
        className="overflow-visible"
      >
        {dotPts.map((p, i) => (
          <circle key={`d-${i}`} cx={p.x} cy={p.y} r={2} className="fill-muted-foreground/40" />
        ))}
        {linePts.length > 1 && (
          <path
            d={path}
            fill="none"
            strokeWidth={2}
            className="stroke-chart-1"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {linePts.map((p, i) => (
          <circle
            key={`l-${i}`}
            cx={p.x}
            cy={p.y}
            r={i === linePts.length - 1 ? 3.5 : 2.5}
            className="fill-chart-1"
          />
        ))}
        <text
          x={labelAnchor === 'end' ? last.x : last.x}
          y={Math.max(pad, last.y - 8)}
          textAnchor={labelAnchor}
          className="fill-foreground text-xs num"
        >
          {formatValue(lastValue)}
        </text>
      </svg>
      <figcaption className="text-xs text-muted-foreground">{summary}</figcaption>
    </figure>
  );
}

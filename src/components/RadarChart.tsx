"use client";

import type { RadarAxisDatum } from "@/lib/types";

type Theme = "teal" | "neon" | "doodle" | "mono";

type RadarChartProps = {
  data?: RadarAxisDatum[];
  size?: number;
  theme?: Theme;
  showLabels?: boolean;
  animate?: boolean;
  label?: string;
};

const DEFAULT_DATA: RadarAxisDatum[] = [
  { axis: "Learning Agility", value: 75 },
  { axis: "Resilience & Adaptability", value: 68 },
  { axis: "Critical Thinking", value: 80 },
  { axis: "Decision Making under Pressure", value: 72 },
  { axis: "Risk Tolerance", value: 60 },
  { axis: "Collaboration Mindset", value: 85 },
];

/**
 * Custom SVG radar chart, ported 1:1 from the RadarChart.dc.html design
 * reference (angle/label math, mount-scale animation) rather than composed
 * from Recharts — its built-in axis-tick renderer can't reproduce the
 * per-axis label wrapping/anchor behavior below without an equivalent
 * amount of custom SVG anyway, and pixel-fidelity is the priority here.
 */
export function RadarChart({
  data = DEFAULT_DATA,
  size = 320,
  theme = "teal",
  showLabels = true,
  animate = true,
}: RadarChartProps) {
  const chartData = data.length ? data : DEFAULT_DATA;
  const n = chartData.length;

  const cx = size / 2;
  const cy = size / 2;
  const labelPad = showLabels ? Math.max(28, size * 0.18) : size * 0.06;
  const radius = size / 2 - labelPad;
  const angleFor = (i: number) => -Math.PI / 2 + i * ((2 * Math.PI) / n);
  const levels = [0.2, 0.4, 0.6, 0.8, 1];

  const gridPaths = levels.map((l) =>
    chartData
      .map((_, i) => {
        const a = angleFor(i);
        return `${cx + radius * l * Math.cos(a)},${cy + radius * l * Math.sin(a)}`;
      })
      .join(" ")
  );

  const spokes = chartData.map((_, i) => {
    const a = angleFor(i);
    return { x1: cx, y1: cy, x2: cx + radius * Math.cos(a), y2: cy + radius * Math.sin(a) };
  });

  const valuePts = chartData.map((d, i) => {
    const a = angleFor(i);
    const v = Math.max(0, Math.min(100, d.value)) / 100;
    return { x: cx + radius * v * Math.cos(a), y: cy + radius * v * Math.sin(a) };
  });
  const polygonPoints = valuePts.map((p) => `${p.x},${p.y}`).join(" ");

  const labels = chartData.map((d, i) => {
    const a = angleFor(i);
    const lx = cx + (radius + labelPad * 0.55) * Math.cos(a);
    const ly = cy + (radius + labelPad * 0.55) * Math.sin(a);
    let anchor: "start" | "middle" | "end" = "middle";
    let translateX = "-50%";
    if (Math.cos(a) > 0.35) {
      anchor = "start";
      translateX = "0%";
    } else if (Math.cos(a) < -0.35) {
      anchor = "end";
      translateX = "-100%";
    }
    return { x: lx, y: ly, anchor, translateX, labelText: d.axis, key: i };
  });

  const isNeon = theme === "neon";
  const isDoodle = theme === "doodle";
  const isMono = theme === "mono";
  const accent = isMono ? "#4D7CFF" : isDoodle ? "#FF6FA8" : isNeon ? "#D4FF3F" : "#2DD4BF";
  const accentSoft = isMono
    ? "rgba(77,124,255,0.14)"
    : isDoodle
      ? "rgba(255,111,168,0.22)"
      : isNeon
        ? "rgba(212,255,63,0.20)"
        : "rgba(45,212,191,0.18)";
  const gridStroke = isMono
    ? "rgba(15,15,15,0.12)"
    : isDoodle
      ? "rgba(22,19,14,0.18)"
      : isNeon
        ? "rgba(255,255,255,0.16)"
        : "rgba(255,255,255,0.10)";
  const labelColor = isMono ? "#0F0F0F" : isDoodle ? "#16130E" : isNeon ? "#F5F2FF" : "#CBE3E0";
  const labelSize = Math.max(9, Math.round(size / 28));
  const dotR = Math.max(2.5, size / 85);
  const labelMaxWidth = Math.max(68, Math.round(size * 0.28));
  const textAlignFor: Record<string, "left" | "center" | "right"> = {
    start: "left",
    middle: "center",
    end: "right",
  };

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible", display: "block" }}>
          {gridPaths.map((gp, i) => (
            <polygon key={i} points={gp} fill="none" stroke={gridStroke} strokeWidth={1} />
          ))}
          {spokes.map((sp, i) => (
            <line key={i} x1={sp.x1} y1={sp.y1} x2={sp.x2} y2={sp.y2} stroke={gridStroke} strokeWidth={1} />
          ))}
          <g
            className={animate === false ? undefined : "animate-radar-grow"}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <polygon points={polygonPoints} fill={accentSoft} stroke={accent} strokeWidth={3} />
            {valuePts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={dotR} fill={accent} />
            ))}
          </g>
        </svg>
        {showLabels &&
          labels.map((lb) => (
            <div
              key={lb.key}
              style={{
                position: "absolute",
                left: lb.x,
                top: lb.y,
                width: labelMaxWidth,
                transform: `translate(${lb.translateX}, -50%)`,
                fontSize: labelSize,
                fontWeight: 600,
                color: labelColor,
                fontFamily: "var(--font-plex-thai), var(--font-inter), sans-serif",
                whiteSpace: "normal",
                textAlign: textAlignFor[lb.anchor] || "center",
                pointerEvents: "none",
                lineHeight: 1.2,
              }}
            >
              {lb.labelText}
            </div>
          ))}
      </div>
    </div>
  );
}

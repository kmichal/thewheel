import React, { useCallback, useRef, useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LineStyle {
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string; // e.g. "4 2", "8 4 2 4", "" for solid
  opacity?: number;
}

export interface HorizontalLine {
  id: string;
  value: number;       // position on the y-axis
  label?: string;
  style?: LineStyle;
}

export interface HorizontalLineChartProps {
  /** Lines to display */
  lines: HorizontalLine[];
  /** Called when a line's value changes via drag */
  onLineChange?: (id: string, newValue: number) => void;
  /** Called when the visible y range changes via scroll */
  onRangeChange?: (yMin: number, yMax: number) => void;
  /** Y-axis minimum value (initial) */
  yMin?: number;
  /** Y-axis maximum value (initial) */
  yMax?: number;
  /** Minimum allowed span between yMin and yMax when zooming in */
  yMinSpan?: number;
  /** How much each scroll tick expands/contracts the range, as a fraction of current span (default 0.1) */
  zoomSensitivity?: number;
  /** Number of y-axis tick marks */
  yTickCount?: number;
  /** Chart width in px */
  width?: number;
  /** Chart height in px */
  height?: number;
  /** Optional title */
  title?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MARGIN = { top: 24, right: 64, bottom: 40, left: 56 };

const DEFAULT_LINE_STYLE: Required<LineStyle> = {
  color: "#3b82f6",
  strokeWidth: 2,
  strokeDasharray: "",
  opacity: 1,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lerp(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function niceTicks(min: number, max: number, count: number): number[] {
  const range = max - min;
  const step = range / (count - 1);
  return Array.from({ length: count }, (_, i) => +(min + i * step).toPrecision(6));
}

// ─── Component ────────────────────────────────────────────────────────────────

export const HorizontalLineChart: React.FC<HorizontalLineChartProps> = ({
  lines,
  onLineChange,
  onRangeChange,
  yMin: yMinProp = 0,
  yMax: yMaxProp = 100,
  yMinSpan = 1,
  zoomSensitivity = 0.1,
  yTickCount = 6,
  width = 600,
  height = 400,
  title,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Internal range state, seeded from props
  const [yMin, setYMin] = useState(yMinProp);
  const [yMax, setYMax] = useState(yMaxProp);

  // Sync internal state when prop range changes (new equity selected)
  useEffect(() => {
    setYMin(yMinProp);
    setYMax(yMaxProp);
  }, [yMinProp, yMaxProp]);

  // Inner drawing area dimensions
  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  // Map a data value → SVG y coordinate (inverted: higher value = lower y)
  const toSvgY = useCallback(
    (value: number) => lerp(value, yMin, yMax, innerHeight, 0),
    [yMin, yMax, innerHeight]
  );

  // Map an SVG y coordinate → data value
  const toDataValue = useCallback(
    (svgY: number) => lerp(svgY, 0, innerHeight, yMax, yMin),
    [yMin, yMax, innerHeight]
  );

  // ── Scroll to zoom ─────────────────────────────────────────────────────────
  // Must use a manual listener with { passive: false } — React's synthetic
  // onWheel is always passive in modern browsers, so preventDefault() inside it
  // is silently ignored and the page scrolls anyway.

  const yMinRef = useRef(yMin);
  const yMaxRef = useRef(yMax);
  yMinRef.current = yMin;
  yMaxRef.current = yMax;

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const curMin = yMinRef.current;
      const curMax = yMaxRef.current;
      const span = curMax - curMin;
      const delta = (e.deltaY > 0 ? -1 : 1) * span * zoomSensitivity;
      const newSpan = Math.max(yMinSpan, span + delta * 2);
      const mid = (curMin + curMax) / 2;
      const nextMin = +(mid - newSpan / 2).toPrecision(8);
      const nextMax = +(mid + newSpan / 2).toPrecision(8);
      setYMin(nextMin);
      setYMax(nextMax);
      onRangeChange?.(nextMin, nextMax);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [yMinSpan, zoomSensitivity, onRangeChange]);

  const ticks = niceTicks(yMin, yMax, yTickCount);

  // ── Drag handling ──────────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (!onLineChange) return;
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      setDraggingId(id);
    },
    [onLineChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId || !svgRef.current || !onLineChange) return;

      const rect = svgRef.current.getBoundingClientRect();
      const svgY = e.clientY - rect.top - MARGIN.top;
      const rawValue = toDataValue(svgY);
      const clampedValue = clamp(rawValue, yMin, yMax);

      onLineChange(draggingId, +clampedValue.toPrecision(6));
    },
    [draggingId, onLineChange, toDataValue, yMin, yMax]
  );

  const handlePointerUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "inline-block", userSelect: "none" }}>
      {title && (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 6,
            color: "#1e293b",
          }}
        >
          {title}
        </div>
      )}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: "block", cursor: draggingId ? "grabbing" : "default" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          {/* Subtle grid line pattern */}
          <pattern id="grid" width={innerWidth} height={innerHeight / (yTickCount - 1)} patternUnits="userSpaceOnUse">
            <line
              x1={0} y1={innerHeight / (yTickCount - 1)}
              x2={innerWidth} y2={innerHeight / (yTickCount - 1)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          </pattern>
        </defs>

        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>

          {/* ── Chart background ── */}
          <rect
            x={0} y={0}
            width={innerWidth} height={innerHeight}
            fill="#f8fafc"
            rx={4}
          />

          {/* ── Grid lines ── */}
          {ticks.map((tick) => (
            <line
              key={tick}
              x1={0} y1={toSvgY(tick)}
              x2={innerWidth} y2={toSvgY(tick)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          ))}

          {/* ── Y-axis ── */}
          <line x1={0} y1={0} x2={0} y2={innerHeight} stroke="#cbd5e1" strokeWidth={1.5} />

          {/* ── Y-axis ticks + labels ── */}
          {ticks.map((tick) => (
            <g key={tick} transform={`translate(0, ${toSvgY(tick)})`}>
              <line x1={-6} y1={0} x2={0} y2={0} stroke="#94a3b8" strokeWidth={1.5} />
              <text
                x={-10}
                y={0}
                dominantBaseline="middle"
                textAnchor="end"
                style={{
                  fontSize: 11,
                  fontFamily: "system-ui, sans-serif",
                  fill: "#64748b",
                }}
              >
                {tick % 1 === 0 ? tick : tick.toFixed(1)}
              </text>
            </g>
          ))}

          {/* ── Bottom axis ── */}
          <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#cbd5e1" strokeWidth={1.5} />

          {/* ── Horizontal lines ── */}
          {lines.map((line) => {
            const style = { ...DEFAULT_LINE_STYLE, ...line.style };
            const y = toSvgY(line.value);
            const isActive = draggingId === line.id || hoveredId === line.id;
            const isDraggable = !!onLineChange;

            return (
              <g key={line.id}>
                {/* Invisible wide hit-area for easier grabbing */}
                {isDraggable && (
                  <line
                    x1={0} y1={y}
                    x2={innerWidth} y2={y}
                    stroke="transparent"
                    strokeWidth={16}
                    style={{ cursor: "grab" }}
                    onPointerDown={(e) => handlePointerDown(e, line.id)}
                    onPointerEnter={() => setHoveredId(line.id)}
                    onPointerLeave={() => setHoveredId(null)}
                  />
                )}

                {/* Visible line */}
                <line
                  x1={0} y1={y}
                  x2={innerWidth} y2={y}
                  stroke={style.color}
                  strokeWidth={isActive ? style.strokeWidth + 1 : style.strokeWidth}
                  strokeDasharray={style.strokeDasharray || undefined}
                  opacity={style.opacity}
                  style={{ pointerEvents: "none", transition: "stroke-width 0.1s" }}
                />

                {/* Left handle knob */}
                {isDraggable && (
                  <circle
                    cx={8} cy={y} r={isActive ? 6 : 5}
                    fill={style.color}
                    opacity={style.opacity}
                    style={{ cursor: "grab", transition: "r 0.1s" }}
                    onPointerDown={(e) => handlePointerDown(e, line.id)}
                    onPointerEnter={() => setHoveredId(line.id)}
                    onPointerLeave={() => setHoveredId(null)}
                  />
                )}

                {/* Value badge */}
                <g transform={`translate(${innerWidth}, ${y})`}>
                  <rect
                    x={4} y={-10}
                    width={48} height={20}
                    rx={4}
                    fill={style.color}
                    opacity={isActive ? 1 : 0.85}
                  />
                  <text
                    x={28} y={0}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    style={{
                      fontSize: 11,
                      fontFamily: "system-ui, sans-serif",
                      fill: "#fff",
                      fontWeight: 600,
                      pointerEvents: "none",
                    }}
                  >
                    {line.value % 1 === 0 ? line.value : line.value.toFixed(1)}
                  </text>
                </g>

                {/* Optional label */}
                {line.label && (
                  <text
                    x={16} y={y - 6}
                    style={{
                      fontSize: 11,
                      fontFamily: "system-ui, sans-serif",
                      fill: style.color,
                      fontWeight: 500,
                      pointerEvents: "none",
                    }}
                  >
                    {line.label}
                  </text>
                )}
              </g>
            );
          })}

        </g>
      </svg>
    </div>
  );
};

export default HorizontalLineChart;


// ─── Usage example (remove in production) ─────────────────────────────────────
//
// import { useState } from "react";
// import { HorizontalLineChart, HorizontalLine } from "./HorizontalLineChart";
//
// function Demo() {
//   const [lines, setLines] = useState<HorizontalLine[]>([
//     { id: "threshold", value: 75, label: "Threshold",
//       style: { color: "#ef4444", strokeWidth: 2, strokeDasharray: "6 3" } },
//     { id: "target",    value: 50, label: "Target",
//       style: { color: "#22c55e", strokeWidth: 2 } },
//     { id: "floor",     value: 25, label: "Floor",
//       style: { color: "#f59e0b", strokeWidth: 1.5, strokeDasharray: "2 4" } },
//   ]);
//
//   const handleChange = (id: string, newValue: number) => {
//     setLines(prev => prev.map(l => l.id === id ? { ...l, value: newValue } : l));
//   };
//
//   return (
//     <HorizontalLineChart
//       lines={lines}
//       onLineChange={handleChange}
//       yMin={0}
//       yMax={100}
//       yTickCount={6}
//       width={600}
//       height={400}
//       title="Threshold Configuration"
//     />
//   );
// }
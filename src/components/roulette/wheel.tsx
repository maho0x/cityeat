"use client";

import { type MotionValue, motion } from "motion/react";

const SIZE = 320;
const R = SIZE / 2;

function polar(angleDeg: number, radius: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  // Rounded so server and client render identical path strings.
  const round = (v: number) => Math.round(v * 100) / 100;
  return [
    round(R + radius * Math.cos(a)),
    round(R + radius * Math.sin(a)),
  ] as const;
}

function slicePath(start: number, end: number) {
  const [x1, y1] = polar(start, R);
  const [x2, y2] = polar(end, R);
  const large = end - start > 180 ? 1 : 0;
  return `M ${R} ${R} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}

function shorten(label: string, max: number) {
  return [...label].length > max
    ? `${[...label].slice(0, max - 1).join("")}…`
    : label;
}

/**
 * Segment i spans [i·seg, (i+1)·seg) clockwise from 12 o'clock; the wheel
 * rotates clockwise by `rotation` degrees and the pointer sits at the top.
 */
export function Wheel({
  labels,
  keys,
  rotation,
  highlight,
}: {
  labels: string[];
  keys: (string | number)[];
  rotation: MotionValue<number>;
  highlight: number | null;
}) {
  const n = labels.length;
  const seg = 360 / n;
  const fontSize = n > 16 ? 10 : n > 10 ? 12 : 14;
  const maxChars = n > 16 ? 7 : 9;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(88vw,420px)]">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-full drop-shadow-sm"
        aria-hidden="true"
      >
        <motion.g style={{ rotate: rotation, originX: "50%", originY: "50%" }}>
          {labels.map((label, i) => {
            const start = i * seg;
            const mid = start + seg / 2;
            const [tx, ty] = polar(mid, R * 0.6);
            const fill =
              highlight === i
                ? "var(--foreground)"
                : i % 2 === 0
                  ? "var(--brand)"
                  : "var(--card)";
            const text =
              highlight === i
                ? "var(--background)"
                : i % 2 === 0
                  ? "var(--brand-foreground)"
                  : "var(--foreground)";
            return (
              <g key={keys[i]}>
                {n === 1 ? (
                  <circle cx={R} cy={R} r={R} fill={fill} />
                ) : (
                  <path
                    d={slicePath(start, start + seg)}
                    fill={fill}
                    stroke="var(--background)"
                    strokeWidth={1.5}
                  />
                )}
                <text
                  x={tx}
                  y={ty}
                  fill={text}
                  fontSize={fontSize}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${mid - 90} ${tx} ${ty})`}
                >
                  {shorten(label, maxChars)}
                </text>
              </g>
            );
          })}
        </motion.g>
        <circle
          cx={R}
          cy={R}
          r={R - 0.75}
          fill="none"
          stroke="var(--foreground)"
          strokeOpacity={0.12}
          strokeWidth={1.5}
        />
      </svg>
      {/* Pointer */}
      <svg
        viewBox="0 0 24 20"
        className="absolute -top-2 left-1/2 w-7 -translate-x-1/2 drop-shadow"
        aria-hidden="true"
      >
        <path
          d="M12 20 L1 2 Q0 0 2 0 L22 0 Q24 0 23 2 Z"
          fill="var(--foreground)"
        />
      </svg>
    </div>
  );
}

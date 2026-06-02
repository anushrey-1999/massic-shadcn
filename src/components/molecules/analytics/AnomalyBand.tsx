import * as React from "react";

/**
 * Custom shape for a recharts <ReferenceArea> that renders a very subtle,
 * full-height shaded region matching the series colour. Resting state is a soft
 * flat tint with no edges or caps, so multiple overlapping bands stay clean. On
 * hover it lightly brightens and reveals an "open" badge to signal it can be
 * clicked. The date-range message is exposed via a native SVG <title> on hover.
 */
export interface AnomalyBandShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color: string;
  title: string;
  onClick?: () => void;
}

export function AnomalyBandShape({
  x,
  y,
  width,
  height,
  color,
  title,
  onClick,
}: AnomalyBandShapeProps) {
  const [hovered, setHovered] = React.useState(false);

  const left = Number(x);
  const top = Number(y);
  const w = Number(width);
  const h = Number(height);

  if (![left, top, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
    return <g />;
  }

  const radius = Math.min(4, w / 2);
  const showBadge = hovered && w >= 22 && h >= 36;
  const badgeCx = left + w / 2;
  const badgeCy = top + 14;

  return (
    <g
      className="cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      pointerEvents="all"
    >
      {/* Soft, flat tint — kept faint so overlapping bands stay clean */}
      <rect
        x={left}
        y={top}
        width={w}
        height={h}
        rx={radius}
        ry={radius}
        fill={color}
        fillOpacity={hovered ? 0.16 : 0.07}
      />

      {/* Hover affordance: an "open" badge with an arrow-up-right glyph */}
      {showBadge && (
        <g pointerEvents="none">
          <circle cx={badgeCx} cy={badgeCy} r={9.5} fill={color} />
          <circle cx={badgeCx} cy={badgeCy} r={9.5} fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={1} />
          <g
            stroke="#ffffff"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <line x1={badgeCx - 3} y1={badgeCy + 3} x2={badgeCx + 3} y2={badgeCy - 3} />
            <polyline points={`${badgeCx - 0.5},${badgeCy - 3} ${badgeCx + 3},${badgeCy - 3} ${badgeCx + 3},${badgeCy + 0.5}`} />
          </g>
        </g>
      )}

      <title>{title}</title>
    </g>
  );
}

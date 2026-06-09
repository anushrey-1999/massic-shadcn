import * as React from "react";

/**
 * Custom shape for a recharts <ReferenceArea> that renders a very subtle,
 * full-height shaded region matching the series colour. Resting state is a soft
 * flat tint with no edges or caps, so multiple overlapping bands stay clean. On
 * hover it lightly brightens. The date-range message is exposed via a native
 * SVG <title> on hover.
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

      <title>{title}</title>
    </g>
  );
}

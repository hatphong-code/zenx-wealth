import * as React from 'react';

export interface StatTileProps {
  /** Icon node (e.g. an SVG). Optional. */
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  /** Caption under the value. Omit when using `pct`. */
  sub?: React.ReactNode;
  subTone?: 'soft' | 'positive';
  /** When set (0–100), renders a ProgressBar instead of a plain sub. */
  pct?: number | null;
  /** Icon foreground color token. */
  color?: string;
  onClick?: () => void;
}

export function StatTile(props: StatTileProps): JSX.Element;

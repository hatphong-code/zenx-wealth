import * as React from 'react';

export interface RingProps {
  /** 0–100. */
  pct?: number;
  size?: number;
  stroke?: number;
  /** Progress stroke color token. */
  color?: string;
  /** Centered content (e.g. the figure + caption). */
  children?: React.ReactNode;
}

export function Ring(props: RingProps): JSX.Element;

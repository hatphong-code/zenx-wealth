import * as React from 'react';

export interface ProgressBarProps {
  /** 0–100. */
  pct?: number;
  height?: number | string;
  style?: React.CSSProperties;
}

export function ProgressBar(props: ProgressBarProps): JSX.Element;

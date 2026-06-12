import * as React from 'react';

export interface PillProps {
  tone?: 'accent' | 'positive' | 'neutral' | 'solid';
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function Pill(props: PillProps): JSX.Element;

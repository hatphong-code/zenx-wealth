import * as React from 'react';

export interface SegmentedOption { value: string; label: string; }

export interface SegmentedProps {
  value: string;
  onChange?: (value: string) => void;
  options: SegmentedOption[];
  /** Use on dark surfaces. */
  dark?: boolean;
}

export function Segmented(props: SegmentedProps): JSX.Element;

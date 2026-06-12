import * as React from 'react';

export interface PanelProps {
  /** `card` = boxed surface; `open` = "Ít khung" transparent block with top hairline. */
  variant?: 'card' | 'open';
  /** Use the warm/navy hero gradient background (cards only). */
  hero?: boolean;
  /** First block in an open stack — suppresses the top hairline + spacing. */
  first?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function Panel(props: PanelProps): JSX.Element;

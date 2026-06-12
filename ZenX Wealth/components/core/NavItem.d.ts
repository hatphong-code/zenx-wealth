import * as React from 'react';

export interface NavItemProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  /** Vertical (bottom-tab) layout instead of horizontal (sidebar). */
  vertical?: boolean;
  onClick?: () => void;
}

export function NavItem(props: NavItemProps): JSX.Element;

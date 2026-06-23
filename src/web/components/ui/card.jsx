export function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-zx border border-zx-line bg-zx-surface shadow-zx zx-transition ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`p-5 pb-0 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`font-zx-head text-base font-semibold tracking-tight text-zx-text ${className}`}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

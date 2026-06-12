export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-lg border border-[#1F2937] bg-[#111827] shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`p-5 pb-0 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={`text-base font-semibold tracking-tight ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

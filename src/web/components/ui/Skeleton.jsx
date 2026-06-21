export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-zx-sm bg-zx-surface-2 ${className}`} />
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-zx border border-zx-line bg-zx-surface p-5 space-y-3 ${className}`}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function SkeletonRow({ columns = 4, className = '' }) {
  return (
    <div className={`flex items-center gap-4 py-3 border-b border-zx-line ${className}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={`h-4 flex-1 ${i === 0 ? 'max-w-[80px]' : ''}`} />
      ))}
    </div>
  );
}

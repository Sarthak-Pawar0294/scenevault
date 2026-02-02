export function SceneCardSkeleton() {
  return (
    <div className="surface rounded-[12px] overflow-hidden">
      {/* Thumbnail skeleton */}
      <div className="relative w-full aspect-video bg-[var(--surface-3)] animate-pulse" />

      {/* Content skeleton */}
      <div className="p-3 pb-3 space-y-2">
        {/* Title skeleton */}
        <div className="h-5 bg-[var(--surface-3)] rounded animate-pulse" />
        <div className="h-5 w-3/4 bg-[var(--surface-3)] rounded animate-pulse" />

        {/* Category badge skeleton */}
        <div className="h-6 w-16 bg-[var(--surface-3)] rounded-full animate-pulse" />

        {/* Meta line skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-[var(--surface-3)] rounded animate-pulse" />
          <div className="h-4 w-1 bg-[var(--surface-3)] rounded animate-pulse" />
          <div className="h-4 w-16 bg-[var(--surface-3)] rounded animate-pulse" />
        </div>

        {/* Timestamp skeleton */}
        <div className="h-4 w-20 bg-[var(--surface-3)] rounded animate-pulse" />
      </div>
    </div>
  );
}

export function SceneGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={`grid [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <SceneCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PlaylistCardSkeleton() {
  return (
    <div className="surface rounded-[12px] overflow-hidden">
      {/* Thumbnail skeleton */}
      <div className="relative w-full aspect-video bg-[var(--surface-3)] animate-pulse" />

      {/* Content skeleton */}
      <div className="p-4 space-y-2">
        <div className="h-6 bg-[var(--surface-3)] rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-[var(--surface-3)] rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-[var(--surface-3)] rounded animate-pulse" />
      </div>
    </div>
  );
}

export function PlaylistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={`grid [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <PlaylistCardSkeleton key={i} />
      ))}
    </div>
  );
}

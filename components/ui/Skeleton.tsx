interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-100 rounded-xl ${className}`}
    />
  )
}

export function SkeletonText({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-100 rounded-md h-4 ${className}`} />
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_0_rgba(0,0,0,0.05)] p-5 ${className}`}>
      <div className="animate-pulse space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded-md w-2/3" />
            <div className="h-3 bg-gray-100 rounded-md w-1/3" />
          </div>
          <div className="h-6 bg-gray-100 rounded-md w-16" />
        </div>
      </div>
    </div>
  )
}

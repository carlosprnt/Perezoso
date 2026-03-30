interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-xl ${className}`}
    />
  )
}

export function SkeletonText({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md h-4 ${className}`} />
}

// Matches the wide Monthly+Yearly card
export function SkeletonStatWide({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E8E8E8] dark:border-[#2C2C2E] p-5 ${className}`}>
      <div className="animate-pulse grid grid-cols-2">
        <div className="pr-5 border-r border-[#F0F0F0] dark:border-[#2C2C2E] space-y-3">
          <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-16" />
          <div className="h-8 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-lg w-28" />
          <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-24" />
        </div>
        <div className="pl-5 space-y-3">
          <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-16" />
          <div className="h-8 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-lg w-28" />
          <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-24" />
        </div>
      </div>
    </div>
  )
}

// Matches the small Active / Shared stat cards
export function SkeletonStatSmall({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E8E8E8] dark:border-[#2C2C2E] p-4 ${className}`}>
      <div className="animate-pulse space-y-2.5">
        <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-12" />
        <div className="h-7 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-lg w-20" />
        <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-16" />
      </div>
    </div>
  )
}

// Matches a subscription row (avatar + name + amount)
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E8E8E8] dark:border-[#2C2C2E] p-5 ${className}`}>
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-2/3" />
              <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-1/3" />
            </div>
            <div className="h-4 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}

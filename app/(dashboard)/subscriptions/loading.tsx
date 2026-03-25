import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function SubscriptionsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-20 rounded-xl" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className={`h-8 rounded-xl ${i === 0 ? 'w-12' : 'w-20'}`} />
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-xl" />
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

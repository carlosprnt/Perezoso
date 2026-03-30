import { SkeletonStatWide, SkeletonStatSmall } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="animate-pulse h-7 w-32 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-lg" />
          <div className="animate-pulse h-3.5 w-44 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md" />
        </div>
        <div className="animate-pulse w-9 h-9 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-full" />
      </div>

      {/* Wide Monthly + Yearly card */}
      <SkeletonStatWide />

      {/* Active + Shared small cards */}
      <div className="grid grid-cols-2 gap-[8px]">
        <SkeletonStatSmall />
        <SkeletonStatSmall />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-[8px]">
        {/* Upcoming renewals */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E8E8E8] dark:border-[#2C2C2E] p-5">
          <div className="animate-pulse space-y-1.5 mb-5">
            <div className="h-5 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-lg w-40" />
            <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-28" />
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-1/2" />
                  <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-1/3" />
                </div>
                <div className="h-4 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-[8px]">
          {/* Top categories */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E8E8E8] dark:border-[#2C2C2E] p-5">
            <div className="animate-pulse h-5 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-lg w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex justify-between mb-1.5">
                    <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-20" />
                    <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-12" />
                  </div>
                  <div className="h-1 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Most expensive */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E8E8E8] dark:border-[#2C2C2E] p-5">
            <div className="animate-pulse space-y-3">
              <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-24" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-2/3" />
                  <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-1/2" />
                </div>
              </div>
              <div className="pt-3 border-t border-[#F0F0F0] dark:border-[#2C2C2E] flex justify-between">
                <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-20" />
                <div className="h-4 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-14" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active subscriptions */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E8E8E8] dark:border-[#2C2C2E] p-5">
        <div className="animate-pulse flex items-center justify-between mb-4">
          <div className="h-5 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-lg w-40" />
          <div className="h-3.5 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-14" />
        </div>
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2.5 animate-pulse">
              <div className="w-9 h-9 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-1/2" />
                <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-1/4" />
              </div>
              <div className="text-right space-y-1">
                <div className="h-4 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-14" />
                <div className="h-3 bg-[#F0F0F0] dark:bg-[#2C2C2E] rounded-md w-8 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-20 rounded-xl" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`rounded-2xl p-4 border animate-pulse ${i === 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-100'}`}
          >
            <div className="h-3 w-16 bg-gray-200 rounded-md mb-3" />
            <div className="h-7 w-24 bg-gray-200 rounded-md mb-1.5" />
            <div className="h-3 w-20 bg-gray-200 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_0_rgba(0,0,0,0.05)] p-5">
          <SkeletonText className="w-40 mb-1" />
          <SkeletonText className="w-28 mb-5" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded-md w-1/3" />
                  <div className="h-3 bg-gray-100 rounded-md w-1/4" />
                </div>
                <div className="h-4 bg-gray-100 rounded-md w-14" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_0_rgba(0,0,0,0.05)] p-5">
            <SkeletonText className="w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex justify-between mb-1">
                    <div className="h-3 bg-gray-100 rounded-md w-20" />
                    <div className="h-3 bg-gray-100 rounded-md w-12" />
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

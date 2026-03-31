const S = 'bg-[#EBEBEB] dark:bg-[#2C2C2E] animate-pulse rounded-lg'

export default function DashboardLoading() {
  return (
    <div className="space-y-2">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="pb-5 space-y-3">
        {/* Greeting row */}
        <div className="flex items-center justify-between">
          <div className={`${S} h-5 w-28`} />
          <div className={`${S} w-9 h-9 rounded-full`} />
        </div>
        {/* Main statement — 2 lines big text */}
        <div className="space-y-2">
          <div className={`${S} h-9 w-full`} />
          <div className={`${S} h-9 w-4/5`} />
        </div>
        {/* Supporting statement */}
        <div className={`${S} h-5 w-3/4`} />
      </div>

      {/* ── Insights 2×2 ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] overflow-hidden">
        <div className="grid grid-cols-2">
          {[
            'border-r border-b',
            'border-b',
            'border-r',
            '',
          ].map((border, i) => (
            <div
              key={i}
              className={`p-4 ${border} border-[#F7F8FA] dark:border-[#111111]`}
            >
              {/* Icon container 40×40 */}
              <div className={`${S} w-10 h-10 rounded-2xl mb-2.5`} />
              {/* Label */}
              <div className={`${S} h-3 w-20 mb-1.5`} />
              {/* Value */}
              <div className={`${S} h-5 w-24`} />
              {/* Sub */}
              <div className={`${S} h-3 w-28 mt-1`} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Renewals + Categories ─────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-2">

        {/* Renewals */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-2xl p-5">
          {/* Title row + calendar button */}
          <div className="flex items-center justify-between mb-4">
            <div className={`${S} h-5 w-40`} />
            <div className={`${S} w-8 h-8 rounded-xl`} />
          </div>
          <div className="space-y-3.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                {/* Logo 40×40, radius 16 */}
                <div className={`${S} w-10 h-10 rounded-2xl flex-shrink-0`} />
                <div className="flex-1 space-y-1.5">
                  <div className={`${S} h-3.5 w-1/2`} />
                  <div className={`${S} h-3 w-1/3`} />
                </div>
                <div className={`${S} h-3.5 w-14`} />
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5">
          <div className={`${S} h-5 w-36 mb-4`} />
          {/* Segmented bar 56px */}
          <div className={`${S} h-14 w-full rounded-2xl mb-4`} />
          {/* Legend rows */}
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-1.5">
                <div className={`${S} w-2.5 h-2.5 rounded-full flex-shrink-0`} />
                <div className={`${S} h-3 flex-1`} />
                <div className={`${S} h-3 w-12`} />
                <div className={`${S} h-3 w-6`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top expensive ────────────────────────────────────────────────────── */}
      <div className="mt-3">
        <div className={`${S} h-5 w-48 mb-4`} />
        <div className="flex gap-3 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[185px] bg-white dark:bg-[#1C1C1E] rounded-[16px] p-4 space-y-2"
            >
              <div className={`${S} h-3 w-6`} />
              {/* Logo md = 44px */}
              <div className={`${S} w-11 h-11 rounded-[8px]`} />
              <div className={`${S} h-4 w-24`} />
              <div className={`${S} h-4 w-16`} />
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

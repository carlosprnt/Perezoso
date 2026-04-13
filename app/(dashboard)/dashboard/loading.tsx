const S = 'bg-[#EBEBEB] dark:bg-[#2C2C2E] animate-pulse rounded-lg'

export default function DashboardLoading() {
  return (
    <div className="space-y-2">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="pb-5 space-y-3">
        {/* Greeting row */}
        <div className="flex items-center justify-between">
          <div className={`${S} h-5 w-28`} />
          <div className={`${S} w-10 h-10 rounded-full`} />
        </div>
        {/* Main statement — narrative + big numbers */}
        <div className="space-y-1.5">
          <div className={`${S} h-6 w-36`} />
          <div className={`${S} h-12 w-48`} />
          <div className={`${S} h-6 w-32`} />
          <div className={`${S} h-12 w-56`} />
        </div>
        {/* Supporting — 3 lines */}
        <div className="space-y-1.5 pt-1">
          <div className={`${S} h-4 w-3/4`} />
          <div className={`${S} h-4 w-2/3`} />
          <div className={`${S} h-4 w-1/2`} />
        </div>
      </div>

      {/* ── Insight cards (3 horizontal cards) ────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#1C1C1E] rounded-[32px] px-4 py-3 flex items-center gap-3">
            <div className={`${S} w-10 h-10 rounded-2xl flex-shrink-0`} />
            <div className="flex-1 space-y-1.5">
              <div className={`${S} h-3 w-20`} />
              <div className={`${S} h-5 w-28`} />
            </div>
            <div className="space-y-1.5 flex flex-col items-end">
              <div className={`${S} h-3 w-16`} />
              <div className={`${S} h-3 w-12`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Renewals + Categories ─────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-2">

        {/* Renewals */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-[32px] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className={`${S} h-5 w-40`} />
            <div className={`${S} w-10 h-10 rounded-full`} />
          </div>
          <div className="space-y-3.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`${S} w-10 h-10 rounded-[8px] flex-shrink-0`} />
                <div className="flex-1 space-y-1.5">
                  <div className={`${S} h-4 w-1/2`} />
                  <div className={`${S} h-3 w-1/3`} />
                </div>
                <div className={`${S} h-3.5 w-16`} />
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-5">
          <div className={`${S} h-5 w-36 mb-4`} />
          <div className={`flex gap-[3px] h-12 mb-4`}>
            {[60, 20, 12, 8].map((w, i) => (
              <div key={i} className={`${S} rounded-[12px]`} style={{ flexGrow: w }} />
            ))}
          </div>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5">
                <div className={`${S} w-2.5 h-2.5 rounded-full flex-shrink-0`} />
                <div className={`${S} h-3 flex-1`} />
                <div className={`${S} h-3 w-8`} />
                <div className={`${S} h-3 w-14`} />
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
              className="flex-shrink-0 w-[185px] bg-white dark:bg-[#1C1C1E] rounded-[32px] p-4 space-y-2"
            >
              <div className={`${S} h-3 w-6`} />
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

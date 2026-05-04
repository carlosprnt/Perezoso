export default function SubscriptionsLoading() {
  const S = 'bg-[#EBEBEB] dark:bg-[#2C2C2E] animate-pulse'

  return (
    <div>
      {/* ── Header ── */}
      <div className="pb-4">
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-2">
            <div className={`${S} h-8 w-44 rounded-xl`} />
            <div className={`${S} h-5 w-64 rounded-lg`} />
          </div>
          <div className={`${S} w-10 h-10 rounded-full`} />
        </div>
      </div>

      {/* Sort + Filter row */}
      <div className="mt-2 mb-3 flex items-center justify-between">
        <div className={`${S} h-4 w-36 rounded-md`} />
        <div className={`${S} h-4 w-14 rounded-md`} />
      </div>

      {/* ── Stacked wallet cards ── */}
      <div className="-mx-2.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{ marginTop: i === 0 ? 0 : -76, zIndex: i + 1, position: 'relative' }}
          >
            <div className="w-full bg-white dark:bg-[#1C1C1E] px-5 pt-5 pb-5 rounded-[28px]">
              {/* Top row: avatar + name/category + price */}
              <div className="flex items-start gap-5">
                <div className={`${S} w-12 h-12 rounded-2xl flex-shrink-0`} />
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className={`${S} h-4 w-32 rounded-md mb-2`} />
                  <div className={`${S} h-3.5 w-20 rounded-md`} />
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <div className={`${S} h-5 w-20 rounded-lg`} />
                  <div className={`${S} h-4 w-10 rounded-md`} />
                </div>
              </div>

              {/* Billing progress */}
              <div className="mt-5">
                <div className={`${S} h-3 w-24 rounded-md mb-2`} />
                <div className={`${S} h-1 w-full rounded-full`} />
                <div className="flex justify-between items-center mt-1.5">
                  <div className={`${S} h-3 w-16 rounded-md`} />
                  <div className={`${S} h-3 w-24 rounded-md`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  // Parent layout applies px-4 (16px). Pull in 4px each side → 12px from device edge.
  return <div className="-mx-1">{children}</div>
}

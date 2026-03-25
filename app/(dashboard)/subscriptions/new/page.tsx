import SubscriptionForm from '@/components/subscriptions/SubscriptionForm'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Add subscription' }

export default function NewSubscriptionPage() {
  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/subscriptions">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Add subscription</h1>
          <p className="text-xs text-gray-400 mt-0.5">Track a new recurring expense</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] p-6">
        <SubscriptionForm mode="create" />
      </div>
    </div>
  )
}

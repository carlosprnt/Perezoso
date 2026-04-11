import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubscriptionForm from '@/components/subscriptions/SubscriptionForm'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { ArrowLeft } from '@/lib/icons'
import type { Subscription } from '@/types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('name')
    .eq('id', id)
    .single()

  return { title: data ? `Edit ${data.name}` : 'Edit subscription' }
}

export default async function EditSubscriptionPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const subscription = data as Subscription

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
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Edit subscription
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{subscription.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] p-6">
        <SubscriptionForm mode="edit" subscription={subscription} />
      </div>
    </div>
  )
}

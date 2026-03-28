'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import SubscriptionForm from './SubscriptionForm'

export default function AddSubscriptionFlow() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="
          flex items-center gap-1.5 px-3.5 py-2 rounded-xl
          bg-[#121212] text-white text-sm font-medium
          hover:bg-[#2A2A2A] transition-colors pressable
        "
      >
        <Plus size={15} />
        Add
      </button>

      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        title="New subscription"
        height="tall"
      >
        <SubscriptionForm
          mode="create"
          onCancel={() => setOpen(false)}
        />
      </BottomSheet>
    </>
  )
}

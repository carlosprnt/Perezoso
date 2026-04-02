'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import SlothReminderCard from './SlothReminderCard'
import SavingsOpportunityCard from './SavingsOpportunityCard'
import { getBestSavingsOpportunity } from '@/lib/calculations/savings'
import type { SubscriptionWithCosts } from '@/types'

type Phase = 'reminder' | 'savings' | 'done'

export default function DashboardReminderCards({ subscriptions }: { subscriptions: SubscriptionWithCosts[] }) {
  const opportunity = useMemo(() => getBestSavingsOpportunity(subscriptions), [subscriptions])
  const [phase, setPhase] = useState<Phase>('reminder')

  // Called by SlothReminderCard's onExitComplete — fires after its 0.42s exit animation
  function onReminderExited() {
    setPhase(opportunity ? 'savings' : 'done')
  }

  return (
    <>
      {/* Reminder card manages its own AnimatePresence + exit animation internally */}
      {phase === 'reminder' && (
        <SlothReminderCard onDismiss={onReminderExited} />
      )}

      {/* Savings card — outer AnimatePresence stays mounted to catch exit */}
      <AnimatePresence>
        {phase === 'savings' && opportunity && (
          <SavingsOpportunityCard
            key="savings"
            opportunity={opportunity}
            onDismiss={() => setPhase('done')}
          />
        )}
      </AnimatePresence>
    </>
  )
}

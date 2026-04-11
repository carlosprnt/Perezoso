import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/lib/icons'

export const metadata: Metadata = { title: 'Terms of Service' }

const LAST_UPDATED = 'April 6, 2026'

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-5 py-10 text-[#000000] dark:text-[#F2F2F7]">
      <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-[#737373] dark:text-[#8E8E93] mb-6 hover:text-[#000000] dark:hover:text-[#F2F2F7] transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>

      <h1 className="text-[28px] font-bold mb-1">Terms of Service</h1>
      <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-6 text-[15px] leading-relaxed text-[#000000] dark:text-[#AEAEB2]">
        <p>
          By creating an account or using Perezoso, you agree to these terms. If you do not
          agree, please do not use the service.
        </p>

        <section>
          <h2 className="text-[17px] font-bold text-[#000000] dark:text-[#F2F2F7] mb-2">1. The service</h2>
          <p>
            Perezoso is a personal subscription tracker. It is provided &ldquo;as is&rdquo; and
            is currently in active development. Features may change, be added or removed.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#000000] dark:text-[#F2F2F7] mb-2">2. Your account</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>You are responsible for keeping your credentials secure.</li>
            <li>You must provide accurate information when creating an account.</li>
            <li>One account per person.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#000000] dark:text-[#F2F2F7] mb-2">3. Acceptable use</h2>
          <p>Don&rsquo;t:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Attempt to break, probe or overload the service.</li>
            <li>Use Perezoso to store unlawful or abusive content.</li>
            <li>Attempt to access other people&rsquo;s data.</li>
            <li>Scrape, resell or mirror the service without permission.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#000000] dark:text-[#F2F2F7] mb-2">4. Gmail integration</h2>
          <p>
            If you connect Gmail, you grant Perezoso read-only access to your inbox solely to
            detect subscription receipts. You can revoke access at any time. See our{' '}
            <Link href="/privacy" className="text-[#000000] underline">Privacy Policy</Link> for details.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#000000] dark:text-[#F2F2F7] mb-2">5. No financial advice</h2>
          <p>
            Perezoso shows totals, insights and savings suggestions for your convenience.
            Nothing in the app is financial, legal or tax advice. Double-check your own
            records before making decisions.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#000000] dark:text-[#F2F2F7] mb-2">6. Termination</h2>
          <p>
            You can delete your account at any time. We can suspend or terminate accounts
            that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#000000] dark:text-[#F2F2F7] mb-2">7. Liability</h2>
          <p>
            To the extent permitted by law, Perezoso is provided without warranty and we
            are not liable for indirect or consequential damages arising from your use of
            the service.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#000000] dark:text-[#F2F2F7] mb-2">8. Changes</h2>
          <p>
            We may update these terms over time. Material changes will be announced in-app
            or by email. Continued use after changes means you accept them.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#000000] dark:text-[#F2F2F7] mb-2">9. Contact</h2>
          <p>
            Questions? Write to{' '}
            <a className="text-[#000000] underline" href="mailto:hello@carlospariente.com">hello@carlospariente.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}

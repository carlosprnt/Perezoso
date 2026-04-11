import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Privacy Policy' }

const LAST_UPDATED = 'April 6, 2026'

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-5 py-10 text-[#424242] dark:text-[#F2F2F7]">
      <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-[#737373] dark:text-[#8E8E93] mb-6 hover:text-[#424242] dark:hover:text-[#F2F2F7] transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>

      <h1 className="text-[28px] font-bold mb-1">Privacy Policy</h1>
      <p className="text-[13px] text-[#737373] dark:text-[#8E8E93] mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-6 text-[15px] leading-relaxed text-[#424242] dark:text-[#AEAEB2]">
        <p>
          Perezoso (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a subscription tracking tool that helps you keep a tidy
          overview of the recurring services you pay for. This policy explains what we store,
          why, and what you can do about it.
        </p>

        <section>
          <h2 className="text-[17px] font-bold text-[#424242] dark:text-[#F2F2F7] mb-2">1. Data we collect</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Account</strong>: email, name and avatar URL provided by your sign-in provider (e.g. Google).</li>
            <li><strong>Subscriptions you create</strong>: name, price, billing period, category, notes and other fields you enter.</li>
            <li><strong>Preferences</strong>: theme, preferred currency, custom categories, notification toggles.</li>
            <li><strong>Product analytics</strong>: anonymised events about which screens and features you use (PostHog). No raw inputs, emails or Gmail contents are sent.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#424242] dark:text-[#F2F2F7] mb-2">2. Gmail access (optional)</h2>
          <p>
            If you choose to connect Gmail for subscription detection, Perezoso requests the
            <code className="mx-1 px-1.5 py-0.5 rounded bg-[#F0F0F0] dark:bg-[#2C2C2E] text-[13px]">gmail.readonly</code>
            scope to scan a limited window of your inbox for subscription receipts.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>We never store the body of your emails.</li>
            <li>We only extract structured metadata (sender, detected service name, amount, currency) that you explicitly confirm before saving.</li>
            <li>You can revoke access at any time from your Google account settings.</li>
            <li>Perezoso&rsquo;s use and transfer of information received from Google APIs adheres to the <a className="text-[#000000] underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#424242] dark:text-[#F2F2F7] mb-2">3. How we use your data</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Display your subscriptions and renewal dates inside the app.</li>
            <li>Calculate totals and insights shown on your dashboard.</li>
            <li>Remember your preferences across sessions.</li>
            <li>Understand aggregated product usage to improve Perezoso.</li>
          </ul>
          <p className="mt-2">We do <strong>not</strong> sell, rent or share your data with advertisers.</p>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#424242] dark:text-[#F2F2F7] mb-2">4. Storage and processing</h2>
          <p>
            Your account and subscription data are stored with Supabase (EU region). Product
            analytics events are stored with PostHog Cloud EU. Both providers are GDPR
            compliant. Data is encrypted in transit (TLS) and at rest.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#424242] dark:text-[#F2F2F7] mb-2">5. Your rights</h2>
          <p>You can at any time:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Access, edit or delete any subscription from the app.</li>
            <li>Delete your entire account by emailing us at the address below.</li>
            <li>Request a copy of your data.</li>
            <li>Revoke Gmail permissions from your Google account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[17px] font-bold text-[#424242] dark:text-[#F2F2F7] mb-2">6. Contact</h2>
          <p>
            For anything privacy-related, write to{' '}
            <a className="text-[#000000] underline" href="mailto:hello@carlospariente.com">hello@carlospariente.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}

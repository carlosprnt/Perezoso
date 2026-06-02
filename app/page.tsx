import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', padding: '2rem', gap: '1rem' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>Perezoso</h1>
      <p style={{ color: '#666', textAlign: 'center', maxWidth: 400 }}>
        Track and manage all your subscriptions in one place.
      </p>
      <a href="/login" style={{ padding: '0.75rem 2rem', background: '#000', color: '#fff', borderRadius: '0.5rem', textDecoration: 'none', marginTop: '0.5rem' }}>
        Sign in
      </a>
      <footer style={{ position: 'fixed', bottom: '1.5rem', display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
        <a href="/privacy" style={{ color: '#999', textDecoration: 'underline' }}>Privacy Policy</a>
        <a href="/terms" style={{ color: '#999', textDecoration: 'underline' }}>Terms of Service</a>
      </footer>
    </main>
  )
}

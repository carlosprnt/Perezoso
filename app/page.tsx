export default function RootPage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', padding: '2rem', gap: '1rem' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>Perezoso</h1>
      <p style={{ color: '#666', textAlign: 'center', maxWidth: 400 }}>
        Track and manage all your subscriptions in one place.
      </p>
      <footer style={{ position: 'fixed', bottom: '1.5rem', display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
        <a href="/privacy" style={{ color: '#999', textDecoration: 'underline' }}>Privacy Policy</a>
        <a href="/terms" style={{ color: '#999', textDecoration: 'underline' }}>Terms of Service</a>
      </footer>
    </main>
  )
}

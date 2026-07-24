'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleSignUp = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    })
    if (error) {
      setError(error.message)
    } else {
      router.push('/browse')
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.logo}>Dollar Cable <span style={styles.green}>Neighbor</span></h1>
      <p style={styles.sub}>Give cables. Get cables. One dollar.</p>
      <div style={styles.card}>
        <input style={styles.input} placeholder="Your name" value={name}
          onChange={e => setName(e.target.value)} />
        <input style={styles.input} placeholder="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)} />
        <input style={styles.input} placeholder="Password" type="password" value={password}
          onChange={e => setPassword(e.target.value)} />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.btn} onClick={handleSignUp} disabled={loading}>
          {loading ? 'Creating account...' : 'Create account →'}
        </button>
        <p style={styles.link}>Already have an account? <a href="/login">Log in</a></p>
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: 400, margin: '80px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' },
  logo: { fontSize: 24, fontWeight: 600, textAlign: 'center', marginBottom: 6 },
  green: { color: '#2a7c4f' },
  sub: { textAlign: 'center', color: '#666', marginBottom: 32, fontSize: 15 },
  card: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e5e5', fontSize: 15, fontFamily: 'inherit', outline: 'none', color: 'var(--text-primary)' },  btn: { background: '#2a7c4f', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  error: { color: '#c0392b', fontSize: 13 },
  link: { textAlign: 'center', fontSize: 13, color: '#666' }
}
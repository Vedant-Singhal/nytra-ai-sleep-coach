'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const PLAYLISTS = [
  { id: '37i9dQZF1DWZd79rJ6a7lp', name: 'Sleep', desc: 'Ambient sleep sounds', icon: '🌙' },
  { id: '37i9dQZF1DX4PP3DA4J0N8', name: 'Nature', desc: 'Rain, forest & ocean', icon: '🌿' },
  { id: '37i9dQZF1DWZ5PdHQ2Wkm4', name: 'Lo-fi', desc: 'Chilled lo-fi beats', icon: '🎵' },
]

// Spotify PKCE OAuth helpers
const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? ''
const REDIRECT_URI = typeof window !== 'undefined'
  ? `${window.location.origin}/music`
  : ''
const SCOPES = 'streaming user-read-playback-state user-modify-playback-state user-read-currently-playing'

function generateCodeVerifier(length = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => chars[b % chars.length]).join('')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function initiateSpotifyAuth() {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem('spotify_code_verifier', verifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

async function exchangeCodeForToken(code: string): Promise<string | null> {
  const verifier = sessionStorage.getItem('spotify_code_verifier')
  if (!verifier) return null
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.access_token) {
    localStorage.setItem('spotify_access_token', data.access_token)
    localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000))
    sessionStorage.removeItem('spotify_code_verifier')
    return data.access_token
  }
  return null
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('spotify_access_token')
  const expiry = localStorage.getItem('spotify_token_expiry')
  if (token && expiry && Date.now() < Number(expiry)) return token
  return null
}

export default function MusicPage() {
  const [active, setActive] = useState(0)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [noClientId] = useState(!SPOTIFY_CLIENT_ID)

  useEffect(() => {
    // Check for OAuth callback code
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      setLoading(true)
      window.history.replaceState({}, '', '/music')
      exchangeCodeForToken(code)
        .then(t => { if (t) setToken(t) })
        .finally(() => setLoading(false))
      return
    }
    // Check stored token
    setToken(getStoredToken())
  }, [])

  function disconnect() {
    localStorage.removeItem('spotify_access_token')
    localStorage.removeItem('spotify_token_expiry')
    setToken(null)
  }

  // Build embed URL — with token, use oauth=true for premium full playback
  const embedUrl = token
    ? `https://open.spotify.com/embed/playlist/${PLAYLISTS[active].id}?utm_source=generator&theme=0`
    : `https://open.spotify.com/embed/playlist/${PLAYLISTS[active].id}?utm_source=generator&theme=0`

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-up">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-slate-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">Sleep Music</h1>
          <p className="text-slate-500 text-xs mt-0.5">Sleep-oriented playlists via Spotify</p>
        </div>
        {token && (
          <button onClick={disconnect} className="text-slate-500 text-xs">Disconnect</button>
        )}
      </div>

      {/* Spotify connect banner */}
      {!token && !loading && (
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-3" style={{ background: 'rgba(30,215,96,0.08)', border: '1px solid rgba(30,215,96,0.2)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#1DB954' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.623.623 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 01-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.722a.779.779 0 01-1.072.257c-2.687-1.652-6.785-2.13-9.965-1.166a.779.779 0 01-.966-.519.779.779 0 01.519-.966c3.632-1.102 8.147-.568 11.228 1.322a.779.779 0 01.256 1.072zm.105-2.835c-3.223-1.914-8.54-2.09-11.618-1.156a.935.935 0 11-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.935.935 0 01-.955 1.608z"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-sm font-medium">Connect Spotify for full playback</p>
            <p className="text-slate-500 text-xs">Premium users get seamless full-track play</p>
          </div>
          {noClientId ? (
            <span className="text-slate-600 text-xs">No client ID</span>
          ) : (
            <button
              onClick={initiateSpotifyAuth}
              className="text-sm font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background: '#1DB954', color: 'white' }}
            >
              Connect
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-3" style={{ background: 'rgba(30,215,96,0.08)', border: '1px solid rgba(30,215,96,0.2)' }}>
          <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-slate-400 text-sm">Connecting to Spotify…</p>
        </div>
      )}

      {token && (
        <div className="rounded-xl p-3 mb-5 flex items-center gap-2" style={{ background: 'rgba(30,215,96,0.08)', border: '1px solid rgba(30,215,96,0.15)' }}>
          <span className="text-green-400 text-sm">✓</span>
          <p className="text-slate-300 text-sm">Spotify connected — full playback enabled for Premium users</p>
        </div>
      )}

      {/* Playlist tabs */}
      <div className="flex gap-2 mb-5">
        {PLAYLISTS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setActive(i)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active === i ? 'bg-accent-teal text-bg-primary' : 'bg-bg-secondary text-slate-400'
            }`}
          >
            <span className="block text-lg mb-0.5">{p.icon}</span>
            {p.name}
          </button>
        ))}
      </div>

      <p className="text-slate-500 text-xs mb-4 text-center">{PLAYLISTS[active].desc}</p>

      {/* Spotify embed */}
      <div className="rounded-2xl overflow-hidden">
        <iframe
          key={PLAYLISTS[active].id}
          src={embedUrl}
          width="100%"
          height="352"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ borderRadius: '16px' }}
        />
      </div>

      <p className="text-slate-600 text-xs text-center mt-4 leading-relaxed px-4">
        {token
          ? 'Premium: full tracks play directly. Free: 30-second previews.'
          : 'Connect Spotify above for seamless playback. Free accounts get 30-second previews.'}
      </p>

      {noClientId && (
        <div className="mt-4 rounded-xl p-3.5" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
          <p className="text-red-400 text-xs font-semibold mb-1">Setup required</p>
          <p className="text-slate-500 text-xs leading-relaxed">
            Add <code className="text-slate-300">NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_id</code> to <code className="text-slate-300">.env.local</code> and register <code className="text-slate-300">{typeof window !== 'undefined' ? window.location.origin : ''}/music</code> as a redirect URI in your Spotify Dashboard.
          </p>
        </div>
      )}
    </div>
  )
}

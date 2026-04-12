"use client"

import BottomNav from '@/components/layout/BottomNav'
import { usePathname } from 'next/navigation'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideBottomNav = pathname.startsWith('/wellness/chat')

  return (
    <div className="min-h-screen" style={{ background: '#0A0D14' }}>
      {/* Subtle background gradient that persists across pages */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 80% 0%, rgba(94,234,212,0.04) 0%, transparent 50%), radial-gradient(ellipse at 0% 100%, rgba(129,140,248,0.04) 0%, transparent 50%)'
      }} />
      <main className={`relative max-w-lg mx-auto ${hideBottomNav ? 'pb-0' : 'pb-20'}`}>
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  )
}

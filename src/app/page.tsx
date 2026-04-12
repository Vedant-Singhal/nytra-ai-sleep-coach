'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isOnboardingComplete } from '@/lib/storage'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    if (!isOnboardingComplete()) {
      router.replace('/onboarding')
    } else {
      router.replace('/home')
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-primary">
      <div className="w-8 h-8 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

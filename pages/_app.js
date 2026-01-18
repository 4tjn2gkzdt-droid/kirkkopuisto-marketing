import '../styles/globals.css'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Tarkista Supabase Auth -sessio
    const checkAuth = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      const isAuth = !!session

      setAuthenticated(isAuth)
      setLoading(false)

      // Jos ei ole kirjautunut ja ei ole login-sivulla tai auth-sivuilla, ohjaa kirjautumissivulle
      const publicPaths = ['/login', '/auth/callback']
      if (!isAuth && !publicPaths.includes(router.pathname)) {
        router.push('/login')
      }
    }

    checkAuth()

    // Kuuntele auth-muutoksia
    const { data } = supabase?.auth.onAuthStateChange((event, session) => {
      const isAuth = !!session
      setAuthenticated(isAuth)

      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    // Rekisteröi Service Worker PWA:ta varten
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker rekisteröity:', registration)
        })
        .catch((error) => {
          console.error('Service Worker rekisteröinti epäonnistui:', error)
        })
    }

    return () => {
      data?.subscription?.unsubscribe()
    }
  }, [router.pathname])

  // Näytä latausruutu kun tarkistetaan kirjautumista
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Ladataan...</div>
      </div>
    )
  }

  // Salli pääsy login- ja auth-sivuille ilman kirjautumista
  const publicPaths = ['/login', '/auth/callback']
  if (!authenticated && !publicPaths.includes(router.pathname)) {
    return null
  }

  return <Component {...pageProps} />
}

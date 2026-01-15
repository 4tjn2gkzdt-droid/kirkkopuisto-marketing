import '../styles/globals.css'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Tarkista onko kirjautunut
    const isAuth = sessionStorage.getItem('authenticated') === 'true'
    setAuthenticated(isAuth)
    setLoading(false)

    // Jos ei ole kirjautunut ja ei ole login-sivulla, ohjaa kirjautumissivulle
    if (!isAuth && router.pathname !== '/login') {
      router.push('/login')
    }

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
  }, [router.pathname])

  // Näytä latausruutu kun tarkistetaan kirjautumista
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Ladataan...</div>
      </div>
    )
  }

  // Jos ei ole kirjautunut ja ei ole login-sivulla, älä näytä mitään
  if (!authenticated && router.pathname !== '/login') {
    return null
  }

  return <Component {...pageProps} />
}

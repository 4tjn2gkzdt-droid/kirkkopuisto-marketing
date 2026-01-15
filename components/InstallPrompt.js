import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Kuuntele beforeinstallprompt-tapahtumaa
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`Käyttäjän valinta: ${outcome}`)

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Tallenna että käyttäjä on hylännyt
    localStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  // Älä näytä jos käyttäjä on jo hylännyt tai asennus ei ole mahdollista
  if (!showPrompt || localStorage.getItem('pwa-prompt-dismissed') === 'true') {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-white border-2 border-green-600 rounded-lg shadow-2xl p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-3xl">
          📱
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1">
            Asenna sovellus
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Lisää KP Markkinointi aloitusnäyttöösi. Sovellus toimii myös offline-tilassa!
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              ✓ Asenna
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Ei kiitos
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

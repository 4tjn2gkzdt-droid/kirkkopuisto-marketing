import React, { useState } from 'react'
import Link from 'next/link'

/**
 * MediaSuggestions - Uudelleenkäytettävä kuvaehdotus-komponentti
 *
 * Props:
 * - text: string - Tekstisisältö jonka perusteella haetaan kuvia
 * - onSelect: (asset) => void - Callback kun kuva valitaan
 * - platform: string - 'instagram' | 'facebook' | 'newsletter' | null (kanavaspesifi suodatus)
 * - usageType: string - 'some_post' | 'newsletter' | 'idea' (käyttöhistorian kirjaus)
 * - usageContext: string - Konteksti käyttöhistoriaan (esim. postauksen otsikko)
 * - className: string - Lisä CSS-luokat
 */
export default function MediaSuggestions({ text, onSelect, platform, usageType = 'some_post', usageContext = '', className = '' }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [previewAsset, setPreviewAsset] = useState(null)

  const fetchSuggestions = async () => {
    if (!text || text.trim().length < 5) {
      alert('Kirjoita vähintään 5 merkkiä tekstiä ensin')
      return
    }

    setLoading(true)
    setSearched(true)

    try {
      const response = await fetch('/api/media/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          platform: platform || null
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuggestions(result.suggestions || [])
      } else {
        console.error('Suggestion error:', result.error)
        setSuggestions([])
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setSuggestions([])
    }

    setLoading(false)
  }

  // Kuvan valinta + käyttöhistorian kirjaus
  const handleSelect = async (asset) => {
    // Kirjaa käyttöhistoria taustalla
    try {
      fetch('/api/media/log-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaAssetId: asset.id,
          usageType,
          usageContext: usageContext || text?.substring(0, 100) || ''
        })
      }).catch(() => {}) // Ei blokkaa valintaa
    } catch {}

    if (onSelect) onSelect(asset)
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">🖼️ Kuvaehdotukset</span>
          <Link href="/kuvapankki">
            <span className="text-xs text-amber-600 hover:text-amber-700 underline cursor-pointer">
              Selaa kuvapankkia
            </span>
          </Link>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? '⏳ Haetaan...' : '🔍 Hae kuvia'}
        </button>
      </div>

      {loading && (
        <div className="text-sm text-gray-500 py-4 text-center">
          Haetaan sopivia kuvia kuvapankista...
        </div>
      )}

      {!loading && searched && suggestions.length === 0 && (
        <div className="text-sm text-gray-400 py-4 text-center">
          Ei sopivia kuvia.{' '}
          <Link href="/kuvapankki">
            <span className="text-amber-600 hover:text-amber-700 underline cursor-pointer">Lisää kuvia kuvapankkiin</span>
          </Link>
        </div>
      )}

      {/* Esikatselu */}
      {previewAsset && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-3">
            <img
              src={previewAsset.public_url}
              alt={previewAsset.description_fi || previewAsset.file_name}
              className="w-24 h-24 object-cover rounded"
            />
            <div className="flex-1 text-xs">
              <div className="font-medium text-gray-800">{previewAsset.description_fi || previewAsset.file_name}</div>
              {previewAsset.tags && previewAsset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {previewAsset.tags.map((tag, i) => (
                    <span key={i} className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              )}
              {previewAsset.use_count > 0 && (
                <div className="text-gray-400 mt-1">Käytetty {previewAsset.use_count} kertaa</div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSelect(previewAsset)}
                  className="bg-amber-600 text-white px-2 py-0.5 rounded text-xs hover:bg-amber-700"
                >
                  Valitse
                </button>
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="text-gray-500 hover:text-gray-700 text-xs underline"
                >
                  Sulje
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {suggestions.map(asset => (
            <div
              key={asset.id}
              onClick={() => setPreviewAsset(asset)}
              className={`relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-colors ${
                previewAsset?.id === asset.id ? 'border-amber-500' : 'border-transparent hover:border-amber-300'
              }`}
            >
              <div className="aspect-square bg-gray-100">
                <img
                  src={asset.public_url}
                  alt={asset.description_fi || asset.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-end">
                <div className="p-1.5 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-white text-xs truncate drop-shadow-lg">
                    {asset.description_fi || asset.file_name}
                  </div>
                </div>
              </div>
              {/* Käyttökerrat */}
              {asset.use_count > 0 && (
                <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full opacity-80">
                  {asset.use_count}x
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

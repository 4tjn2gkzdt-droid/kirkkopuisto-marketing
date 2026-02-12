import React, { useState } from 'react'

/**
 * MediaSuggestions - Uudelleenkäytettävä kuvaehdotus-komponentti
 *
 * Props:
 * - text: string - Tekstisisältö jonka perusteella haetaan kuvia
 * - onSelect: (asset) => void - Callback kun kuva valitaan
 * - className: string - Lisä CSS-luokat
 */
export default function MediaSuggestions({ text, onSelect, className = '' }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

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
        body: JSON.stringify({ text: text.trim() })
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

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">🖼️ Kuvaehdotukset</span>
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
          Ei sopivia kuvia. Lisää kuvia kuvapankkiin.
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {suggestions.map(asset => (
            <div
              key={asset.id}
              onClick={() => onSelect && onSelect(asset)}
              className="relative cursor-pointer group rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-500 transition-colors"
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

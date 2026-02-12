import React, { useState, useEffect } from 'react'
import Link from 'next/link'

/**
 * MediaSuggestions - Uudelleenkäytettävä kuvaehdotus-komponentti
 *
 * Props:
 * - text: string - Tekstisisältö jonka perusteella haetaan kuvia
 * - onSelect: (asset) => void - Callback kun kuva valitaan
 * - platform: string - 'instagram' | 'facebook' | 'newsletter' | null
 * - usageType: string - 'some_post' | 'newsletter' | 'idea'
 * - usageContext: string - Konteksti käyttöhistoriaan
 * - className: string - Lisä CSS-luokat
 * - selectedUrls: string[] - Jo valitut kuvien URL:t (näytetään merkittynä)
 */
export default function MediaSuggestions({ text, onSelect, platform, usageType = 'some_post', usageContext = '', className = '', selectedUrls = [] }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [previewAsset, setPreviewAsset] = useState(null)
  const [allTags, setAllTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [showTagFilter, setShowTagFilter] = useState(false)

  // Ladaa tagit kerran
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await fetch('/api/media/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'kaikki', _tagsOnly: true })
        })
        // Ei käytetä tätä API:a tägien hakuun, haetaan ne suoraan
      } catch {}
    }
  }, [])

  const fetchSuggestions = async () => {
    if (!text || text.trim().length < 3) {
      // Jos tägejä on valittu, hae niiden perusteella
      if (selectedTags.length === 0) {
        alert('Kirjoita vähintään 3 merkkiä tekstiä tai valitse tägejä')
        return
      }
    }

    setLoading(true)
    setSearched(true)

    try {
      const searchText = selectedTags.length > 0
        ? `${(text || '').trim()} ${selectedTags.join(' ')}`.trim()
        : text.trim()

      const response = await fetch('/api/media/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: searchText,
          platform: platform || null,
          tags: selectedTags.length > 0 ? selectedTags : undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        const allSuggestions = result.suggestions || []
        setSuggestions(allSuggestions)

        // Kerää uniikit tägit ehdotetuista kuvista
        const tagSet = new Set()
        allSuggestions.forEach(asset => {
          (asset.tags || []).forEach(tag => tagSet.add(tag))
        })
        setAllTags(Array.from(tagSet).sort())
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

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Suodata tuloksia valittujen tägien mukaan (client-side)
  const filteredSuggestions = selectedTags.length > 0
    ? suggestions.filter(asset => {
        const assetTags = (asset.tags || []).map(t => t.toLowerCase())
        return selectedTags.some(tag => assetTags.some(at => at.includes(tag.toLowerCase()) || tag.toLowerCase().includes(at)))
      })
    : suggestions

  // Kuvan valinta + käyttöhistorian kirjaus
  const handleSelect = async (asset) => {
    try {
      fetch('/api/media/log-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaAssetId: asset.id,
          usageType,
          usageContext: usageContext || text?.substring(0, 100) || ''
        })
      }).catch(() => {})
    } catch {}

    if (onSelect) onSelect(asset)
    setPreviewAsset(null)
  }

  // Kuvan lataus puhelimeen
  const downloadImage = async (asset) => {
    try {
      const response = await fetch(asset.public_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = asset.file_name || 'kuva.jpg'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      // Fallback: avaa uudessa ikkunassa
      window.open(asset.public_url, '_blank')
    }
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
        <div className="flex gap-2">
          {suggestions.length > 0 && (
            <button
              onClick={() => setShowTagFilter(!showTagFilter)}
              className={`text-xs px-2 py-1 rounded ${showTagFilter ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              🏷️ Tägit{selectedTags.length > 0 && ` (${selectedTags.length})`}
            </button>
          )}
          <button
            onClick={fetchSuggestions}
            disabled={loading}
            className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? '⏳ Haetaan...' : '🔍 Hae kuvia'}
          </button>
        </div>
      </div>

      {/* Tägisuodatin */}
      {showTagFilter && allTags.length > 0 && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1.5">Suodata tägien mukaan:</div>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-amber-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs text-gray-400 hover:text-gray-600 mt-1.5 underline"
            >
              Tyhjennä valinnat
            </button>
          )}
        </div>
      )}

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
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-3">
            <img
              src={previewAsset.public_url}
              alt={previewAsset.description_fi || previewAsset.file_name}
              className="w-28 h-28 object-cover rounded"
            />
            <div className="flex-1 text-xs">
              <div className="font-medium text-gray-800 mb-1">{previewAsset.description_fi || previewAsset.file_name}</div>
              {previewAsset.tags && previewAsset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {previewAsset.tags.map((tag, i) => (
                    <span key={i} className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">{tag}</span>
                  ))}
                </div>
              )}
              {previewAsset.use_count > 0 && (
                <div className="text-gray-400 mb-1">Käytetty {previewAsset.use_count} kertaa</div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSelect(previewAsset)}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    selectedUrls.includes(previewAsset.public_url)
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  {selectedUrls.includes(previewAsset.public_url) ? '✓ Valittu' : 'Valitse'}
                </button>
                <button
                  onClick={() => downloadImage(previewAsset)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                >
                  📥 Lataa
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

      {filteredSuggestions.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {filteredSuggestions.map(asset => {
            const isSelected = selectedUrls.includes(asset.public_url)
            return (
              <div
                key={asset.id}
                onClick={() => setPreviewAsset(asset)}
                className={`relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-colors ${
                  isSelected
                    ? 'border-green-500'
                    : previewAsset?.id === asset.id
                      ? 'border-amber-500'
                      : 'border-transparent hover:border-amber-300'
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
                {/* Valittu-merkki */}
                {isSelected && (
                  <div className="absolute top-1 left-1 bg-green-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    ✓
                  </div>
                )}
                {/* Käyttökerrat */}
                {asset.use_count > 0 && (
                  <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full opacity-80">
                    {asset.use_count}x
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Valittujen tägien vaikutus tuloksiin */}
      {searched && selectedTags.length > 0 && filteredSuggestions.length === 0 && suggestions.length > 0 && (
        <div className="text-sm text-gray-400 py-2 text-center">
          Ei kuvia valituilla tägeillä. <button onClick={() => setSelectedTags([])} className="text-amber-600 underline">Näytä kaikki</button>
        </div>
      )}
    </div>
  )
}

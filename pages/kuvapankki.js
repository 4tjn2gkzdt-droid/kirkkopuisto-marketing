import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

const contentTypes = [
  { id: 'ruoka', name: 'Ruoka', icon: '🍽️' },
  { id: 'juoma', name: 'Juoma', icon: '🍹' },
  { id: 'tapahtuma', name: 'Tapahtuma', icon: '🎵' },
  { id: 'miljöö', name: 'Miljöö', icon: '🏡' },
  { id: 'ihmiset', name: 'Ihmiset', icon: '👥' },
  { id: 'livemusiikki', name: 'Livemusiikki', icon: '🎸' },
  { id: 'muu', name: 'Muu', icon: '📝' }
]

const moods = [
  { id: 'energinen', name: 'Energinen' },
  { id: 'rauhallinen', name: 'Rauhallinen' },
  { id: 'juhlava', name: 'Juhlava' },
  { id: 'arkinen', name: 'Arkinen' },
  { id: 'tunnelmallinen', name: 'Tunnelmallinen' },
  { id: 'rento', name: 'Rento' }
]

const seasons = [
  { id: 'kevät', name: 'Kevät' },
  { id: 'alkukesä', name: 'Alkukesä' },
  { id: 'keskikesä', name: 'Keskikesä' },
  { id: 'loppukesä', name: 'Loppukesä' },
  { id: 'yleinen', name: 'Yleinen' }
]

export default function MediaBank() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState([])
  const [totalCount, setTotalCount] = useState(0)

  // Upload
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [dragOver, setDragOver] = useState(false)

  // Filtterit
  const [filterContentType, setFilterContentType] = useState('all')
  const [filterMood, setFilterMood] = useState('all')
  const [filterSeason, setFilterSeason] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modaalit
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [editingTags, setEditingTags] = useState(false)
  const [editTags, setEditTags] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingAll, setAnalyzingAll] = useState(false)
  const [analyzeAllResult, setAnalyzeAllResult] = useState(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) loadAssets()
  }, [user, filterContentType, filterMood, filterSeason, searchQuery])

  const checkUser = async () => {
    if (!supabase) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    setLoading(false)
  }

  const loadAssets = async () => {
    if (!supabase) return

    let query = supabase
      .from('media_assets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filterContentType !== 'all') {
      query = query.eq('content_type', filterContentType)
    }
    if (filterMood !== 'all') {
      query = query.eq('mood', filterMood)
    }
    if (filterSeason !== 'all') {
      query = query.eq('season', filterSeason)
    }
    if (searchQuery.trim()) {
      // Hae tageista ja kuvauksesta
      const q = searchQuery.trim().toLowerCase()
      query = query.or(`description_fi.ilike.%${q}%,file_name.ilike.%${q}%`)
    }

    const { data, error, count } = await query.limit(100)

    if (!error && data) {
      // Jos on tekstihaku, suodata myös tagien perusteella client-side
      let filtered = data
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        filtered = data.filter(a =>
          (a.description_fi || '').toLowerCase().includes(q) ||
          (a.file_name || '').toLowerCase().includes(q) ||
          (a.tags || []).some(t => t.toLowerCase().includes(q))
        )
      }
      setAssets(filtered)
      setTotalCount(count || filtered.length)
    }
  }

  // Upload-toiminto
  const handleUpload = async (files) => {
    if (!supabase || !files || files.length === 0) return

    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })

    const uploadedFiles = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Tarkista tiedostotyyppi
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        continue
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      setUploadProgress({ current: i + 1, total: files.length })

      try {
        // Upload Supabase Storageen
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media-bank')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        // Hae julkinen URL
        const { data: urlData } = supabase.storage
          .from('media-bank')
          .getPublicUrl(fileName)

        uploadedFiles.push({
          storagePath: fileName,
          publicUrl: urlData.publicUrl,
          fileName: file.name,
          fileType: file.type.startsWith('image/') ? 'image' : 'video',
          fileSize: file.size
        })
      } catch (err) {
        console.error('Upload failed:', err)
      }
    }

    // Tallenna metadata tietokantaan
    if (uploadedFiles.length > 0) {
      try {
        const response = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: uploadedFiles })
        })

        const result = await response.json()

        if (result.success) {
          // Triggeröi AI-analyysi taustalla jokaiselle uudelle kuvalle
          for (const asset of result.assets) {
            if (asset.file_type === 'image') {
              fetch('/api/media/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: asset.id })
              }).then(() => {
                // Päivitä lista kun analyysi valmis
                loadAssets()
              }).catch(err => console.error('Analyysivirhe:', err))
            }
          }

          loadAssets()
        }
      } catch (err) {
        console.error('Metadata save error:', err)
        alert('Virhe tallennuksessa: ' + err.message)
      }
    }

    setUploading(false)
    setUploadProgress({ current: 0, total: 0 })
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    handleUpload(e.dataTransfer.files)
  }, [user])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleFileSelect = (e) => {
    handleUpload(e.target.files)
  }

  // Yksittäisen kuvan uudelleenanalyysi
  const reanalyzeAsset = async (assetId) => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/media/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId })
      })
      const result = await response.json()
      if (result.success) {
        setSelectedAsset(result.asset)
        loadAssets()
      } else {
        alert('Analyysivirhe: ' + (result.error || 'Tuntematon virhe'))
      }
    } catch (err) {
      alert('Virhe: ' + err.message)
    }
    setAnalyzing(false)
  }

  // Kaikkien analysoimattomien kuvien analyysi
  const analyzeAllUnanalyzed = async () => {
    setAnalyzingAll(true)
    setAnalyzeAllResult(null)
    try {
      const response = await fetch('/api/media/analyze-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      setAnalyzeAllResult(result)
      loadAssets()
    } catch (err) {
      alert('Virhe: ' + err.message)
    }
    setAnalyzingAll(false)
  }

  // Tagien muokkaus
  const saveTagEdits = async () => {
    if (!selectedAsset || !supabase) return

    const newTags = editTags.split(',').map(t => t.trim()).filter(t => t)

    const { error } = await supabase
      .from('media_assets')
      .update({ tags: newTags, updated_at: new Date().toISOString() })
      .eq('id', selectedAsset.id)

    if (!error) {
      setSelectedAsset({ ...selectedAsset, tags: newTags })
      setEditingTags(false)
      loadAssets()
    } else {
      alert('Virhe: ' + error.message)
    }
  }

  // Kuvan poisto
  const deleteAsset = async (asset) => {
    if (!confirm(`Poistetaanko "${asset.file_name}"?`)) return

    try {
      // Poista storagesta
      if (supabase) {
        await supabase.storage.from('media-bank').remove([asset.storage_path])
      }

      // Poista tietokannasta
      const { error } = await supabase
        .from('media_assets')
        .delete()
        .eq('id', asset.id)

      if (error) throw error

      setSelectedAsset(null)
      loadAssets()
    } catch (err) {
      alert('Poisto epäonnistui: ' + err.message)
    }
  }

  // URL:n kopiointi
  const copyUrl = (url) => {
    navigator.clipboard.writeText(url)
    alert('URL kopioitu leikepöydälle!')
  }

  const unanalyzedCount = assets.filter(a => !a.ai_analyzed).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Ladataan...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/">
                <button className="text-gray-500 hover:text-gray-700 text-sm">
                  ← Takaisin
                </button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">🖼️ Kuvapankki</h1>
              <span className="text-sm text-gray-500">{totalCount} tiedostoa</span>
            </div>
            <div className="flex items-center gap-2">
              {unanalyzedCount > 0 && (
                <button
                  onClick={analyzeAllUnanalyzed}
                  disabled={analyzingAll}
                  className="bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50"
                >
                  {analyzingAll ? '⏳ Analysoidaan...' : `🤖 Analysoi kaikki (${unanalyzedCount})`}
                </button>
              )}
              <label className="bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-700 text-sm cursor-pointer">
                📤 Lataa kuvia
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {analyzeAllResult && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              Analysoitu {analyzeAllResult.analyzed}/{analyzeAllResult.total} kuvaa.
              <button onClick={() => setAnalyzeAllResult(null)} className="ml-2 text-green-700 underline">Sulje</button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Upload-alue */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mb-6 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver ? 'border-amber-500 bg-amber-50' : 'border-gray-300 bg-white'
          }`}
        >
          {uploading ? (
            <div>
              <div className="text-lg font-semibold text-gray-700 mb-2">
                Ladataan... {uploadProgress.current}/{uploadProgress.total}
              </div>
              <div className="w-64 mx-auto bg-gray-200 rounded-full h-2">
                <div
                  className="bg-amber-600 h-2 rounded-full transition-all"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-2">📸</div>
              <div className="text-gray-600 font-medium">
                Raahaa kuvia tähän tai{' '}
                <label className="text-amber-600 hover:text-amber-700 cursor-pointer underline">
                  valitse tiedostot
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="text-gray-400 text-sm mt-1">
                Tuetut muodot: JPG, PNG, GIF, WEBP, MP4
              </div>
            </div>
          )}
        </div>

        {/* Filtterit */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Tekstihaku */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Hae kuvauksesta tai tageista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Content type */}
            <select
              value={filterContentType}
              onChange={(e) => setFilterContentType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Kaikki tyypit</option>
              {contentTypes.map(ct => (
                <option key={ct.id} value={ct.id}>{ct.icon} {ct.name}</option>
              ))}
            </select>

            {/* Mood */}
            <select
              value={filterMood}
              onChange={(e) => setFilterMood(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Kaikki tunnelmat</option>
              {moods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            {/* Season */}
            <select
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Kaikki kaudet</option>
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Reset */}
            {(filterContentType !== 'all' || filterMood !== 'all' || filterSeason !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setFilterContentType('all')
                  setFilterMood('all')
                  setFilterSeason('all')
                  setSearchQuery('')
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Tyhjennä
              </button>
            )}
          </div>
        </div>

        {/* Kuvagrid */}
        {assets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-4xl mb-3">📷</div>
            <div className="text-gray-600 font-medium">Ei kuvia</div>
            <div className="text-gray-400 text-sm mt-1">
              Lataa kuvia raahaamalla ne ylläolevaan alueeseen
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map(asset => (
              <div
                key={asset.id}
                onClick={() => {
                  setSelectedAsset(asset)
                  setEditingTags(false)
                }}
                className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="aspect-square relative overflow-hidden bg-gray-100">
                  {asset.file_type === 'image' ? (
                    <img
                      src={asset.public_url}
                      alt={asset.description_fi || asset.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-200">
                      🎬
                    </div>
                  )}

                  {/* AI-analysoitu badge */}
                  {!asset.ai_analyzed && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                      Ei analysoitu
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {asset.description_fi || asset.file_name}
                  </div>
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {asset.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                      {asset.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{asset.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kuvamodaali */}
      {selectedAsset && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedAsset(null) }}
        >
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col md:flex-row">
              {/* Kuva */}
              <div className="md:w-1/2 bg-gray-100">
                {selectedAsset.file_type === 'image' ? (
                  <img
                    src={selectedAsset.public_url}
                    alt={selectedAsset.description_fi || selectedAsset.file_name}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center text-6xl bg-gray-200">
                    🎬
                  </div>
                )}
              </div>

              {/* Metatiedot */}
              <div className="md:w-1/2 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Kuvan tiedot</h3>
                  <button
                    onClick={() => setSelectedAsset(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  {/* Tiedostonimi */}
                  <div>
                    <div className="text-gray-500 font-medium">Tiedosto</div>
                    <div className="text-gray-800">{selectedAsset.file_name}</div>
                    {selectedAsset.file_size && (
                      <div className="text-gray-400">{(selectedAsset.file_size / 1024 / 1024).toFixed(1)} MB</div>
                    )}
                  </div>

                  {/* Kuvaus */}
                  {selectedAsset.description_fi && (
                    <div>
                      <div className="text-gray-500 font-medium">Kuvaus</div>
                      <div className="text-gray-800">{selectedAsset.description_fi}</div>
                      {selectedAsset.description_en && (
                        <div className="text-gray-400 italic mt-1">{selectedAsset.description_en}</div>
                      )}
                    </div>
                  )}

                  {/* Tagit */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-500 font-medium">Tagit</div>
                      <button
                        onClick={() => {
                          setEditingTags(!editingTags)
                          setEditTags((selectedAsset.tags || []).join(', '))
                        }}
                        className="text-amber-600 hover:text-amber-700 text-xs"
                      >
                        {editingTags ? 'Peruuta' : 'Muokkaa'}
                      </button>
                    </div>
                    {editingTags ? (
                      <div className="mt-1">
                        <input
                          type="text"
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          placeholder="tagi1, tagi2, tagi3"
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                        <button
                          onClick={saveTagEdits}
                          className="mt-1 bg-amber-600 text-white px-3 py-1 rounded text-xs hover:bg-amber-700"
                        >
                          Tallenna
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(selectedAsset.tags || []).map((tag, i) => (
                          <span key={i} className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                        {(!selectedAsset.tags || selectedAsset.tags.length === 0) && (
                          <span className="text-gray-400">Ei tageja</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-3">
                    {selectedAsset.content_type && (
                      <div>
                        <div className="text-gray-500 font-medium">Tyyppi</div>
                        <div className="text-gray-800 capitalize">{selectedAsset.content_type}</div>
                      </div>
                    )}
                    {selectedAsset.mood && (
                      <div>
                        <div className="text-gray-500 font-medium">Tunnelma</div>
                        <div className="text-gray-800 capitalize">{selectedAsset.mood}</div>
                      </div>
                    )}
                    {selectedAsset.season && (
                      <div>
                        <div className="text-gray-500 font-medium">Kausi</div>
                        <div className="text-gray-800 capitalize">{selectedAsset.season}</div>
                      </div>
                    )}
                    {selectedAsset.colors && selectedAsset.colors.length > 0 && (
                      <div>
                        <div className="text-gray-500 font-medium">Värit</div>
                        <div className="text-gray-800">{selectedAsset.colors.join(', ')}</div>
                      </div>
                    )}
                  </div>

                  {/* AI-status */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${selectedAsset.ai_analyzed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="text-gray-600 text-xs">
                        {selectedAsset.ai_analyzed ? 'AI-analysoitu' : 'Ei analysoitu'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toiminnot */}
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    onClick={() => copyUrl(selectedAsset.public_url)}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
                  >
                    📋 Kopioi URL
                  </button>
                  <button
                    onClick={() => reanalyzeAsset(selectedAsset.id)}
                    disabled={analyzing}
                    className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                  >
                    {analyzing ? '⏳ Analysoidaan...' : '🤖 Analysoi uudelleen'}
                  </button>
                  <button
                    onClick={() => deleteAsset(selectedAsset)}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-700"
                  >
                    🗑️ Poista
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

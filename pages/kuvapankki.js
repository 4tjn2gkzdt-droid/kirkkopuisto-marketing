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
  const [recentUploadIds, setRecentUploadIds] = useState([])
  const [showUploadNotification, setShowUploadNotification] = useState(false)

  // Filtterit
  const [filterContentType, setFilterContentType] = useState('all')
  const [filterMood, setFilterMood] = useState('all')
  const [filterSeason, setFilterSeason] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [allTags, setAllTags] = useState([])

  // Modaalit
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [editingTags, setEditingTags] = useState(false)
  const [editTags, setEditTags] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingAll, setAnalyzingAll] = useState(false)
  const [analyzeAllResult, setAnalyzeAllResult] = useState(null)

  // Ideoi somepäivitys
  const [showIdeaModal, setShowIdeaModal] = useState(false)
  const [ideaPlatform, setIdeaPlatform] = useState('instagram')
  const [ideaContext, setIdeaContext] = useState('')
  const [ideaResults, setIdeaResults] = useState(null)
  const [generatingIdea, setGeneratingIdea] = useState(false)

  // Somepäivityksen luominen kuvapankista
  const [showCreatePostForm, setShowCreatePostForm] = useState(false)
  const [createPostData, setCreatePostData] = useState({
    caption: '',
    date: '',
    time: '12:00',
    channels: ['instagram'],
    mediaLinks: []
  })
  const [savingPost, setSavingPost] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadAssets()
      loadAllTags()
    }
  }, [user, filterContentType, filterMood, filterSeason, searchQuery, selectedTags])

  const checkUser = async () => {
    if (!supabase) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    setLoading(false)
  }

  // Hae kaikki uniikit tagit ja niiden määrät
  const loadAllTags = async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('media_assets')
      .select('tags')
      .eq('ai_analyzed', true)

    if (data) {
      const tagCounts = {}
      data.forEach(row => {
        (row.tags || []).forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      })
      const sorted = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
      setAllTags(sorted)
    }
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
      const q = searchQuery.trim().toLowerCase()
      query = query.or(`description_fi.ilike.%${q}%,description_en.ilike.%${q}%,file_name.ilike.%${q}%,mood.ilike.%${q}%,content_type.ilike.%${q}%`)
    }
    // Tägifiltterit (Supabase array contains)
    if (selectedTags.length > 0) {
      query = query.contains('tags', selectedTags)
    }

    const { data, error, count } = await query.limit(100)

    if (!error && data) {
      // Client-side tarkistus tageista (hakutermit)
      let filtered = data
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        filtered = data.filter(a =>
          (a.description_fi || '').toLowerCase().includes(q) ||
          (a.description_en || '').toLowerCase().includes(q) ||
          (a.file_name || '').toLowerCase().includes(q) ||
          (a.mood || '').toLowerCase().includes(q) ||
          (a.content_type || '').toLowerCase().includes(q) ||
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

      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        continue
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      setUploadProgress({ current: i + 1, total: files.length })

      try {
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

    if (uploadedFiles.length > 0) {
      try {
        const response = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: uploadedFiles })
        })

        const result = await response.json()

        if (result.success) {
          const newIds = result.assets.map(a => a.id)
          setRecentUploadIds(newIds)

          // Triggeröi AI-analyysi taustalla
          let analyzedCount = 0
          for (const asset of result.assets) {
            if (asset.file_type === 'image') {
              fetch('/api/media/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: asset.id })
              }).then(() => {
                analyzedCount++
                loadAssets()
                loadAllTags()
                // Näytä notifikaatio kun kaikki analysoitu
                if (analyzedCount >= result.assets.filter(a => a.file_type === 'image').length) {
                  setShowUploadNotification(true)
                }
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
        loadAllTags()
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
      loadAllTags()
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
      loadAllTags()
    } else {
      alert('Virhe: ' + error.message)
    }
  }

  // Kuvan poisto
  const deleteAsset = async (asset) => {
    if (!confirm(`Poistetaanko "${asset.file_name}"?`)) return

    try {
      if (supabase) {
        await supabase.storage.from('media-bank').remove([asset.storage_path])
      }

      const { error } = await supabase
        .from('media_assets')
        .delete()
        .eq('id', asset.id)

      if (error) throw error

      setSelectedAsset(null)
      loadAssets()
      loadAllTags()
    } catch (err) {
      alert('Poisto epäonnistui: ' + err.message)
    }
  }

  // URL:n kopiointi
  const copyUrl = (url) => {
    navigator.clipboard.writeText(url)
    alert('URL kopioitu leikepöydälle!')
  }

  // Tägien valinta
  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  // Ideoi somepäivitys kuvasta
  const generatePostIdea = async () => {
    if (!selectedAsset) return
    setGeneratingIdea(true)
    setIdeaResults(null)

    try {
      const response = await fetch('/api/media/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaAssetId: selectedAsset.id,
          platform: ideaPlatform,
          context: ideaContext
        })
      })
      const result = await response.json()
      if (result.success) {
        setIdeaResults(result.suggestions)
      } else {
        alert('Virhe: ' + (result.error || 'Tuntematon virhe'))
      }
    } catch (err) {
      alert('Virhe: ' + err.message)
    }
    setGeneratingIdea(false)
  }

  // Somepäivityksen tallennus kalenteriin
  const savePostToCalendar = async () => {
    if (!createPostData.caption.trim()) {
      alert('Kirjoita tekstisisältö')
      return
    }
    if (!createPostData.date) {
      alert('Valitse päivämäärä')
      return
    }

    setSavingPost(true)
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .insert({
          caption: createPostData.caption,
          date: createPostData.date,
          time: createPostData.time || '12:00',
          channels: createPostData.channels,
          media_links: createPostData.mediaLinks,
          status: 'idea',
          user_id: user.id
        })

      if (error) throw error

      alert('Somepäivitys lisätty kalenteriin!')
      setShowCreatePostForm(false)
      setCreatePostData({ caption: '', date: '', time: '12:00', channels: ['instagram'], mediaLinks: [] })
    } catch (err) {
      alert('Virhe tallennuksessa: ' + err.message)
    }
    setSavingPost(false)
  }

  // Avaa somepäivityksen luomislomake ehdotuksesta
  const openCreatePostFromSuggestion = (suggestion) => {
    const fullText = suggestion.text + (suggestion.hashtags ? '\n\n' + suggestion.hashtags : '')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    setCreatePostData({
      caption: fullText,
      date: dateStr,
      time: suggestion.best_time ? suggestion.best_time.replace('.', ':').substring(0, 5) : '12:00',
      channels: [ideaPlatform === 'general' ? 'instagram' : ideaPlatform],
      mediaLinks: selectedAsset ? [selectedAsset.public_url] : []
    })
    setShowCreatePostForm(true)
  }

  const unanalyzedCount = assets.filter(a => !a.ai_analyzed).length
  const activeFilters = (filterContentType !== 'all' ? 1 : 0) +
    (filterMood !== 'all' ? 1 : 0) +
    (filterSeason !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    selectedTags.length

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

          {/* Upload-notifikaatio */}
          {showUploadNotification && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm flex items-center justify-between">
              <span>Uudet kuvat analysoitu! Haluatko ideoida somepäivityksen näistä kuvista?</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const recentAsset = assets.find(a => recentUploadIds.includes(a.id))
                    if (recentAsset) {
                      setSelectedAsset(recentAsset)
                      setShowIdeaModal(true)
                    }
                    setShowUploadNotification(false)
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                >
                  Ideoi
                </button>
                <button onClick={() => setShowUploadNotification(false)} className="text-blue-700 underline text-xs">
                  Sulje
                </button>
              </div>
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

        {/* Tägipilvi */}
        {allTags.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Tagit</span>
              {selectedTags.length > 0 && (
                <button onClick={() => setSelectedTags([])} className="text-xs text-gray-500 hover:text-gray-700 underline">
                  Tyhjennä tagivalinnat
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.slice(0, 30).map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag} ({count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filtterit */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Tekstihaku */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Hae kuvauksesta, tageista, tunnelmasta..."
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
            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setFilterContentType('all')
                  setFilterMood('all')
                  setFilterSeason('all')
                  setSearchQuery('')
                  setSelectedTags([])
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Tyhjennä ({activeFilters})
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
                  setShowIdeaModal(false)
                  setIdeaResults(null)
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

                  {!asset.ai_analyzed && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                      Ei analysoitu
                    </div>
                  )}

                  {/* Käyttökerrat */}
                  {asset.use_count > 0 && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {asset.use_count}x
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
          onClick={(e) => { if (e.target === e.currentTarget) { setSelectedAsset(null); setShowIdeaModal(false); setIdeaResults(null) } }}
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
                    onClick={() => { setSelectedAsset(null); setShowIdeaModal(false); setIdeaResults(null) }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {!showIdeaModal ? (
                  <>
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

                      {/* Käyttöhistoria */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-gray-500 font-medium">Käyttökerrat</div>
                          <div className="text-gray-800">{selectedAsset.use_count || 0}</div>
                        </div>
                        {selectedAsset.last_used_at && (
                          <div>
                            <div className="text-gray-500 font-medium">Viimeksi käytetty</div>
                            <div className="text-gray-800">
                              {new Date(selectedAsset.last_used_at).toLocaleDateString('fi-FI')}
                            </div>
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
                        onClick={() => {
                          setShowIdeaModal(true)
                          setIdeaResults(null)
                          setIdeaContext('')
                        }}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"
                      >
                        📱 Ideoi somepäivitys
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
                  </>
                ) : (
                  /* Ideoi somepäivitys -näkymä */
                  <div className="space-y-4">
                    <button
                      onClick={() => { setShowIdeaModal(false); setIdeaResults(null) }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← Takaisin kuvan tietoihin
                    </button>

                    <h4 className="font-semibold text-gray-800">📱 Ideoi somepäivitys tästä kuvasta</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alusta</label>
                      <div className="flex gap-2">
                        {[
                          { id: 'instagram', label: 'Instagram' },
                          { id: 'facebook', label: 'Facebook' },
                          { id: 'general', label: 'Yleinen' }
                        ].map(p => (
                          <button
                            key={p.id}
                            onClick={() => setIdeaPlatform(p.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              ideaPlatform === p.id
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lisäkonteksti (valinnainen)</label>
                      <input
                        type="text"
                        value={ideaContext}
                        onChange={(e) => setIdeaContext(e.target.value)}
                        placeholder="Esim. 'juhannustapahtumasta', 'uusi menu-annos'..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    <button
                      onClick={generatePostIdea}
                      disabled={generatingIdea}
                      className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                      {generatingIdea ? '🤖 Generoidaan...' : '✨ Generoi ehdotukset'}
                    </button>

                    {/* Ehdotukset */}
                    {ideaResults && !showCreatePostForm && (
                      <div className="space-y-3 mt-4">
                        <h5 className="font-medium text-gray-700 text-sm">Ehdotukset:</h5>
                        {ideaResults.map((suggestion, i) => (
                          <div key={i} className="border border-gray-200 rounded-lg p-3 hover:border-green-300 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-green-700">{suggestion.style}</span>
                              {suggestion.best_time && (
                                <span className="text-xs text-gray-400">Paras aika: {suggestion.best_time}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{suggestion.text}</p>
                            {suggestion.hashtags && (
                              <p className="text-xs text-blue-600 mt-1">{suggestion.hashtags}</p>
                            )}
                            <div className="mt-2 flex gap-3">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    suggestion.text + (suggestion.hashtags ? '\n\n' + suggestion.hashtags : '')
                                  )
                                  alert('Teksti kopioitu!')
                                }}
                                className="text-xs text-green-600 hover:text-green-700 underline"
                              >
                                Kopioi teksti
                              </button>
                              <button
                                onClick={() => openCreatePostFromSuggestion(suggestion)}
                                className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded hover:bg-amber-700"
                              >
                                Tee somepäivitys
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Somepäivityksen luomislomake */}
                    {showCreatePostForm && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-gray-800">Luo somepäivitys kalenteriin</h5>
                          <button
                            onClick={() => setShowCreatePostForm(false)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            ← Takaisin ehdotuksiin
                          </button>
                        </div>

                        {/* Kuvan esikatselu */}
                        {createPostData.mediaLinks.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Kuva</label>
                            <img
                              src={createPostData.mediaLinks[0]}
                              alt="Valittu kuva"
                              className="w-20 h-20 object-cover rounded-lg border"
                            />
                          </div>
                        )}

                        {/* Teksti */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tekstisisältö</label>
                          <textarea
                            value={createPostData.caption}
                            onChange={(e) => setCreatePostData(prev => ({ ...prev, caption: e.target.value }))}
                            rows={5}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>

                        {/* Päivämäärä ja kellonaika */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Päivämäärä</label>
                            <input
                              type="date"
                              value={createPostData.date}
                              onChange={(e) => setCreatePostData(prev => ({ ...prev, date: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kellonaika</label>
                            <input
                              type="time"
                              value={createPostData.time}
                              onChange={(e) => setCreatePostData(prev => ({ ...prev, time: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                        </div>

                        {/* Kanavat */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Kanavat</label>
                          <div className="flex gap-2">
                            {[
                              { id: 'instagram', label: 'Instagram' },
                              { id: 'facebook', label: 'Facebook' },
                              { id: 'tiktok', label: 'TikTok' }
                            ].map(ch => (
                              <button
                                key={ch.id}
                                onClick={() => {
                                  setCreatePostData(prev => ({
                                    ...prev,
                                    channels: prev.channels.includes(ch.id)
                                      ? prev.channels.filter(c => c !== ch.id)
                                      : [...prev.channels, ch.id]
                                  }))
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  createPostData.channels.includes(ch.id)
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {ch.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tallenna */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={savePostToCalendar}
                            disabled={savingPost}
                            className="flex-1 bg-amber-600 text-white py-2 rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 text-sm"
                          >
                            {savingPost ? 'Tallennetaan...' : 'Tallenna kalenteriin'}
                          </button>
                          <button
                            onClick={() => setShowCreatePostForm(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                          >
                            Peruuta
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

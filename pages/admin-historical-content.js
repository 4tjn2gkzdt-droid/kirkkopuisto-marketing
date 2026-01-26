import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function AdminHistoricalContent() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [contents, setContents] = useState([])
  const [filter, setFilter] = useState('all')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'news',
    title: '',
    content: '',
    summary: '',
    publishDate: '',
    year: new Date().getFullYear(),
    url: ''
  })
  const [editingId, setEditingId] = useState(null)

  // URL import state
  const [showUrlImport, setShowUrlImport] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [fetchedContent, setFetchedContent] = useState([])
  const [isFetching, setIsFetching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Meta sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [showSyncModal, setShowSyncModal] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadContents()
    }
  }, [user, filter])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Tarkista admin-oikeudet
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      alert('Vain admin-käyttäjillä on pääsy tälle sivulle')
      router.push('/')
      return
    }

    setUser(user)
    setUserProfile(profile)
    setLoading(false)
  }

  const loadContents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.append('types', filter)
      }
      params.append('limit', '100')
      params.append('isActive', 'true')

      const response = await fetch(`/api/brainstorm/historical-content?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.content) {
        setContents(data.content)
      }
    } catch (error) {
      console.error('Error loading contents:', error)
      alert('Virhe sisältöjen latauksessa: ' + error.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title || !formData.content) {
      alert('Otsikko ja sisältö ovat pakollisia')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const url = editingId
        ? '/api/brainstorm/historical-content'
        : '/api/brainstorm/historical-content'

      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingId ? { id: editingId, ...formData } : formData)
      })

      const data = await response.json()

      if (data.success) {
        alert(editingId ? 'Sisältö päivitetty!' : 'Sisältö lisätty!')
        setShowForm(false)
        resetForm()
        loadContents()
      } else {
        alert('Virhe: ' + (data.error || 'Tuntematon virhe'))
      }
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Virhe: ' + error.message)
    }
  }

  const handleEdit = (content) => {
    setFormData({
      type: content.type,
      title: content.title,
      content: content.content,
      summary: content.summary || '',
      publishDate: content.publish_date || '',
      year: content.year || new Date().getFullYear(),
      url: content.url || ''
    })
    setEditingId(content.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Haluatko varmasti poistaa tämän sisällön?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`/api/brainstorm/historical-content?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        alert('Sisältö poistettu!')
        loadContents()
      } else {
        alert('Virhe: ' + (data.error || 'Poisto epäonnistui'))
      }
    } catch (error) {
      console.error('Error deleting content:', error)
      alert('Virhe: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'news',
      title: '',
      content: '',
      summary: '',
      publishDate: '',
      year: new Date().getFullYear(),
      url: ''
    })
    setEditingId(null)
  }

  const handleFetchUrls = async () => {
    const urls = urlInput
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)

    if (urls.length === 0) {
      alert('Syötä vähintään yksi URL')
      return
    }

    if (urls.length > 10) {
      alert('Voit hakea maksimissaan 10 URL:ia kerralla')
      return
    }

    setIsFetching(true)
    setFetchedContent([])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/fetch-url-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ urls, saveToDatabase: false })
      })

      const data = await response.json()

      if (data.success) {
        const successful = data.results.filter(r => r.success)
        const failed = data.results.filter(r => !r.success)

        if (successful.length > 0) {
          setFetchedContent(successful.map(r => r.data))
        }

        if (failed.length > 0) {
          alert(`Onnistui: ${successful.length}, Epäonnistui: ${failed.length}\n\nEpäonnistuneet:\n${failed.map(f => `${f.url}: ${f.error}`).join('\n')}`)
        } else {
          alert(`Haettu onnistuneesti ${successful.length} sisältöä!`)
        }
      } else {
        alert('Virhe sisällön hakemisessa: ' + (data.error || 'Tuntematon virhe'))
      }
    } catch (error) {
      console.error('Error fetching URLs:', error)
      alert('Virhe: ' + error.message)
    } finally {
      setIsFetching(false)
    }
  }

  const handleSaveFetchedContent = async () => {
    if (fetchedContent.length === 0) {
      alert('Ei sisältöä tallennettavaksi')
      return
    }

    setIsSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/brainstorm/historical-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bulk: true,
          items: fetchedContent.map(item => ({
            type: item.type,
            title: item.title,
            content: item.content,
            summary: item.summary,
            url: item.url,
            publish_date: item.publish_date,
            year: item.year,
            metadata: item.metadata
          }))
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(`Tallennettu ${fetchedContent.length} sisältöä!`)
        setShowUrlImport(false)
        setUrlInput('')
        setFetchedContent([])
        loadContents()
      } else {
        alert('Virhe tallennuksessa: ' + (data.error || 'Tuntematon virhe'))
      }
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Virhe: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveFetchedItem = (index) => {
    setFetchedContent(fetchedContent.filter((_, i) => i !== index))
  }

  const handleEditFetchedItem = (index, field, value) => {
    const updated = [...fetchedContent]
    updated[index] = { ...updated[index], [field]: value }
    setFetchedContent(updated)
  }

  const handleMetaSync = async (sources = ['instagram', 'facebook']) => {
    setIsSyncing(true)
    setSyncResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/sync-social-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sources: sources,
          limit: 50,
          saveToDatabase: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setSyncResult(data)
        alert(`Synkronointi onnistui!\n\nHaettu:\n- Instagram: ${data.fetched.instagram}\n- Facebook: ${data.fetched.facebook}\n\nTallennettu: ${data.saved?.count || 0} uutta postausta`)
        loadContents()
      } else {
        alert('Virhe synkronoinnissa: ' + (data.error || data.message || 'Tuntematon virhe'))
        setSyncResult(data)
      }
    } catch (error) {
      console.error('Error syncing Meta data:', error)
      alert('Virhe: ' + error.message)
    } finally {
      setIsSyncing(false)
    }
  }

  const typeLabels = {
    news: 'Uutinen',
    newsletter: 'Uutiskirje',
    article: 'Artikkeli',
    social_post: 'Somepostaus',
    campaign: 'Kampanja'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Ladataan...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="text-purple-600 hover:text-purple-700">
                ← Takaisin adminiin
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                📚 Historiallinen sisältö
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  resetForm()
                  setShowForm(true)
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                ➕ Lisää sisältö
              </button>
              <button
                onClick={() => {
                  setUrlInput('')
                  setFetchedContent([])
                  setShowUrlImport(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                🔗 Lisää URL-linkeistä
              </button>
              <button
                onClick={() => setShowSyncModal(true)}
                disabled={isSyncing}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
              >
                {isSyncing ? '⏳ Synkronoi...' : '📱 Synkronoi Meta'}
              </button>
              <div className="text-sm text-gray-600">
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Historiallinen sisältö</h3>
          <p className="text-sm text-blue-800">
            Tämä sisältö on käytettävissä ideointisivulla AI-kontekstina. Lisää tänne aikaisempien vuosien uutisia, uutiskirjeitä ja muuta sisältöä, jotta AI voi hyödyntää niitä inspiraationa.
          </p>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Kaikki ({contents.length})
          </button>
          {Object.entries(typeLabels).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg ${
                filter === type ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contents List */}
        <div className="space-y-4">
          {contents.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500">Ei sisältöä. Lisää ensimmäinen sisältö yllä olevalla painikkeella.</p>
            </div>
          ) : (
            contents.map((content) => (
              <div key={content.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {typeLabels[content.type]}
                      </span>
                      {content.year && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {content.year}
                        </span>
                      )}
                      {content.publish_date && (
                        <span className="text-xs text-gray-500">
                          {new Date(content.publish_date).toLocaleDateString('fi-FI')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {content.title}
                    </h3>
                    {content.summary && (
                      <p className="text-sm text-gray-600 mb-2">
                        {content.summary}
                      </p>
                    )}
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {content.content}
                    </p>
                    {content.url && (
                      <a
                        href={content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                      >
                        🔗 {content.url}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(content)}
                      className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded hover:bg-blue-50"
                    >
                      ✏️ Muokkaa
                    </button>
                    <button
                      onClick={() => handleDelete(content.id)}
                      className="text-sm text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50"
                    >
                      🗑️ Poista
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full my-8">
            <h3 className="text-lg font-bold mb-4">
              {editingId ? '✏️ Muokkaa sisältöä' : '➕ Lisää uusi sisältö'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Tyyppi *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    {Object.entries(typeLabels).map(([type, label]) => (
                      <option key={type} value={type}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Vuosi</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="2000"
                    max="2030"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Otsikko *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Esim: Kesän 2024 jazzfestivaali - menestys"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Yhteenveto (lyhyt kuvaus)</label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Lyhyt yhteenveto sisällöstä..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Sisältö *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={8}
                  placeholder="Koko sisältö (uutinen, uutiskirje, artikkeli...)"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Julkaisupäivä</label>
                  <input
                    type="date"
                    value={formData.publishDate}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">URL (linkki alkuperäiseen)</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  💾 {editingId ? 'Päivitä' : 'Tallenna'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-semibold"
                >
                  Peruuta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* URL Import Modal */}
      {showUrlImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              🔗 Lisää sisältöä URL-linkeistä
            </h3>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Ohje:</strong> Syötä URL-linkit uutisiin tai uutiskirjeisiin (yksi per rivi).
                Järjestelmä hakee automaattisesti otsikot ja sisällön. Voit hakea maksimissaan 10 linkkiä kerralla.
              </p>
            </div>

            {fetchedContent.length === 0 ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">
                    URL-linkit (yksi per rivi)
                  </label>
                  <textarea
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    rows={10}
                    placeholder={'https://example.com/uutinen-1\nhttps://example.com/uutinen-2\nhttps://example.com/uutiskirje-1'}
                    disabled={isFetching}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleFetchUrls}
                    disabled={isFetching}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isFetching ? '⏳ Haetaan...' : '🔍 Hae sisältö'}
                  </button>
                  <button
                    onClick={() => {
                      setShowUrlImport(false)
                      setUrlInput('')
                      setFetchedContent([])
                    }}
                    disabled={isFetching}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-semibold disabled:bg-gray-200 disabled:cursor-not-allowed"
                  >
                    Peruuta
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-900">
                      Haetut sisällöt ({fetchedContent.length})
                    </h4>
                    <button
                      onClick={() => {
                        setFetchedContent([])
                        setUrlInput('')
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      ← Takaisin URL-syöttöön
                    </button>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {fetchedContent.map((item, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-2">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {typeLabels[item.type] || item.type}
                            </span>
                            {item.year && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {item.year}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveFetchedItem(index)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            🗑️ Poista
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Otsikko
                            </label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleEditFetchedItem(index, 'title', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Yhteenveto
                            </label>
                            <textarea
                              value={item.summary}
                              onChange={(e) => handleEditFetchedItem(index, 'summary', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              rows={2}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Sisältö (pituus: {item.content.length} merkkiä)
                            </label>
                            <textarea
                              value={item.content}
                              onChange={(e) => handleEditFetchedItem(index, 'content', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                              rows={4}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Tyyppi
                              </label>
                              <select
                                value={item.type}
                                onChange={(e) => handleEditFetchedItem(index, 'type', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                {Object.entries(typeLabels).map(([type, label]) => (
                                  <option key={type} value={type}>{label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Vuosi
                              </label>
                              <input
                                type="number"
                                value={item.year || ''}
                                onChange={(e) => handleEditFetchedItem(index, 'year', parseInt(e.target.value) || null)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                min="2000"
                                max="2030"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Alkuperäinen URL
                            </label>
                            <input
                              type="text"
                              value={item.url}
                              readOnly
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-100"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSaveFetchedContent}
                    disabled={isSaving}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSaving ? '⏳ Tallennetaan...' : `💾 Tallenna kaikki (${fetchedContent.length})`}
                  </button>
                  <button
                    onClick={() => {
                      setShowUrlImport(false)
                      setUrlInput('')
                      setFetchedContent([])
                    }}
                    disabled={isSaving}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-semibold disabled:bg-gray-200 disabled:cursor-not-allowed"
                  >
                    Peruuta
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Meta Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-bold mb-4">
              📱 Synkronoi Instagram & Facebook
            </h3>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Tämä toiminto hakee:</strong>
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside mt-2">
                <li>Instagram Business -tilin 50 viimeisintä postausta</li>
                <li>Facebook-sivun 50 viimeisintä postausta</li>
                <li>Tallentaa ne automaattisesti historialliseen sisältöön</li>
                <li>Ei tallenna duplikaatteja (tarkistaa ID:n perusteella)</li>
              </ul>
            </div>

            {syncResult && (
              <div className={`border rounded-lg p-4 mb-4 ${
                syncResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm font-semibold mb-2 ${
                  syncResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {syncResult.success ? '✅ Synkronointi onnistui!' : '❌ Virhe synkronoinnissa'}
                </p>
                {syncResult.fetched && (
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>Haettu yhteensä: {syncResult.fetched.total} postausta</p>
                    <p>- Instagram: {syncResult.fetched.instagram}</p>
                    <p>- Facebook: {syncResult.fetched.facebook}</p>
                    {syncResult.saved && (
                      <p className="font-semibold mt-2">
                        Tallennettu: {syncResult.saved.count} uutta postausta
                      </p>
                    )}
                    {syncResult.saved?.message && (
                      <p className="text-xs text-gray-600 mt-1">{syncResult.saved.message}</p>
                    )}
                  </div>
                )}
                {syncResult.errors && (
                  <div className="text-sm text-red-700 mt-2">
                    <p className="font-semibold">Virheet:</p>
                    {syncResult.errors.map((err, i) => (
                      <p key={i}>- {err.source}: {err.error}</p>
                    ))}
                  </div>
                )}
                {syncResult.error && (
                  <p className="text-sm text-red-700 mt-2">{syncResult.error}</p>
                )}
                {syncResult.message && (
                  <p className="text-sm text-red-700 mt-2">{syncResult.message}</p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => handleMetaSync(['instagram', 'facebook'])}
                disabled={isSyncing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSyncing ? '⏳ Synkronoidaan...' : '📱 Synkronoi molemmat (Instagram + Facebook)'}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleMetaSync(['instagram'])}
                  disabled={isSyncing}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSyncing ? '⏳' : '📷 Vain Instagram'}
                </button>
                <button
                  onClick={() => handleMetaSync(['facebook'])}
                  disabled={isSyncing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSyncing ? '⏳' : '📘 Vain Facebook'}
                </button>
              </div>

              <button
                onClick={() => {
                  setShowSyncModal(false)
                  setSyncResult(null)
                }}
                disabled={isSyncing}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-semibold disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                Sulje
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>
                💡 <strong>Huom:</strong> Varmista että Meta Graph API on konfiguroitu .env.local-tiedostossa.
                Katso ohjeet: <code className="bg-gray-100 px-1">META_SETUP.md</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

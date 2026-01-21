import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function SomeAIDebug() {
  // Estä pääsy production-ympäristössä
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">🚫 Ei käytettävissä</h1>
          <p className="text-gray-600 mb-4">Debug-sivut eivät ole käytettävissä production-ympäristössä.</p>
          <a href="/" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block">
            ← Takaisin etusivulle
          </a>
        </div>
      </div>
    );
  }

  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [debugData, setDebugData] = useState(null)
  const [expandedSteps, setExpandedSteps] = useState({})

  useEffect(() => {
    checkUser()
    // Aseta oletusaikavä li: tästä päivästä 30 päivää eteenpäin
    const today = new Date()
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    setStartDate(today.toISOString().split('T')[0])
    setEndDate(in30Days.toISOString().split('T')[0])
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    setLoading(false)
  }

  const handleAnalyze = async () => {
    if (!startDate || !endDate) {
      alert('Valitse aikaväli')
      return
    }

    setAnalyzing(true)
    setDebugData(null)

    try {
      const response = await fetch('/api/content-calendar-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate
        })
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      console.log('Response headers:', response.headers)

      let data
      const contentType = response.headers.get('content-type')

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        // Ei JSON, lue teksti
        const text = await response.text()
        console.error('Non-JSON response:', text)
        data = {
          success: false,
          error: 'API palautti ei-JSON vastauksen',
          debugInfo: {
            errors: [{
              location: 'response parsing',
              error: {
                status: response.status,
                statusText: response.statusText,
                contentType: contentType,
                responseText: text.substring(0, 500)
              }
            }]
          }
        }
      }

      if (!response.ok && !data.debugInfo) {
        // HTTP virhe mutta ei debug-infoa
        data.debugInfo = {
          errors: [{
            location: 'HTTP response',
            error: {
              status: response.status,
              statusText: response.statusText,
              message: data.error || 'Unknown error'
            }
          }]
        }
      }

      setDebugData(data)

    } catch (error) {
      console.error('Error analyzing calendar:', error)
      console.error('Error stack:', error.stack)
      setDebugData({
        success: false,
        error: error.message,
        debugInfo: {
          errors: [{
            location: 'fetch exception',
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack,
              toString: error.toString()
            }
          }]
        }
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const toggleStep = (index) => {
    setExpandedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Ladataan...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/sisaltokalenteri" className="text-green-400 hover:text-green-300">
                ← Takaisin SOME-AI:hin
              </Link>
              <h1 className="text-2xl font-bold text-white">
                🐛 SOME-AI Debug
              </h1>
            </div>
            <div className="text-sm text-gray-400">
              {user?.email}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ohjeet */}
        <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-200 mb-2">🐛 Debug-tila</h3>
          <p className="text-sm text-yellow-100 mb-2">
            Tämä sivu näyttää yksityiskohtaisesti kaikki vaiheet joita SOME-AI käy läpi.
            Käytä tätä selvittääksesi miksi AI-ehdotukset eivät toimi.
          </p>
          <p className="text-xs text-yellow-200">
            ⏱️ Huom: Analyysi voi kestää 30-60 sekuntia. Odota rauhassa!
          </p>
        </div>

        {/* Aikavälin valinta */}
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Valitse aikaväli</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Aloituspäivä
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lopetuspäivä
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition ${
              analyzing
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {analyzing ? '🐛 Debugataan...' : '🔍 Aja debug-analyysi'}
          </button>
        </div>

        {/* Debug tulokset */}
        {debugData && (
          <div className="space-y-6">
            {/* Status */}
            <div className={`rounded-lg shadow-sm p-6 border-2 ${
              debugData.success
                ? 'bg-green-900 border-green-700'
                : 'bg-red-900 border-red-700'
            }`}>
              <h3 className="text-xl font-semibold mb-2">
                {debugData.success ? '✅ Onnistui' : '❌ Epäonnistui'}
              </h3>
              {debugData.message && (
                <p className="text-sm">{debugData.message}</p>
              )}
              {debugData.error && (
                <p className="text-sm font-mono bg-black bg-opacity-30 p-2 rounded mt-2">
                  {debugData.error}
                </p>
              )}
            </div>

            {/* Virheet */}
            {debugData.debugInfo?.errors && debugData.debugInfo.errors.length > 0 && (
              <div className="bg-red-900 border-2 border-red-700 rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-semibold mb-4 text-red-200">🚨 Virheet ({debugData.debugInfo.errors.length})</h3>
                <div className="space-y-4">
                  {debugData.debugInfo.errors.map((err, idx) => (
                    <div key={idx} className="bg-black bg-opacity-30 p-4 rounded border border-red-800">
                      <div className="font-semibold text-red-300 mb-2">
                        Sijainti: {err.location}
                      </div>
                      <pre className="text-xs overflow-x-auto text-red-100">
                        {JSON.stringify(err.error, null, 2)}
                      </pre>
                      {err.attemptedToParse && (
                        <div className="mt-3">
                          <div className="text-sm text-red-300 mb-1">Yritettiin parsia:</div>
                          <pre className="text-xs overflow-x-auto bg-black bg-opacity-50 p-2 rounded text-red-100">
                            {err.attemptedToParse}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Varoitukset */}
            {debugData.debugInfo?.warnings && debugData.debugInfo.warnings.length > 0 && (
              <div className="bg-yellow-900 border-2 border-yellow-700 rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-semibold mb-4 text-yellow-200">⚠️ Varoitukset ({debugData.debugInfo.warnings.length})</h3>
                <ul className="list-disc list-inside space-y-2">
                  {debugData.debugInfo.warnings.map((warning, idx) => (
                    <li key={idx} className="text-yellow-100">{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Vaiheet */}
            {debugData.debugInfo?.steps && debugData.debugInfo.steps.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-semibold mb-4">📋 Suoritusvaiheet ({debugData.debugInfo.steps.length})</h3>
                <div className="space-y-2">
                  {debugData.debugInfo.steps.map((step, idx) => (
                    <div key={idx} className="border border-gray-600 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleStep(idx)}
                        className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-left flex items-center justify-between transition"
                      >
                        <span className="font-medium">
                          Vaihe {step.step}: {step.name}
                        </span>
                        <span className="text-gray-400">
                          {expandedSteps[idx] ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedSteps[idx] && step.data && (
                        <div className="p-4 bg-black bg-opacity-30">
                          <pre className="text-xs overflow-x-auto text-gray-300">
                            {JSON.stringify(step.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI-ehdotukset */}
            {debugData.aiSuggestions && debugData.aiSuggestions.length > 0 && (
              <div className="bg-purple-900 border-2 border-purple-700 rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-semibold mb-4 text-purple-200">
                  ✨ AI-ehdotukset ({debugData.aiSuggestions.length})
                </h3>
                <div className="space-y-3">
                  {debugData.aiSuggestions.map((suggestion, idx) => (
                    <div key={idx} className="bg-black bg-opacity-30 p-4 rounded border border-purple-800">
                      <div className="font-semibold text-purple-200 mb-2">
                        {suggestion.type} - {suggestion.date}
                      </div>
                      <div className="text-sm text-purple-100 mb-2">
                        {suggestion.channel} | {suggestion.priority}
                      </div>
                      <div className="text-sm text-purple-100 mb-3">
                        {suggestion.reason}
                      </div>
                      {suggestion.captions && (
                        <div className="space-y-2">
                          <div className="text-xs text-purple-300">
                            📝 Lyhyt: {suggestion.captions.short?.substring(0, 100)}...
                          </div>
                          <div className="text-xs text-purple-300">
                            📄 Keskipitkä: {suggestion.captions.medium?.substring(0, 100)}...
                          </div>
                          <div className="text-xs text-purple-300">
                            📜 Pitkä: {suggestion.captions.long?.substring(0, 100)}...
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON dump */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold mb-4">📦 Koko vastaus (JSON)</h3>
              <pre className="text-xs overflow-x-auto bg-black bg-opacity-50 p-4 rounded text-gray-300">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

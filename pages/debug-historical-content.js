import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js'

export default function DebugHistoricalContent() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [testResults, setTestResults] = useState([])
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    setUser(user)
    setSession(session)
    setLoading(false)
  }

  const addTestResult = (test, success, message, details = null) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      message,
      details,
      timestamp: new Date().toLocaleTimeString('fi-FI')
    }])
  }

  const runTests = async () => {
    setIsRunning(true)
    setTestResults([])

    // Test 1: Tarkista käyttäjä ja sessio
    addTestResult(
      'Käyttäjän autentikaatio',
      true,
      `Käyttäjä: ${user.email}`,
      {
        userId: user.id,
        email: user.email,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token
      }
    )

    // Test 2: Testaa anonyymi Supabase-client (kuten nykyinen koodissa)
    try {
      const testData = {
        type: 'article',
        title: 'Test - Anonyymi client',
        content: 'Testi sisältö anonymilla clientilla',
        summary: 'Tämä on testi',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('historical_content')
        .insert([testData])
        .select()

      if (error) {
        addTestResult(
          'INSERT anonyymillä clientilla',
          false,
          'EPÄONNISTUI - Tämä on ongelma!',
          {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          }
        )
      } else {
        addTestResult(
          'INSERT anonyymillä clientilla',
          true,
          'Onnistui (ei pitäisi onnistua)',
          { data }
        )
      }
    } catch (error) {
      addTestResult(
        'INSERT anonyymillä clientilla',
        false,
        'VIRHE: ' + error.message,
        { error: error.toString() }
      )
    }

    // Test 3: Testaa käyttäjäkohtaisella clientilla (OIKEA TAPA)
    try {
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        }
      )

      const testData = {
        type: 'article',
        title: 'Test - Käyttäjäkohtainen client',
        content: 'Testi sisältö käyttäjäkohtaisella clientilla',
        summary: 'Tämä on testi',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await userSupabase
        .from('historical_content')
        .insert([testData])
        .select()

      if (error) {
        addTestResult(
          'INSERT käyttäjäkohtaisella clientilla',
          false,
          'EPÄONNISTUI',
          {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          }
        )
      } else {
        addTestResult(
          'INSERT käyttäjäkohtaisella clientilla',
          true,
          'ONNISTUI! Tämä on oikea tapa.',
          { insertedId: data[0]?.id }
        )
      }
    } catch (error) {
      addTestResult(
        'INSERT käyttäjäkohtaisella clientilla',
        false,
        'VIRHE: ' + error.message,
        { error: error.toString() }
      )
    }

    // Test 4: Testaa API-reitin kautta (bulk insert)
    try {
      const response = await fetch('/api/brainstorm/historical-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          bulk: true,
          items: [{
            type: 'article',
            title: 'Test - API bulk insert',
            content: 'Testi sisältö API:n kautta',
            summary: 'API testi',
            publish_date: new Date().toISOString(),
            year: 2024,
            url: 'https://test.com',
            metadata: {}
          }]
        })
      })

      const data = await response.json()

      if (data.success) {
        addTestResult(
          'API bulk INSERT',
          true,
          'ONNISTUI',
          { savedCount: data.count, ids: data.content?.map(c => c.id) }
        )
      } else {
        addTestResult(
          'API bulk INSERT',
          false,
          'EPÄONNISTUI - Tämä on ongelma URL-importissa!',
          {
            error: data.error,
            status: response.status
          }
        )
      }
    } catch (error) {
      addTestResult(
        'API bulk INSERT',
        false,
        'VIRHE: ' + error.message,
        { error: error.toString() }
      )
    }

    // Test 5: Tarkista RLS-politiikat
    try {
      const { data, error } = await supabase.rpc('get_policies_for_table', {
        table_name: 'historical_content'
      })

      if (error) {
        addTestResult(
          'RLS-politiikat',
          false,
          'Ei voitu hakea (ei haittaa)',
          { note: 'Tämä funktio ei välttämättä ole olemassa' }
        )
      } else {
        addTestResult(
          'RLS-politiikat',
          true,
          'Haettu onnistuneesti',
          { policies: data }
        )
      }
    } catch (error) {
      addTestResult(
        'RLS-politiikat',
        false,
        'Funktio ei ole käytettävissä',
        { note: 'Tämä on normaalia' }
      )
    }

    // Test 6: Testaa lukeminen
    try {
      const { data, error } = await supabase
        .from('historical_content')
        .select('id, title, type, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        addTestResult(
          'SELECT-kysely',
          false,
          'EPÄONNISTUI',
          { error: error.message }
        )
      } else {
        addTestResult(
          'SELECT-kysely',
          true,
          `Löydettiin ${data.length} sisältöä`,
          {
            count: data.length,
            latestTitles: data.map(d => d.title).slice(0, 3)
          }
        )
      }
    } catch (error) {
      addTestResult(
        'SELECT-kysely',
        false,
        'VIRHE: ' + error.message,
        { error: error.toString() }
      )
    }

    setIsRunning(false)
  }

  const cleanupTestData = async () => {
    if (!confirm('Poistetaanko kaikki "Test - " alkuiset testisisällöt?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Käytetään API-reittiä poistamiseen
      const { data: allContent } = await supabase
        .from('historical_content')
        .select('id, title')
        .ilike('title', 'Test -%')

      if (allContent && allContent.length > 0) {
        for (const item of allContent) {
          await fetch(`/api/brainstorm/historical-content?id=${item.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
        }
        alert(`Poistettu ${allContent.length} testisisältöä`)
      } else {
        alert('Ei testisisältöä poistettavaksi')
      }
    } catch (error) {
      alert('Virhe siivouksessa: ' + error.message)
    }
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
              <Link href="/admin" className="text-purple-400 hover:text-purple-300">
                ← Takaisin adminiin
              </Link>
              <h1 className="text-2xl font-bold text-white">
                🐛 Debug: Historical Content RLS
              </h1>
            </div>
            <div className="text-sm text-gray-400">
              {user?.email}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info */}
        <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-200 mb-2">⚠️ Ongelman kuvaus</h3>
          <p className="text-sm text-yellow-100 mb-2">
            Kun lisäät historiallista sisältöä URL-linkkien kautta, saat virheen:
          </p>
          <code className="block bg-yellow-950 text-yellow-200 p-3 rounded text-sm font-mono">
            Virhe tallennuksessa: new row violates row-level security policy for table "historical_content"
          </code>
          <p className="text-sm text-yellow-100 mt-3">
            <strong>Syy:</strong> API-reitti <code className="bg-yellow-950 px-1">/api/brainstorm/historical-content</code> käyttää
            globaalia anonyymia Supabase-clientia, joka ei tiedä käyttäjän tokenista. RLS-politiikat vaativat
            että <code className="bg-yellow-950 px-1">auth.role() = 'authenticated'</code>.
          </p>
        </div>

        {/* Käyttäjän tiedot */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">👤 Käyttäjän tiedot</h3>
          <div className="space-y-2 text-sm font-mono">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400">User ID:</span>
                <div className="text-green-400">{user?.id}</div>
              </div>
              <div>
                <span className="text-gray-400">Email:</span>
                <div className="text-green-400">{user?.email}</div>
              </div>
              <div>
                <span className="text-gray-400">Has Session:</span>
                <div className={session ? 'text-green-400' : 'text-red-400'}>
                  {session ? '✅ Kyllä' : '❌ Ei'}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Has Access Token:</span>
                <div className={session?.access_token ? 'text-green-400' : 'text-red-400'}>
                  {session?.access_token ? '✅ Kyllä' : '❌ Ei'}
                </div>
              </div>
            </div>
            {session?.access_token && (
              <div className="mt-4">
                <span className="text-gray-400">Access Token (first 50 chars):</span>
                <div className="text-xs text-blue-400 break-all">
                  {session.access_token.substring(0, 50)}...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">🧪 Testit</h3>
          <p className="text-sm text-gray-400 mb-4">
            Nämä testit simuloivat eri tapoja lisätä sisältöä tietokantaan ja paljastavat ongelman.
          </p>
          <div className="flex gap-3">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isRunning ? '⏳ Suoritetaan testejä...' : '▶️ Suorita kaikki testit'}
            </button>
            <button
              onClick={cleanupTestData}
              disabled={isRunning}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              🗑️ Siivoa testidatat
            </button>
            <button
              onClick={() => setTestResults([])}
              disabled={isRunning}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              🧹 Tyhjennä tulokset
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">📊 Testitulokset</h3>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    result.success
                      ? 'bg-green-900 border-green-700'
                      : 'bg-red-900 border-red-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-white">
                        {result.success ? '✅' : '❌'} {result.test}
                      </h4>
                      <p className="text-sm text-gray-300 mt-1">{result.message}</p>
                    </div>
                    <span className="text-xs text-gray-400">{result.timestamp}</span>
                  </div>

                  {result.details && (
                    <details className="mt-3">
                      <summary className="text-sm text-gray-300 cursor-pointer hover:text-white">
                        📋 Näytä yksityiskohdat
                      </summary>
                      <pre className="mt-2 bg-gray-950 text-gray-300 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solution */}
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-200 mb-3">💡 Ratkaisu</h3>
          <div className="text-sm text-blue-100 space-y-2">
            <p>
              <strong>Ongelma:</strong> <code className="bg-blue-950 px-1">/api/brainstorm/historical-content.js</code> käyttää
              globaalia anonyymia Supabase-clientia bulk-inserteissä.
            </p>
            <p>
              <strong>Korjaus:</strong> API-reitin pitää luoda käyttäjäkohtainen Supabase-client käyttäen
              käyttäjän access tokenia. Tämä varmistaa että RLS-politiikat toimivat oikein.
            </p>
            <p className="mt-3">
              <strong>Koodimuutos tarvitaan tiedostoon:</strong>
            </p>
            <code className="block bg-blue-950 p-3 rounded mt-2 font-mono text-xs">
              /pages/api/brainstorm/historical-content.js
            </code>
            <p className="mt-3">
              Muutos: Luo käyttäjäkohtainen Supabase client tokenilla ennen INSERT-operaatioita.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

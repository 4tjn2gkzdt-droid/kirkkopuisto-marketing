import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function ContentAlerts() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [summary, setSummary] = useState({ total: 0, high: 0, medium: 0, low: 0 })
  const [filterSeverity, setFilterSeverity] = useState('all') // all, high, medium, low

  useEffect(() => {
    checkUser()
    loadAlerts()
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

  const loadAlerts = async () => {
    setRefreshing(true)

    try {
      const response = await fetch('/api/content-alerts')
      const data = await response.json()

      if (data.success) {
        setAlerts(data.alerts || [])
        setSummary(data.summary || { total: 0, high: 0, medium: 0, low: 0 })
      } else {
        alert('Virhe haettaessa hälytyksiä: ' + (data.error || 'Tuntematon virhe'))
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
      alert('Virhe haettaessa hälytyksiä: ' + error.message)
    } finally {
      setRefreshing(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'border-red-500 bg-red-50'
      case 'medium':
        return 'border-yellow-500 bg-yellow-50'
      case 'low':
        return 'border-blue-500 bg-blue-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return '🔴'
      case 'medium':
        return '🟡'
      case 'low':
        return '🔵'
      default:
        return '⚪'
    }
  }

  const getSeverityText = (severity) => {
    switch (severity) {
      case 'high':
        return 'Kiireellinen'
      case 'medium':
        return 'Keskitärkeä'
      case 'low':
        return 'Matala'
      default:
        return 'Normaali'
    }
  }

  const filteredAlerts = filterSeverity === 'all'
    ? alerts
    : alerts.filter(a => a.severity === filterSeverity)

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
              <Link href="/" className="text-green-600 hover:text-green-700">
                ← Takaisin
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                🔔 Sisältömuistutukset
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAlerts}
                disabled={refreshing}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100"
              >
                {refreshing ? '⏳ Päivitetään...' : '🔄 Päivitä'}
              </button>
              <div className="text-sm text-gray-600">
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ohjeet */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">🤖 Automaattiset muistutukset</h3>
          <p className="text-sm text-blue-800">
            Järjestelmä analysoi automaattisesti sisältökalenterisi ja muistuttaa puutteista:
            viikko-ohjelmat, tehtävät ilman sisältöä, kanavien hiljaisuus ja tulevat tapahtumat.
          </p>
        </div>

        {/* Yhteenveto */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div
            className={`bg-white rounded-lg shadow-sm p-6 cursor-pointer transition ${
              filterSeverity === 'all' ? 'ring-2 ring-green-500' : 'hover:shadow-md'
            }`}
            onClick={() => setFilterSeverity('all')}
          >
            <div className="text-4xl font-bold text-gray-900">{summary.total}</div>
            <div className="text-sm text-gray-600">Yhteensä hälytyksiä</div>
          </div>

          <div
            className={`bg-white rounded-lg shadow-sm p-6 cursor-pointer transition ${
              filterSeverity === 'high' ? 'ring-2 ring-red-500' : 'hover:shadow-md'
            }`}
            onClick={() => setFilterSeverity('high')}
          >
            <div className="text-4xl font-bold text-red-600">{summary.high}</div>
            <div className="text-sm text-gray-600">🔴 Kiireellisiä</div>
          </div>

          <div
            className={`bg-white rounded-lg shadow-sm p-6 cursor-pointer transition ${
              filterSeverity === 'medium' ? 'ring-2 ring-yellow-500' : 'hover:shadow-md'
            }`}
            onClick={() => setFilterSeverity('medium')}
          >
            <div className="text-4xl font-bold text-yellow-600">{summary.medium}</div>
            <div className="text-sm text-gray-600">🟡 Keskitärkeitä</div>
          </div>

          <div
            className={`bg-white rounded-lg shadow-sm p-6 cursor-pointer transition ${
              filterSeverity === 'low' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
            }`}
            onClick={() => setFilterSeverity('low')}
          >
            <div className="text-4xl font-bold text-blue-600">{summary.low}</div>
            <div className="text-sm text-gray-600">🔵 Matalia</div>
          </div>
        </div>

        {/* Hälytykset */}
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Hienoa! Ei hälytyksiä
            </h3>
            <p className="text-gray-600">
              {filterSeverity === 'all'
                ? 'Sisältökalenterisi on hyvässä kunnossa.'
                : `Ei ${getSeverityText(filterSeverity).toLowerCase()}ia hälytyksiä.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert, index) => (
              <div
                key={index}
                className={`border-l-4 rounded-lg shadow-sm p-6 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getSeverityIcon(alert.severity)}</span>
                      <span className="text-xs font-bold px-2 py-1 rounded bg-white bg-opacity-70">
                        {getSeverityText(alert.severity)}
                      </span>
                      {alert.type && (
                        <span className="text-xs text-gray-600">
                          {alert.type}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {alert.title}
                    </h3>

                    <p className="text-gray-700 mb-4">
                      {alert.description}
                    </p>

                    {alert.date && (
                      <p className="text-sm text-gray-600 mb-2">
                        📅 {new Date(alert.date).toLocaleDateString('fi-FI', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </p>
                    )}

                    {alert.actionLink && (
                      <Link href={alert.actionLink}>
                        <button className="mt-2 px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-semibold transition shadow-sm">
                          {alert.actionText || 'Toimenpide'}
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nopeat toiminnot */}
        {filteredAlerts.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">⚡ Nopeat toiminnot</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Link href="/mallit">
                <button className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition">
                  📝 Mallit
                </button>
              </Link>
              <Link href="/copilot">
                <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
                  🤖 Co-Pilot
                </button>
              </Link>
              <Link href="/sisaltokalenteri">
                <button className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition">
                  📅 Kalenteri
                </button>
              </Link>
              <Link href="/">
                <button className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition">
                  ➕ Lisää tapahtuma
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

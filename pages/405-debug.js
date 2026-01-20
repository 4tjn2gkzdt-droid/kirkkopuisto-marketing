import { useState } from 'react'

export default function Debug405Page() {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState({})

  const testEndpoint = async (endpoint, name) => {
    setLoading(prev => ({ ...prev, [name]: true }))

    try {
      console.log(`Testing ${endpoint}...`)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' })
      })

      const data = await response.json()

      setResults(prev => ({
        ...prev,
        [name]: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: {
            'content-type': response.headers.get('content-type'),
            'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          },
          data
        }
      }))
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [name]: {
          error: error.message,
          stack: error.stack
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }))
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1>🔍 405 Error Debug Page</h1>
      <p>Testaa eri API-endpointteja nähdäksesi mikä toimii ja mikä ei.</p>

      <div style={{ display: 'grid', gap: '20px', marginTop: '30px' }}>
        {/* Simple Test */}
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h3>1. Simple Test (manuaaliset CORS-headerit)</h3>
          <button
            onClick={() => testEndpoint('/api/simple-test', 'simple')}
            disabled={loading.simple}
            style={{
              padding: '10px 20px',
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {loading.simple ? 'Testataan...' : 'Testaa /api/simple-test'}
          </button>

          {results.simple && (
            <pre style={{
              marginTop: '15px',
              padding: '15px',
              background: results.simple.ok ? '#dcfce7' : '#fee2e2',
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {JSON.stringify(results.simple, null, 2)}
            </pre>
          )}
        </div>

        {/* Debug Newsletter */}
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h3>2. Debug Newsletter (CORS wrapper)</h3>
          <button
            onClick={() => testEndpoint('/api/debug-newsletter', 'debug')}
            disabled={loading.debug}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {loading.debug ? 'Testataan...' : 'Testaa /api/debug-newsletter'}
          </button>

          {results.debug && (
            <pre style={{
              marginTop: '15px',
              padding: '15px',
              background: results.debug.ok ? '#dcfce7' : '#fee2e2',
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {JSON.stringify(results.debug, null, 2)}
            </pre>
          )}
        </div>

        {/* Actual Newsletter Endpoint */}
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h3>3. Oikea Newsletter Endpoint</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            HUOM: Tämä epäonnistuu koska ei ole event ID:itä, mutta näemme saadaanko 405 vai jokin muu virhe
          </p>
          <button
            onClick={() => testEndpoint('/api/generate-newsletter', 'newsletter')}
            disabled={loading.newsletter}
            style={{
              padding: '10px 20px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {loading.newsletter ? 'Testataan...' : 'Testaa /api/generate-newsletter'}
          </button>

          {results.newsletter && (
            <pre style={{
              marginTop: '15px',
              padding: '15px',
              background: results.newsletter.status === 405 ? '#fef3c7' : (results.newsletter.ok ? '#dcfce7' : '#fee2e2'),
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {JSON.stringify(results.newsletter, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <div style={{
        marginTop: '40px',
        padding: '20px',
        background: '#f0f9ff',
        borderRadius: '8px',
        border: '1px solid #0ea5e9'
      }}>
        <h3>📋 Mitä tarkkailla:</h3>
        <ul>
          <li><strong>Status 200</strong> = Toimii ✅</li>
          <li><strong>Status 405</strong> = Method Not Allowed ❌</li>
          <li><strong>Status 400</strong> = Bad Request (mutta endpoint toimii!) ⚠️</li>
          <li><strong>Status 500</strong> = Server Error 💥</li>
        </ul>
        <p style={{ marginTop: '15px', fontSize: '14px' }}>
          Avaa myös selaimen Developer Tools &gt; Network -välilehti nähdäksesi
          OPTIONS preflight -pyynnöt!
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'

export default function TestAPI() {
  const [results, setResults] = useState([])

  const addResult = (test, status, data) => {
    setResults(prev => [...prev, { test, status, data, time: new Date().toLocaleTimeString() }])
  }

  const testGET = async () => {
    try {
      const response = await fetch('/api/test-405')
      const data = await response.json()
      addResult('GET /api/test-405', response.status, data)
    } catch (error) {
      addResult('GET /api/test-405', 'ERROR', error.message)
    }
  }

  const testPOST = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }]
        })
      })
      const data = await response.json()
      addResult('POST /api/chat', response.status, data)
    } catch (error) {
      addResult('POST /api/chat', 'ERROR', error.message)
    }
  }

  const testOPTIONS = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      addResult('OPTIONS /api/chat', response.status, {
        headers: Object.fromEntries(response.headers.entries())
      })
    } catch (error) {
      addResult('OPTIONS /api/chat', 'ERROR', error.message)
    }
  }

  const testNewsletter = async () => {
    try {
      const response = await fetch('/api/generate-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedEventIds: [1],
          tone: 'casual',
          sendEmails: false
        })
      })
      const data = await response.json()
      addResult('POST /api/generate-newsletter', response.status, data)
    } catch (error) {
      addResult('POST /api/generate-newsletter', 'ERROR', error.message)
    }
  }

  const testNewsletterMinimal = async () => {
    try {
      const response = await fetch('/api/test-newsletter-minimal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedEventIds: [1],
          tone: 'casual'
        })
      })
      const data = await response.json()
      addResult('POST /api/test-newsletter-minimal', response.status, data)
    } catch (error) {
      addResult('POST /api/test-newsletter-minimal', 'ERROR', error.message)
    }
  }

  const clearResults = () => setResults([])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API Test Tool</h1>
      <p>Tämä sivu testaa API-reittejä ja näyttää tulokset.</p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={testGET} style={buttonStyle}>
          Test GET
        </button>
        <button onClick={testOPTIONS} style={buttonStyle}>
          Test OPTIONS
        </button>
        <button onClick={testPOST} style={buttonStyle}>
          Test POST /chat
        </button>
        <button onClick={testNewsletter} style={buttonStyle}>
          Test POST /newsletter
        </button>
        <button onClick={testNewsletterMinimal} style={{ ...buttonStyle, background: '#f59e0b' }}>
          🔍 Debug Newsletter (Step-by-Step)
        </button>
        <button onClick={clearResults} style={{ ...buttonStyle, background: '#ef4444' }}>
          Clear Results
        </button>
      </div>

      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <h2>Results:</h2>
        {results.length === 0 ? (
          <p style={{ color: '#666' }}>Ei vielä tuloksia. Klikkaa testejä yllä.</p>
        ) : (
          results.map((result, index) => (
            <div
              key={index}
              style={{
                background: 'white',
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '5px',
                borderLeft: `4px solid ${result.status === 200 ? '#22c55e' : result.status === 'ERROR' ? '#ef4444' : '#f59e0b'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong>{result.test}</strong>
                <span style={{ color: '#666', fontSize: '12px' }}>{result.time}</span>
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: result.status === 200 ? '#22c55e' : result.status === 'ERROR' ? '#ef4444' : '#f59e0b'
              }}>
                Status: {result.status}
              </div>
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', color: '#2563eb' }}>Show details</summary>
                <pre style={{
                  background: '#f9fafb',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                  marginTop: '5px'
                }}>
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '30px', background: '#eff6ff', padding: '20px', borderRadius: '8px' }}>
        <h3>Mitä etsiä:</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>Status 200</strong> = OK ✅</li>
          <li><strong>Status 405</strong> = Method Not Allowed ❌ (tämä on ongelma)</li>
          <li><strong>Status 500</strong> = Server error (eri ongelma)</li>
          <li><strong>ERROR</strong> = Network/CORS error ❌</li>
        </ul>
        <p style={{ marginTop: '15px', color: '#1e40af' }}>
          <strong>Jos näet 405:</strong> Kerro minulle mikä testi antoi 405-virheen
        </p>
      </div>
    </div>
  )
}

const buttonStyle = {
  padding: '12px 20px',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600'
}

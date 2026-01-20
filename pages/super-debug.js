import { useState, useEffect } from 'react'

export default function SuperDebugPage() {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState({})
  const [consoleLog, setConsoleLog] = useState([])
  const [selectedEventIds, setSelectedEventIds] = useState([1, 2, 3]) // Test IDs

  useEffect(() => {
    // Lisää aikaleima konsoliin
    addLog('🚀 Debug-sivu ladattu', 'info')
  }, [])

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('fi-FI', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
    setConsoleLog(prev => [...prev, { timestamp, message, type }])
  }

  const testEndpoint = async (endpoint, name, options = {}) => {
    const testId = `${name}-${Date.now()}`
    setLoading(prev => ({ ...prev, [name]: true }))
    addLog(`🔍 Aloitetaan testi: ${endpoint}`, 'info')

    const startTime = performance.now()

    try {
      // Luo pyyntö
      const fetchOptions = {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
      }

      addLog(`📤 Lähetetään ${fetchOptions.method}-pyyntö...`, 'info')
      addLog(`📝 Headers: ${JSON.stringify(fetchOptions.headers, null, 2)}`, 'debug')
      if (fetchOptions.body) {
        addLog(`📦 Body: ${fetchOptions.body}`, 'debug')
      }

      const response = await fetch(endpoint, fetchOptions)

      const endTime = performance.now()
      const duration = (endTime - startTime).toFixed(2)

      addLog(`⏱️ Vastaus saatu ${duration}ms:ssa`, 'info')
      addLog(`📊 Status: ${response.status} ${response.statusText}`,
        response.ok ? 'success' : 'error')

      // Kerää kaikki headerit
      const responseHeaders = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      addLog(`📥 Response headers: ${JSON.stringify(responseHeaders, null, 2)}`, 'debug')

      // Hae vastauksen teksti
      const responseText = await response.text()
      addLog(`📄 Response size: ${responseText.length} bytes`, 'debug')

      // Yritä parsea JSON
      let data
      let isJson = false
      let parseError = null

      try {
        data = JSON.parse(responseText)
        isJson = true
        addLog(`✅ JSON-parsinta onnistui`, 'success')
      } catch (e) {
        parseError = e.message
        addLog(`❌ JSON-parsinta epäonnistui: ${e.message}`, 'error')

        // Analysoi vastaus
        const isHtml = responseText.includes('<!DOCTYPE') || responseText.includes('<html')
        const isXml = responseText.includes('<?xml')

        data = {
          __raw_response__: responseText.substring(0, 500),
          __full_length__: responseText.length,
          __parse_error__: parseError,
          __content_type_analysis__: {
            isHtml,
            isXml,
            isPlainText: !isHtml && !isXml,
            actualContentType: response.headers.get('content-type')
          }
        }
      }

      // Tallenna tulos
      const result = {
        testId,
        endpoint,
        duration: `${duration}ms`,
        request: {
          method: fetchOptions.method,
          url: endpoint,
          headers: fetchOptions.headers,
          body: options.body,
          bodySize: fetchOptions.body ? new Blob([fetchOptions.body]).size : 0
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: responseHeaders,
          isJson,
          parseError,
          data
        },
        analysis: {
          isCorsError: response.status === 0,
          is405Error: response.status === 405,
          is500Error: response.status === 500,
          is400Error: response.status === 400,
          hasCorsProblem: !responseHeaders['access-control-allow-origin'],
          contentTypeMismatch: responseHeaders['content-type'] &&
            !responseHeaders['content-type'].includes('application/json') &&
            isJson === false
        }
      }

      setResults(prev => ({ ...prev, [name]: result }))

      // Lopullinen yhteenveto
      if (response.ok) {
        addLog(`✅ Testi onnistui: ${endpoint}`, 'success')
      } else {
        addLog(`❌ Testi epäonnistui: ${response.status} ${response.statusText}`, 'error')
      }

    } catch (error) {
      const endTime = performance.now()
      const duration = (endTime - startTime).toFixed(2)

      addLog(`💥 Verkkovirhe: ${error.message}`, 'error')
      addLog(`Stack: ${error.stack}`, 'error')

      setResults(prev => ({
        ...prev,
        [name]: {
          testId,
          endpoint,
          duration: `${duration}ms`,
          error: error.message,
          errorType: error.name,
          stack: error.stack,
          analysis: {
            isNetworkError: error.message.includes('fetch'),
            isCorsBlocked: error.message.includes('CORS'),
            isTimeout: error.message.includes('timeout'),
          }
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }))
      addLog(`🏁 Testi päättyi: ${name}`, 'info')
      addLog('─'.repeat(80), 'separator')
    }
  }

  const runAllTests = async () => {
    setConsoleLog([])
    addLog('🎯 Aloitetaan kaikki testit', 'info')
    addLog('═'.repeat(80), 'separator')

    // Test 1: OPTIONS preflight
    await testEndpoint('/api/super-debug', 'preflight', { method: 'OPTIONS' })
    await new Promise(r => setTimeout(r, 500))

    // Test 2: Simple GET
    await testEndpoint('/api/super-debug', 'get', { method: 'GET' })
    await new Promise(r => setTimeout(r, 500))

    // Test 3: Simple POST
    await testEndpoint('/api/super-debug', 'post', {
      method: 'POST',
      body: { test: 'data', timestamp: new Date().toISOString() }
    })
    await new Promise(r => setTimeout(r, 500))

    // Test 4: Newsletter API OPTIONS
    await testEndpoint('/api/newsletter', 'newsletter-preflight', { method: 'OPTIONS' })
    await new Promise(r => setTimeout(r, 500))

    // Test 5: Newsletter API POST (ilman dataa - pitäisi antaa 400)
    await testEndpoint('/api/newsletter', 'newsletter-no-data', {
      method: 'POST',
      body: {}
    })
    await new Promise(r => setTimeout(r, 500))

    // Test 6: Newsletter API POST (test datalla)
    await testEndpoint('/api/newsletter', 'newsletter-with-data', {
      method: 'POST',
      body: {
        selectedEventIds,
        tone: 'casual',
        sendEmails: false
      }
    })

    addLog('✅ Kaikki testit suoritettu', 'success')
  }

  const clearResults = () => {
    setResults({})
    setConsoleLog([])
    addLog('🗑️ Tulokset tyhjennetty', 'info')
  }

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return '#dc2626'
      case 'success': return '#16a34a'
      case 'debug': return '#6b7280'
      case 'separator': return '#d1d5db'
      default: return '#1f2937'
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
        color: 'white',
        padding: '30px 20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700 }}>
            🔥 Super Debug Tool
          </h1>
          <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>
            Kattava diagnostiikkatyökalu API-ongelmien selvittämiseen
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>

        {/* Control Panel */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px' }}>🎮 Testipaneeli</h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Test Event IDs:
            </label>
            <input
              type="text"
              value={selectedEventIds.join(',')}
              onChange={(e) => setSelectedEventIds(e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)))}
              placeholder="1,2,3"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
              Pilkulla erotetut event ID:t testaamista varten
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={runAllTests}
              disabled={Object.values(loading).some(Boolean)}
              style={{
                padding: '12px 24px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: Object.values(loading).some(Boolean) ? 'not-allowed' : 'pointer',
                opacity: Object.values(loading).some(Boolean) ? 0.6 : 1
              }}
            >
              {Object.values(loading).some(Boolean) ? '⏳ Testataan...' : '🚀 Aja kaikki testit'}
            </button>

            <button
              onClick={() => testEndpoint('/api/super-debug', 'quick-test', {
                method: 'POST',
                body: { quick: true }
              })}
              disabled={loading['quick-test']}
              style={{
                padding: '12px 24px',
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading['quick-test'] ? 'not-allowed' : 'pointer'
              }}
            >
              ⚡ Pika-testi
            </button>

            <button
              onClick={() => testEndpoint('/api/newsletter', 'newsletter-test', {
                method: 'POST',
                body: { selectedEventIds, tone: 'casual', sendEmails: false }
              })}
              disabled={loading['newsletter-test']}
              style={{
                padding: '12px 24px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading['newsletter-test'] ? 'not-allowed' : 'pointer'
              }}
            >
              📧 Testaa Newsletter API
            </button>

            <button
              onClick={clearResults}
              style={{
                padding: '12px 24px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🗑️ Tyhjennä
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* Console Log */}
          <div style={{
            background: '#1f2937',
            borderRadius: '12px',
            padding: '20px',
            color: '#f9fafb',
            height: '600px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #374151'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>📜 Console Log</h3>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>
                {consoleLog.length} tapahtumaa
              </span>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '12px',
              lineHeight: '1.6'
            }}>
              {consoleLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                  Ei lokitapahtumia. Aja testejä nähdäksesi tuloksia.
                </div>
              ) : (
                consoleLog.map((log, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: log.type === 'separator' ? '8px' : '4px',
                      color: getLogColor(log.type),
                      opacity: log.type === 'separator' ? 0.3 : 1
                    }}
                  >
                    {log.type !== 'separator' && (
                      <span style={{ opacity: 0.5, marginRight: '8px' }}>
                        {log.timestamp}
                      </span>
                    )}
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Test Results */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            height: '600px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>
              📊 Testien tulokset ({Object.keys(results).length})
            </h3>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {Object.keys(results).length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6b7280'
                }}>
                  Ei tuloksia. Aja testejä.
                </div>
              ) : (
                Object.entries(results).map(([name, result]) => (
                  <div
                    key={name}
                    style={{
                      marginBottom: '16px',
                      padding: '16px',
                      background: result.error ? '#fee2e2' :
                        result.response?.ok ? '#dcfce7' : '#fef3c7',
                      borderRadius: '8px',
                      border: `2px solid ${
                        result.error ? '#dc2626' :
                        result.response?.ok ? '#16a34a' : '#d97706'
                      }`
                    }}
                  >
                    <div style={{
                      fontWeight: 700,
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{name}</span>
                      <span style={{ fontSize: '12px', opacity: 0.7 }}>
                        {result.duration}
                      </span>
                    </div>

                    {result.error ? (
                      <div>
                        <div style={{
                          fontSize: '14px',
                          color: '#dc2626',
                          marginBottom: '8px'
                        }}>
                          ❌ {result.error}
                        </div>
                        {result.analysis && (
                          <div style={{ fontSize: '12px', marginTop: '8px' }}>
                            {result.analysis.isNetworkError && '🌐 Verkkovirhe'}
                            {result.analysis.isCorsBlocked && '🚫 CORS-esto'}
                            {result.analysis.isTimeout && '⏱️ Aikakatkaistu'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                          <strong>Status:</strong> {result.response?.status} {result.response?.statusText}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          <div>Method: {result.request?.method}</div>
                          <div>Endpoint: {result.endpoint}</div>
                          {result.analysis && (
                            <div style={{ marginTop: '8px', fontSize: '11px' }}>
                              {result.analysis.is405Error && <div>⚠️ 405 Method Not Allowed</div>}
                              {result.analysis.hasCorsProblem && <div>⚠️ CORS header puuttuu</div>}
                              {result.analysis.contentTypeMismatch && <div>⚠️ Content-Type ei vastaa sisältöä</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <details style={{ marginTop: '12px', fontSize: '12px' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                        📋 Yksityiskohdat
                      </summary>
                      <pre style={{
                        marginTop: '8px',
                        padding: '12px',
                        background: 'rgba(0,0,0,0.05)',
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '300px',
                        fontSize: '11px'
                      }}>
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Diagnostic Tips */}
        <div style={{
          marginTop: '24px',
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>🔍 Vianmääritysopas</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px', borderLeft: '4px solid #d97706' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#92400e' }}>405 Method Not Allowed</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#78350f' }}>
                <li>API-endpoint ei tue käytettyä HTTP-metodia</li>
                <li>Tarkista että endpoint tukee POST/GET/OPTIONS</li>
                <li>Varmista että CORS preflight käsitellään (OPTIONS)</li>
                <li>Tarkista että endpoint ei ole cachetettu vanhalla koodilla</li>
              </ul>
            </div>

            <div style={{ padding: '16px', background: '#fee2e2', borderRadius: '8px', borderLeft: '4px solid #dc2626' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#991b1b' }}>CORS-ongelmat</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#7f1d1d' }}>
                <li>Access-Control-Allow-Origin header puuttuu</li>
                <li>OPTIONS preflight ei palauta 200 OK</li>
                <li>CORS headerit asetetaan vasta virhetilanteessa</li>
                <li>Middleware ei käsittele CORS:ia oikein</li>
              </ul>
            </div>

            <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#1e3a8a' }}>Content-Type -ongelmat</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#1e40af' }}>
                <li>Palvelin palauttaa HTML:ää JSON:n sijaan</li>
                <li>Content-Type header ei vastaa todellista sisältöä</li>
                <li>bodyParser ei ole konfiguroitu oikein</li>
                <li>Endpoint palauttaa error-sivun</li>
              </ul>
            </div>

            <div style={{ padding: '16px', background: '#dcfce7', borderRadius: '8px', borderLeft: '4px solid #16a34a' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#14532d' }}>Seuraavat askeleet</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#15803d' }}>
                <li>Avaa Developer Tools → Network -välilehti</li>
                <li>Tarkista OPTIONS ja POST -pyyntöjen headerit</li>
                <li>Vertaa toimivaa ja toimimatonta endpointtia</li>
                <li>Tarkista server-lokit (console.log tiedot)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/uutiskirje"
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                color: '#1f2937',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 600
              }}
            >
              📧 Uutiskirjesivu
            </a>
            <a
              href="/405-debug"
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                color: '#1f2937',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 600
              }}
            >
              🔧 Vanha debug
            </a>
            <a
              href="/"
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                color: '#1f2937',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 600
              }}
            >
              🏠 Etusivu
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

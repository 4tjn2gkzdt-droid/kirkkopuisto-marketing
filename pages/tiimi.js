import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { sanitizeRichHtml } from '../lib/sanitize'

export default function Tiimi() {
  const [teamMembers, setTeamMembers] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [newMember, setNewMember] = useState({ name: '', email: '' })
  const [emailPreview, setEmailPreview] = useState(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadTeamMembers()
  }, [])

  const loadTeamMembers = async () => {
    if (supabase) {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name')

      if (!error && data) {
        setTeamMembers(data)
      }
    }
  }

  const saveMember = async () => {
    if (!newMember.name.trim()) {
      alert('Anna nimi')
      return
    }

    if (supabase) {
      if (editingMember) {
        // Päivitä olemassa oleva
        const { error } = await supabase
          .from('team_members')
          .update({
            name: newMember.name,
            email: newMember.email || null
          })
          .eq('id', editingMember.id)

        if (error) {
          alert('Virhe päivittäessä: ' + error.message)
          return
        }
      } else {
        // Lisää uusi
        const { error } = await supabase
          .from('team_members')
          .insert({
            name: newMember.name,
            email: newMember.email || null
          })

        if (error) {
          alert('Virhe lisättäessä: ' + error.message)
          return
        }
      }

      setShowAddModal(false)
      setEditingMember(null)
      setNewMember({ name: '', email: '' })
      loadTeamMembers()
    }
  }

  const deleteMember = async (id) => {
    if (!confirm('Haluatko varmasti poistaa tämän tiimin jäsenen?')) {
      return
    }

    if (supabase) {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id)

      if (error) {
        alert('Virhe poistettaessa: ' + error.message)
        return
      }

      loadTeamMembers()
    }
  }

  const openEditModal = (member) => {
    setEditingMember(member)
    setNewMember({ name: member.name, email: member.email || '' })
    setShowAddModal(true)
  }

  const previewWeeklyEmail = async () => {
    setSending(true)
    try {
      const response = await fetch('/api/send-weekly-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmails: false })
      })

      const data = await response.json()
      if (response.ok) {
        setEmailPreview(data)
      } else {
        alert('Virhe: ' + data.error)
      }
    } catch (error) {
      alert('Virhe: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const sendWeeklyEmails = async () => {
    if (!confirm('Haluatko varmasti lähettää viikkoraportin kaikille tiimin jäsenille jotka ovat antaneet sähköpostiosoitteensa?')) {
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/send-weekly-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmails: true })
      })

      const data = await response.json()
      if (response.ok) {
        alert(`✅ Sähköpostit lähetetty!\n\nLähetetty: ${data.emailsSent}\nEpäonnistui: ${data.emailsFailed}`)
      } else {
        alert('Virhe: ' + data.error)
      }
    } catch (error) {
      alert('Virhe: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-green-800">Tiimin hallinta</h1>
              <p className="text-gray-600 mt-1">Hallinnoi tiimin jäseniä ja heidän sähköpostiosoitteitaan</p>
            </div>
            <Link href="/">
              <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                ← Takaisin
              </button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => {
                setEditingMember(null)
                setNewMember({ name: '', email: '' })
                setShowAddModal(true)
              }}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              ➕ Lisää tiimin jäsen
            </button>

            <button
              onClick={previewWeeklyEmail}
              disabled={sending || teamMembers.filter(m => m.email).length === 0}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? '⏳ Ladataan...' : '👁️ Esikatsele viikkoraportti'}
            </button>

            <button
              onClick={sendWeeklyEmails}
              disabled={sending || teamMembers.filter(m => m.email).length === 0}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? '⏳ Lähetetään...' : '✉️ Lähetä viikkoraportti'}
            </button>
          </div>

          <div className="space-y-3">
            {teamMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Ei tiimin jäseniä. Lisää ensimmäinen jäsen yllä olevasta napista.</p>
              </div>
            ) : (
              teamMembers.map(member => (
                <div
                  key={member.id}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                      {member.email ? (
                        <p className="text-sm text-gray-600 mt-1">
                          📧 {member.email}
                        </p>
                      ) : (
                        <p className="text-sm text-orange-600 mt-1">
                          ⚠️ Ei sähköpostiosoitetta (viikkoraportit ei lähetä)
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(member)}
                        className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        title="Muokkaa"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteMember(member.id)}
                        className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="Poista"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">💡 Vinkki:</h3>
          <p className="text-sm text-gray-700">
            Lisää tiimin jäsenille sähköpostiosoitteet, niin heille voidaan lähettää
            automaattiset viikkoraportit työtehtävistä.
          </p>
        </div>
      </div>

      {/* Lisää/Muokkaa modaali */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-2xl font-bold mb-6">
              {editingMember ? '✏️ Muokkaa jäsentä' : '➕ Lisää tiimin jäsen'}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Nimi *</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                  placeholder="Esim. Maija Meikäläinen"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Sähköpostiosoite</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                  placeholder="esim@email.fi"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sähköpostia käytetään viikkoraporttien lähettämiseen
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveMember}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold"
              >
                💾 Tallenna
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingMember(null)
                  setNewMember({ name: '', email: '' })
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Peruuta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viikkoraportin esikatselu */}
      {emailPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">📧 Viikkoraportin esikatselu</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Lähetettäisiin {emailPreview.recipients.length} vastaanottajalle
                    ({emailPreview.weekStart} - {emailPreview.weekEnd})
                  </p>
                </div>
                <button
                  onClick={() => setEmailPreview(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-2">Vastaanottajat:</h4>
                <div className="flex flex-wrap gap-2">
                  {emailPreview.recipients.map(member => (
                    <span key={member.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {member.name} ({member.email})
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-2">Sähköpostin sisältö:</h4>
                <div
                  className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(emailPreview.html) }}
                />
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-bold text-blue-900 mb-2">ℹ️ Esikatselu</h4>
                <p className="text-sm text-gray-700">
                  Tämä on sähköpostin esikatselu. Voit lähettää viestin kaikille tiimin jäsenille painamalla "✉️ Lähetä viikkoraportti" -nappia pääsivulla.
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  Voit myös kopioida HTML-sisällön ja lähettää sen manuaalisesti omasta sähköpostiohjelmastasi.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Kopioi HTML leikepöydälle
                    navigator.clipboard.writeText(emailPreview.html)
                    alert('✅ HTML kopioitu leikepöydälle!')
                  }}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-bold"
                >
                  📋 Kopioi HTML
                </button>
                <button
                  onClick={() => setEmailPreview(null)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Sulje
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

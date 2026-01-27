import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { socialPostTypes, socialChannels } from '../lib/constants';

export default function Ideoi() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Somepostauksen lisäysmodaali
  const [showAddSocialPostModal, setShowAddSocialPostModal] = useState(false);
  const [newSocialPost, setNewSocialPost] = useState({
    title: '',
    date: '',
    time: '12:00',
    type: 'viikko-ohjelma',
    channels: [],
    assignee: '',
    linkedEventId: null,
    status: 'suunniteltu',
    caption: '',
    notes: '',
    mediaLinks: [],
    recurrence: 'none',
    recurrenceEndDate: ''
  });

  // Tarkista autentikointi
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    setLoading(false);
  };

  // Lataa viestit
  useEffect(() => {
    const loadMessages = async () => {
      if (!user) return;
      if (supabase) {
        // Lataa Supabasesta
        const { data, error } = await supabase
          .from('brainstorm_messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Virhe ladattaessa viestejä:', error);
          // Fallback localStorageen
          const stored = localStorage.getItem('brainstorm-messages');
          setMessages(stored ? JSON.parse(stored) : getWelcomeMessage());
        } else if (data && data.length > 0) {
          setMessages(data.map(msg => ({
            role: msg.role,
            content: msg.content,
            created_by_email: msg.created_by_email
          })));
        } else {
          setMessages(getWelcomeMessage());
        }
      } else {
        // Ei Supabasea, käytetään localStoragea
        const stored = localStorage.getItem('brainstorm-messages');
        setMessages(stored ? JSON.parse(stored) : getWelcomeMessage());
      }
    };
    loadMessages();
  }, [user]);

  // Tallenna uudet viestit
  const saveMessage = async (message) => {
    if (supabase && user) {
      const { error } = await supabase
        .from('brainstorm_messages')
        .insert({
          role: message.role,
          content: message.content,
          created_by_id: user.id,
          created_by_email: user.email,
          created_by_name: user.user_metadata?.name || user.email
        });

      if (error) {
        console.error('Virhe tallennettaessa viestiä:', error);
      }
    } else {
      // Fallback localStorage
      localStorage.setItem('brainstorm-messages', JSON.stringify([...messages, message]));
    }
  };

  const getWelcomeMessage = () => [{
    role: 'assistant',
    content: 'Hei! 👋 Olen Claude, luova assistenttisi. Autan sinua ideoimaan sisältöä Kirkkopuiston Terassille. Mitä haluaisit suunnitella tänään?'
  }];

  // Skrollaa aina viimeisimpään viestiin
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input
    };

    // Tallenna käyttäjän viesti
    await saveMessage(userMessage);

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      const assistantMessage = {
        role: 'assistant',
        content: data.message
      };

      // Tallenna assistentin vastaus
      await saveMessage(assistantMessage);

      setMessages([...newMessages, assistantMessage]);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: '❌ Virhe: En voinut hakea vastausta. Tarkista että ANTHROPIC_API_KEY on asetettu Vercel ympäristömuuttujiin ja että sovellus on redeployatty.'
      };
      await saveMessage(errorMessage);
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSocialPost = async () => {
    if (!newSocialPost.title || !newSocialPost.date) {
      alert('Täytä vähintään otsikko ja päivämäärä')
      return
    }

    try {
      const year = parseInt(newSocialPost.date.split('-')[0])

      const { data, error } = await supabase
        .from('social_media_posts')
        .insert({
          title: newSocialPost.title,
          date: newSocialPost.date,
          time: newSocialPost.time,
          year: year,
          type: newSocialPost.type,
          channels: newSocialPost.channels,
          status: newSocialPost.status,
          caption: newSocialPost.caption,
          notes: newSocialPost.notes,
          created_by_id: user.id,
          created_by_email: user.email,
          created_by_name: user.user_metadata?.full_name || user.email
        })
        .select()

      if (error) throw error

      alert('✅ Somepostaus lisätty!')

      // Sulje modaali ja tyhjennä lomake
      setShowAddSocialPostModal(false)
      setNewSocialPost({
        title: '',
        date: '',
        time: '12:00',
        type: 'viikko-ohjelma',
        channels: [],
        assignee: '',
        linkedEventId: null,
        status: 'suunniteltu',
        caption: '',
        notes: '',
        mediaLinks: [],
        recurrence: 'none',
        recurrenceEndDate: ''
      })

    } catch (error) {
      console.error('Error saving social post:', error)
      alert('Virhe tallennuksessa: ' + error.message)
    }
  }

  const openAddPostModal = (content) => {
    // Esitäytä lomake generoidulla sisällöllä
    const today = new Date()
    const defaultDate = today.toISOString().split('T')[0]

    setNewSocialPost({
      title: 'Uusi postaus',
      date: defaultDate,
      time: '12:00',
      type: 'muu',
      channels: ['instagram'],
      assignee: '',
      linkedEventId: null,
      status: 'suunniteltu',
      caption: content,
      notes: 'Luotu Ideoi-sivulta',
      mediaLinks: [],
      recurrence: 'none',
      recurrenceEndDate: ''
    })

    // Avaa modaali
    setShowAddSocialPostModal(true)
  }

  const clearChat = async () => {
    if (confirm('Haluatko varmasti tyhjentää keskustelun?')) {
      if (supabase) {
        // Poista kaikki viestit Supabasesta
        const { error } = await supabase
          .from('brainstorm_messages')
          .delete()
          .neq('id', 0); // Poista kaikki

        if (error) {
          console.error('Virhe tyhjennettäessä viestejä:', error);
        }
      }

      setMessages(getWelcomeMessage());
      localStorage.removeItem('brainstorm-messages');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 p-4">
      <div className="max-w-4xl mx-auto h-screen flex flex-col pb-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-green-800">💡 Ideoi sisältöä</h1>
              <p className="text-gray-600">Brainstormaa Clauden kanssa • {user?.email}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={clearChat}
                className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
              >
                🗑️ Tyhjennä
              </button>
              <Link href="/">
                <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
                  ← Takaisin
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Chat messages */}
        <div className="bg-white rounded-lg shadow-lg flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.role === 'assistant' ? 'space-y-2' : ''}`}>
                  <div
                    className={`rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.role === 'user' && message.created_by_email && (
                      <div className="text-xs opacity-75 mb-1">{message.created_by_email}</div>
                    )}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>

                  {/* "Lisää somepäivitys" -nappi vain assistentin viesteille */}
                  {message.role === 'assistant' && message.content && !message.content.includes('❌ Virhe') && (
                    <button
                      onClick={() => openAddPostModal(message.content)}
                      className="w-full py-2 px-3 rounded-lg font-semibold transition bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                      ➕ Lisää somepäivitys
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t p-4 flex-shrink-0">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Kirjoita viestisi... (Enter lähettää, Shift+Enter rivinvaihto)"
                className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-600"
                rows="3"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className={`px-6 py-3 rounded-lg font-semibold ${
                  !input.trim() || isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isLoading ? '⏳' : '📤'}<br />Lähetä
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Vinkki: Kerro mitä haluat markkinoida, kenelle ja missä kanavassa. Claude auttaa ideoinnissa!
            </p>
          </div>
        </div>
      </div>

      {/* Somepostauksen lisäysmodaali */}
      {showAddSocialPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">📱 Lisää somepostaus</h3>

            <div className="space-y-4">
              {/* Otsikko */}
              <div>
                <label className="block text-sm font-semibold mb-2">Otsikko *</label>
                <input
                  type="text"
                  value={newSocialPost.title}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, title: e.target.value })}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Esim. Viikon ohjelma vko 24"
                />
              </div>

              {/* Päivämäärä ja aika */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Julkaisupäivä *</label>
                  <input
                    type="date"
                    value={newSocialPost.date}
                    onChange={(e) => setNewSocialPost({ ...newSocialPost, date: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Julkaisuaika</label>
                  <input
                    type="time"
                    value={newSocialPost.time}
                    onChange={(e) => setNewSocialPost({ ...newSocialPost, time: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tyyppi */}
              <div>
                <label className="block text-sm font-semibold mb-2">Postauksen tyyppi *</label>
                <select
                  value={newSocialPost.type}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, type: e.target.value })}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  {socialPostTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kanavat */}
              <div>
                <label className="block text-sm font-semibold mb-2">Somekanavat</label>
                <div className="flex flex-wrap gap-2">
                  {socialChannels.map(channel => (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => {
                        const isSelected = newSocialPost.channels.includes(channel.id);
                        setNewSocialPost({
                          ...newSocialPost,
                          channels: isSelected
                            ? newSocialPost.channels.filter(c => c !== channel.id)
                            : [...newSocialPost.channels, channel.id]
                        });
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        newSocialPost.channels.includes(channel.id)
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {channel.icon} {channel.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold mb-2">Status</label>
                <select
                  value={newSocialPost.status}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, status: e.target.value })}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="suunniteltu">📋 Suunniteltu</option>
                  <option value="työn alla">⏳ Työn alla</option>
                  <option value="valmis">✅ Valmis</option>
                  <option value="julkaistu">🎉 Julkaistu</option>
                </select>
              </div>

              {/* Caption/Teksti */}
              <div>
                <label className="block text-sm font-semibold mb-2">Caption / Postauksen teksti</label>
                <textarea
                  value={newSocialPost.caption}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, caption: e.target.value })}
                  rows={4}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Kirjoita postauksen teksti..."
                />
              </div>

              {/* Muistiinpanot */}
              <div>
                <label className="block text-sm font-semibold mb-2">Muistiinpanot</label>
                <textarea
                  value={newSocialPost.notes}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, notes: e.target.value })}
                  rows={3}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Sisäiset muistiinpanot..."
                />
              </div>
            </div>

            {/* Toimintonapit */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveSocialPost}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-bold"
              >
                💾 Tallenna
              </button>
              <button
                onClick={() => {
                  setShowAddSocialPostModal(false);
                  setNewSocialPost({
                    title: '',
                    date: '',
                    time: '12:00',
                    type: 'viikko-ohjelma',
                    channels: [],
                    assignee: '',
                    linkedEventId: null,
                    status: 'suunniteltu',
                    caption: '',
                    notes: '',
                    mediaLinks: [],
                    recurrence: 'none',
                    recurrenceEndDate: ''
                  });
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Peruuta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

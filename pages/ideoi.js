import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

// Apufunktio aikavyöhykeongelmien välttämiseksi
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Vakiot somepostauksille
const socialPostTypes = [
  { id: 'viikko-ohjelma', name: 'Viikko-ohjelma', icon: '📅' },
  { id: 'last-minute', name: 'Last minute -markkinointi', icon: '⚡' },
  { id: 'kiitos', name: 'Kiitos-postaus', icon: '🙏' },
  { id: 'teaser', name: 'Teaser', icon: '🎬' },
  { id: 'tiedote', name: 'Tiedote', icon: '📢' },
  { id: 'tarinat', name: 'Tarinat', icon: '📖' },
  { id: 'muu', name: 'Muu sisältö', icon: '📝' }
]

const socialChannels = [
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'facebook', name: 'Facebook', icon: '👥' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'newsletter', name: 'Uutiskirje', icon: '📧' }
]

// Esimerkkipromptet uusille käyttäjille
const examplePrompts = [
  "Tarvitsen Instagram-postauksen viikonlopun tapahtumasta",
  "Haluan luoda kiitos-postauksen eilisestä konsertista",
  "Miten markkinoisin viime hetken lippuja?",
  "Tarvitsen viikko-ohjelman maanantaiksi",
  "Ideoi sisältöä kesäkuun tapahtumakalenteriin",
  "Kirjoita houkutteleva Facebook-tapahtumakuvaus"
]

export default function Ideoi() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'analyze'

  // Sisältöanalyysi
  const [analyzeStartDate, setAnalyzeStartDate] = useState('');
  const [analyzeEndDate, setAnalyzeEndDate] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [contentGaps, setContentGaps] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [analyzeEvents, setAnalyzeEvents] = useState([]);
  const [analyzeSocialPosts, setAnalyzeSocialPosts] = useState([]);
  const [savingSuggestion, setSavingSuggestion] = useState(null);

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
    content: 'Hei! 👋 Olen Kirkkopuiston Terassin sisältöassistentti. Autan sinua ideoimaan ja luomaan sisältöä someen, uutiskirjeisiin ja muihin kanaviin. Kerro mitä tarvitset — kysyn tarkentavia kysymyksiä ennen kuin luon valmiin sisällön!'
  }];

  // Skrollaa aina viimeisimpään viestiin
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText) => {
    const text = messageText || input;
    if (!text.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: text.trim()
    };

    // Tallenna käyttäjän viesti
    await saveMessage(userMessage);

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/content-copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          sessionId
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
        content: '❌ Virhe: En voinut hakea vastausta. Tarkista että ANTHROPIC_API_KEY on asetettu Vercel ympäristömuuttujiin ja että sovellus on redeployattu.'
      };
      await saveMessage(errorMessage);
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
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
    const defaultDate = formatLocalDate(today)

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
      notes: 'Luotu AI-avustajasta',
      mediaLinks: [],
      recurrence: 'none',
      recurrenceEndDate: ''
    })

    // Avaa modaali
    setShowAddSocialPostModal(true)
  }

  // Sisältöanalyysi: alusta oletuspäivät
  useEffect(() => {
    const today = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setAnalyzeStartDate(formatLocalDate(today));
    setAnalyzeEndDate(formatLocalDate(in30Days));
  }, []);

  const handleAnalyze = async () => {
    if (!analyzeStartDate || !analyzeEndDate) {
      alert('Valitse aikaväli');
      return;
    }

    setAnalyzing(true);
    setContentGaps([]);
    setAiSuggestions([]);

    try {
      const response = await fetch('/api/content-calendar-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: analyzeStartDate,
          endDate: analyzeEndDate
        })
      });

      const data = await response.json();

      if (data.success) {
        setContentGaps(data.contentGaps || []);
        setAiSuggestions(data.aiSuggestions || []);
        setAnalyzeEvents(data.events || []);
        setAnalyzeSocialPosts(data.socialPosts || []);

        if (!data.aiSuggestions || data.aiSuggestions.length === 0) {
          alert('AI-ehdotuksia ei voitu generoida.' + (data.aiError ? '\nVirhe: ' + data.aiError : ''));
        }
      } else {
        alert('Virhe analyysissä: ' + (data.error || 'Tuntematon virhe'));
      }
    } catch (error) {
      console.error('Error analyzing calendar:', error);
      alert('Virhe analyysissä: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const addSuggestionToCalendar = async (suggestion) => {
    setSavingSuggestion(suggestion);

    try {
      const channelMap = {
        'Instagram': 'instagram',
        'Facebook': 'facebook',
        'TikTok': 'tiktok',
        'Uutiskirje': 'newsletter'
      };

      const channel = channelMap[suggestion.channel] || 'instagram';
      const year = parseInt(suggestion.date.split('-')[0]);

      const { error } = await supabase
        .from('social_media_posts')
        .insert({
          title: suggestion.title || suggestion.type,
          date: suggestion.date,
          time: '12:00',
          year: year,
          type: suggestion.type.toLowerCase().replace(/\s+/g, '-'),
          channels: [channel],
          status: 'suunniteltu',
          caption: suggestion.reason,
          notes: 'Luotu AI-sisältöanalyysistä',
          created_by_id: user.id,
          created_by_email: user.email,
          created_by_name: user.user_metadata?.full_name || user.email
        })
        .select();

      if (error) throw error;
      alert('Ehdotus lisätty kalenteriin!');
    } catch (error) {
      console.error('Error saving suggestion:', error);
      alert('Virhe tallennuksessa: ' + error.message);
    } finally {
      setSavingSuggestion(null);
    }
  };

  const openSuggestionAsPost = (suggestion) => {
    const channelMap = {
      'Instagram': 'instagram',
      'Facebook': 'facebook',
      'TikTok': 'tiktok',
      'Uutiskirje': 'newsletter'
    };
    const channel = channelMap[suggestion.channel] || 'instagram';

    setNewSocialPost({
      title: suggestion.title || suggestion.type || '',
      date: suggestion.date || '',
      time: '12:00',
      type: suggestion.type ? suggestion.type.toLowerCase().replace(/\s+/g, '-') : 'muu',
      channels: [channel],
      assignee: '',
      linkedEventId: null,
      status: 'suunniteltu',
      caption: suggestion.reason || '',
      notes: 'Luotu AI-sisältöanalyysistä',
      mediaLinks: [],
      recurrence: 'none',
      recurrenceEndDate: ''
    });
    setShowAddSocialPostModal(true);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': return 'Kiireellinen';
      case 'medium': return 'Keskitärkeä';
      case 'low': return 'Matala';
      default: return 'Normaali';
    }
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    alert('📋 Kopioitu leikepöydälle!');
  };

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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-green-800">💡 AI-avustaja</h1>
              <p className="text-gray-600">Ideoi, luo ja analysoi sisältöä • {user?.email}</p>
            </div>
            <div className="flex gap-3">
              {activeTab === 'chat' && (
                <button
                  onClick={clearChat}
                  className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
                >
                  🗑️ Tyhjennä
                </button>
              )}
              <Link href="/">
                <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
                  ← Takaisin
                </button>
              </Link>
            </div>
          </div>

          {/* Tab-valitsin */}
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                activeTab === 'chat' ? 'bg-green-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab('analyze')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                activeTab === 'analyze' ? 'bg-purple-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Sisältöanalyysi
            </button>
          </div>
        </div>

        {/* Chat-välilehti */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-lg shadow-lg flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Esimerkkipromptet näytetään vain alussa */}
              {messages.length <= 1 && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-5 mb-4">
                  <h3 className="font-semibold text-purple-900 mb-2">Kokeile esimerkiksi:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {examplePrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => sendMessage(prompt)}
                        className="text-left text-sm bg-white text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-100 transition"
                      >
                        💡 {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

                    {/* Toimintonapit assistentin viesteille */}
                    {message.role === 'assistant' && message.content && !message.content.includes('❌ Virhe') && index > 0 && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openAddPostModal(message.content)}
                          className="flex-1 py-2 px-3 rounded-lg font-semibold transition bg-green-600 hover:bg-green-700 text-white text-sm"
                        >
                          ➕ Lisää somepäivitys
                        </button>
                        <button
                          onClick={() => copyToClipboard(message.content)}
                          className="py-2 px-3 rounded-lg transition bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
                        >
                          📋 Kopioi
                        </button>
                      </div>
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
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Kirjoita viestisi... (Enter lähettää, Shift+Enter rivinvaihto)"
                  className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-600"
                  rows="3"
                  disabled={isLoading}
                />
                <button
                  onClick={() => sendMessage()}
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
                💡 Kerro mitä haluat — AI kysyy tarkentavia kysymyksiä ja luo sitten valmiin sisällön.
              </p>
            </div>
          </div>
        )}

        {/* Sisältöanalyysi-välilehti */}
        {activeTab === 'analyze' && (
          <div className="bg-white rounded-lg shadow-lg flex-1 overflow-y-auto p-6">
            {/* Ohje */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-purple-900 mb-1">Miten tämä toimii?</h3>
              <p className="text-sm text-purple-800">
                AI analysoi sisältökalenterisi valitulta aikajaksolta ja tunnistaa puutteet:
                viikko-ohjelmat, tapahtumien markkinointi, kiitos-postaukset ja hiljaiset jaksot.
                Saat konkreettiset ehdotukset jotka voit lisätä suoraan kalenteriin!
              </p>
            </div>

            {/* Aikavälin valinta */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Valitse aikaväli</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aloituspäivä</label>
                  <input
                    type="date"
                    value={analyzeStartDate}
                    onChange={(e) => setAnalyzeStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lopetuspäivä</label>
                  <input
                    type="date"
                    value={analyzeEndDate}
                    onChange={(e) => setAnalyzeEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition ${
                  analyzing ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {analyzing ? 'Analysoidaan...' : 'Analysoi sisältökalenteri'}
              </button>
            </div>

            {/* Tulokset */}
            {(contentGaps.length > 0 || aiSuggestions.length > 0) && (
              <div className="space-y-6">
                {/* Yhteenveto */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{analyzeEvents.length}</div>
                    <div className="text-xs text-gray-600">Tapahtumaa</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{analyzeSocialPosts.length}</div>
                    <div className="text-xs text-gray-600">Somepostausta</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{contentGaps.length}</div>
                    <div className="text-xs text-gray-600">Puutetta</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">{aiSuggestions.length}</div>
                    <div className="text-xs text-gray-600">Ehdotusta</div>
                  </div>
                </div>

                {/* Sisältöpuutteet */}
                {contentGaps.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Tunnistetut puutteet</h3>
                    <div className="space-y-2">
                      {contentGaps.sort((a, b) => {
                        const order = { high: 0, medium: 1, low: 2 };
                        return (order[a.priority] || 3) - (order[b.priority] || 3);
                      }).map((gap, index) => (
                        <div key={index} className={`p-3 border-l-4 rounded-r-lg ${getPriorityColor(gap.priority)}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold">{getPriorityBadge(gap.priority)}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(gap.date).toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-sm">{gap.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI-ehdotukset */}
                {aiSuggestions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">AI:n ehdotukset</h3>
                    <div className="space-y-3">
                      {aiSuggestions.map((suggestion, index) => (
                        <div key={index} className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${getPriorityColor(suggestion.priority)}`}>
                                {getPriorityBadge(suggestion.priority)}
                              </span>
                              <span className="text-sm text-gray-600">
                                {new Date(suggestion.date).toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </span>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                              {suggestion.channel}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1">{suggestion.title || suggestion.type}</h4>
                          <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => addSuggestionToCalendar(suggestion)}
                              disabled={savingSuggestion === suggestion}
                              className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition ${
                                savingSuggestion === suggestion
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {savingSuggestion === suggestion ? 'Tallennetaan...' : 'Lisää kalenteriin'}
                            </button>
                            <button
                              onClick={() => openSuggestionAsPost(suggestion)}
                              className="py-2 px-3 rounded-lg font-semibold text-sm transition bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              Muokkaa & lisää
                            </button>
                            <button
                              onClick={() => copyToClipboard(suggestion.reason)}
                              className="py-2 px-3 rounded-lg transition bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function Ideoi() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Lataa viestit
  useEffect(() => {
    const loadMessages = async () => {
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
          setMessages(data.map(msg => ({ role: msg.role, content: msg.content })));
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
  }, []);

  // Tallenna uudet viestit
  const saveMessage = async (message) => {
    if (supabase) {
      const { error } = await supabase
        .from('brainstorm_messages')
        .insert({
          role: message.role,
          content: message.content
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
        content: '❌ Virhe: En voinut hakea vastausta. Tarkista että ANTHROPIC_API_KEY on asetettu .env.local tiedostossa.'
      };
      await saveMessage(errorMessage);
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 p-4">
      <div className="max-w-4xl mx-auto h-screen flex flex-col pb-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-green-800">💡 Ideoi sisältöä</h1>
              <p className="text-gray-600">Brainstormaa Clauden kanssa</p>
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
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
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
    </div>
  );
}

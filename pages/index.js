import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [posts, setPosts] = useState({});
  const [expandedEvents, setExpandedEvents] = useState({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTaskEditModal, setShowTaskEditModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [currentEventForImages, setCurrentEventForImages] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskAiContent, setTaskAiContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'month', 'week'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [teamMembers, setTeamMembers] = useState([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    artist: '',
    tasks: []
  });

  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  
  const channels = [
    { id: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
    { id: 'facebook', name: 'Facebook', color: 'bg-blue-500' },
    { id: 'tiktok', name: 'TikTok', color: 'bg-black' },
    { id: 'newsletter', name: 'Uutiskirje', color: 'bg-green-500' },
    { id: 'print', name: 'Printit', color: 'bg-purple-500' },
    { id: 'ts-meno', name: 'TS Menovinkit', color: 'bg-orange-500' },
    { id: 'turku-calendar', name: 'Turun kalenteri', color: 'bg-blue-700' }
  ];

  const imageFormats = [
    { id: 'ig-feed', name: 'Instagram Feed', ratio: '1:1 (1080x1080px)', icon: '📸' },
    { id: 'ig-story', name: 'Instagram Story', ratio: '9:16 (1080x1920px)', icon: '📱' },
    { id: 'fb-feed', name: 'Facebook Feed', ratio: '1.91:1 (1200x630px)', icon: '📘' },
    { id: 'fb-event', name: 'Facebook Event', ratio: '16:9 (1920x1080px)', icon: '🎫' },
    { id: 'tiktok', name: 'TikTok', ratio: '9:16 (1080x1920px)', icon: '🎵' },
    { id: 'newsletter', name: 'Uutiskirje', ratio: '2:1 (800x400px)', icon: '📧' },
    { id: 'calendar', name: 'Tapahtumakalenteri', ratio: '16:9 (1200x675px)', icon: '📅' }
  ];

  // Lataa tapahtumat vuodelle
  useEffect(() => {
    const loadYear = async () => {
      if (supabase) {
        // Ladataan Supabasesta
        const { data: events, error } = await supabase
          .from('events')
          .select(`
            *,
            tasks (*)
          `)
          .eq('year', selectedYear)
          .order('date', { ascending: true });

        if (error) {
          console.error('Virhe ladattaessa Supabasesta:', error);
          // Fallback localStorageen
          const stored = localStorage.getItem(`posts-${selectedYear}`);
          setPosts(prev => ({ ...prev, [selectedYear]: stored ? JSON.parse(stored) : [] }));
        } else {
          // Muunna Supabase-data sovelluksen formaattiin
          const formattedEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time,
            artist: event.artist,
            images: event.images || {},
            tasks: (event.tasks || []).map(task => ({
              id: task.id,
              title: task.title,
              channel: task.channel,
              dueDate: task.due_date,
              dueTime: task.due_time,
              completed: task.completed,
              content: task.content,
              assignee: task.assignee
            }))
          }));
          setPosts(prev => ({ ...prev, [selectedYear]: formattedEvents }));
        }
      } else {
        // Ei Supabasea, käytetään localStoragea
        const stored = localStorage.getItem(`posts-${selectedYear}`);
        setPosts(prev => ({ ...prev, [selectedYear]: stored ? JSON.parse(stored) : [] }));
      }
    };
    loadYear();
  }, [selectedYear]);

  // Lataa vastuuhenkilöt
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (supabase) {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .order('name');

        if (!error && data) {
          setTeamMembers(data);
        }
      }
    };
    loadTeamMembers();
  }, []);

  // Aseta kuukausi- ja viikkonäkymä ensimmäiseen tapahtumaan
  useEffect(() => {
    const currentPosts = posts[selectedYear] || [];
    if (currentPosts.length > 0) {
      const firstEventDate = new Date(currentPosts[0].date);
      setSelectedMonth(firstEventDate.getMonth());
      setSelectedWeek(firstEventDate);
    }
  }, [posts, selectedYear]);

  // Tallenna tapahtumat
  const savePosts = async (year, updatedPosts) => {
    if (supabase) {
      // Tallenna Supabaseen
      try {
        // Käy läpi jokainen tapahtuma ja tallenna/päivitä
        for (const post of updatedPosts) {
          if (typeof post.id === 'number' && post.id > 1000000000000) {
            // Uusi client-side generoitu ID, lisää uusi tapahtuma
            const { data: newEvent, error: eventError } = await supabase
              .from('events')
              .insert({
                title: post.title,
                date: post.date,
                time: post.time || null,
                artist: post.artist || null,
                year: year,
                images: post.images || {}
              })
              .select()
              .single();

            if (eventError) throw eventError;

            // Lisää tehtävät
            if (post.tasks && post.tasks.length > 0) {
              const tasksToInsert = post.tasks.map(task => ({
                event_id: newEvent.id,
                title: task.title,
                channel: task.channel,
                due_date: task.dueDate,
                due_time: task.dueTime || null,
                completed: task.completed || false,
                content: task.content || null,
                assignee: task.assignee || null
              }));

              const { error: tasksError } = await supabase
                .from('tasks')
                .insert(tasksToInsert);

              if (tasksError) throw tasksError;
            }
          } else {
            // Päivitä olemassa oleva tapahtuma
            const { error: updateError } = await supabase
              .from('events')
              .update({
                title: post.title,
                date: post.date,
                time: post.time || null,
                artist: post.artist || null,
                images: post.images || {}
              })
              .eq('id', post.id);

            if (updateError) throw updateError;

            // Päivitä tehtävät (yksinkertainen: poista vanhat ja lisää uudet)
            await supabase.from('tasks').delete().eq('event_id', post.id);

            if (post.tasks && post.tasks.length > 0) {
              const tasksToInsert = post.tasks.map(task => ({
                event_id: post.id,
                title: task.title,
                channel: task.channel,
                due_date: task.dueDate,
                due_time: task.dueTime || null,
                completed: task.completed || false,
                content: task.content || null,
                assignee: task.assignee || null
              }));

              const { error: tasksError } = await supabase
                .from('tasks')
                .insert(tasksToInsert);

              if (tasksError) throw tasksError;
            }
          }
        }
      } catch (error) {
        console.error('Virhe tallennettaessa Supabaseen:', error);
        // Fallback localStorageen
        localStorage.setItem(`posts-${year}`, JSON.stringify(updatedPosts));
      }
    } else {
      // Ei Supabasea, käytetään localStoragea
      localStorage.setItem(`posts-${year}`, JSON.stringify(updatedPosts));
    }

    setPosts(prev => ({ ...prev, [year]: updatedPosts }));
  };

  const createTasks = (event) => {
    const eventDate = new Date(event.date);
    const formatDate = (d) => d.toISOString().split('T')[0];
    
    const fourWeeks = new Date(eventDate);
    fourWeeks.setDate(fourWeeks.getDate() - 28);
    
    const oneWeek = new Date(eventDate);
    oneWeek.setDate(oneWeek.getDate() - 7);
    
    const fiveDays = new Date(eventDate);
    fiveDays.setDate(fiveDays.getDate() - 5);
    
    const threeDays = new Date(eventDate);
    threeDays.setDate(threeDays.getDate() - 3);
    
    const oneDay = new Date(eventDate);
    oneDay.setDate(oneDay.getDate() - 1);
    
    return [
      { id: `t1-${Date.now()}-${Math.random()}`, title: 'Turun tapahtumakalenteri', channel: 'turku-calendar', dueDate: formatDate(fourWeeks), dueTime: '10:00', completed: false, content: '', assignee: '' },
      { id: `t2-${Date.now()}-${Math.random()}`, title: 'TS Menovinkit', channel: 'ts-meno', dueDate: formatDate(fourWeeks), dueTime: '11:00', completed: false, content: '', assignee: '' },
      { id: `t3-${Date.now()}-${Math.random()}`, title: 'Instagram-postaus', channel: 'instagram', dueDate: formatDate(oneWeek), dueTime: '10:00', completed: false, content: '', assignee: '' },
      { id: `t4-${Date.now()}-${Math.random()}`, title: 'Facebook-tapahtuma', channel: 'facebook', dueDate: formatDate(oneWeek), dueTime: '11:00', completed: false, content: '', assignee: '' },
      { id: `t5-${Date.now()}-${Math.random()}`, title: 'TikTok-video', channel: 'tiktok', dueDate: formatDate(fiveDays), dueTime: '14:00', completed: false, content: '', assignee: '' },
      { id: `t6-${Date.now()}-${Math.random()}`, title: 'Facebook-postaus', channel: 'facebook', dueDate: formatDate(threeDays), dueTime: '12:00', completed: false, content: '', assignee: '' },
      { id: `t7-${Date.now()}-${Math.random()}`, title: 'Instagram Story', channel: 'instagram', dueDate: formatDate(oneDay), dueTime: '18:00', completed: false, content: '', assignee: '' }
    ];
  };

  const parseImportedData = (text) => {
    const lines = text.trim().split('\n');
    const events = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      
      if (parts.length >= 2) {
        const dateStr = parts[0]?.trim() || '';
        const eventType = parts[1]?.trim() || '';
        const artist = parts[2]?.trim() || '';
        const time = parts[3]?.trim() || '';
        
        if (!dateStr || !eventType || eventType === '-') continue;
        
        let date = '';
        const dateMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        let title = eventType;
        if (artist && artist !== 'Julkaistaan myöhemmin' && artist !== '-') {
          title = `${eventType}: ${artist}`;
        }
        
        let cleanTime = time.replace('.', ':');
        if (cleanTime === '-') cleanTime = '';
        
        if (date && title) {
          const event = {
            title,
            date,
            artist: artist === 'Julkaistaan myöhemmin' ? '' : artist,
            time: cleanTime,
            id: Date.now() + Math.random(),
            images: {}
          };
          event.tasks = createTasks(event);
          events.push(event);
        }
      }
    }
    
    return events;
  };

  const handleImport = async () => {
    const parsed = parseImportedData(importText);
    if (parsed.length === 0) {
      alert('Ei voitu lukea tapahtumia');
      return;
    }

    const currentPosts = posts[selectedYear] || [];
    await savePosts(selectedYear, [...currentPosts, ...parsed]);

    // Lataa data uudelleen Supabasesta varmistaaksesi että kaikki on tallennettu
    if (supabase) {
      const { data: events, error } = await supabase
        .from('events')
        .select(`*, tasks (*)`)
        .eq('year', selectedYear)
        .order('date', { ascending: true });

      if (!error && events) {
        const formattedEvents = events.map(event => ({
          id: event.id,
          title: event.title,
          date: event.date,
          time: event.time,
          artist: event.artist,
          images: event.images || {},
          tasks: (event.tasks || []).map(task => ({
            id: task.id,
            title: task.title,
            channel: task.channel,
            dueDate: task.due_date,
            dueTime: task.due_time,
            completed: task.completed,
            content: task.content,
            assignee: task.assignee
          }))
        }));
        setPosts(prev => ({ ...prev, [selectedYear]: formattedEvents }));
      }
    }

    setShowImportModal(false);
    setImportText('');
    alert(`Lisätty ${parsed.length} tapahtumaa!`);
  };

  const toggleTask = (postId, taskId) => {
    const currentPosts = posts[selectedYear] || [];
    const updatedPosts = currentPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          tasks: post.tasks.map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        };
      }
      return post;
    });
    savePosts(selectedYear, updatedPosts);
  };

  const openTaskEdit = (postId, task) => {
    setEditingTask({ postId, task });
    setTaskAiContent(task.content || '');
    setShowTaskEditModal(true);
  };

  const updateTask = () => {
    if (!editingTask) return;
    
    const currentPosts = posts[selectedYear] || [];
    const updatedPosts = currentPosts.map(post => {
      if (post.id === editingTask.postId) {
        return {
          ...post,
          tasks: post.tasks.map(task => 
            task.id === editingTask.task.id ? editingTask.task : task
          )
        };
      }
      return post;
    });
    
    savePosts(selectedYear, updatedPosts);
    setShowTaskEditModal(false);
    setEditingTask(null);
    setTaskAiContent('');
  };

  const deletePost = async (id) => {
    if (supabase && typeof id === 'number' && id < 1000000000000) {
      // Poista Supabasesta (CASCADE poistaa automaattisesti tehtävät)
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) {
        console.error('Virhe poistettaessa Supabasesta:', error);
      }
    }
    const currentPosts = posts[selectedYear] || [];
    savePosts(selectedYear, currentPosts.filter(p => p.id !== id));
  };

  const addTaskToNewEvent = () => {
    const newTask = {
      id: `temp-${Date.now()}`,
      title: '',
      channel: 'instagram',
      dueDate: '',
      dueTime: '',
      assignee: '',
      content: '',
      completed: false
    };
    setNewEvent({
      ...newEvent,
      tasks: [...newEvent.tasks, newTask]
    });
  };

  const removeTaskFromNewEvent = (taskId) => {
    setNewEvent({
      ...newEvent,
      tasks: newEvent.tasks.filter(t => t.id !== taskId)
    });
  };

  const updateTaskInNewEvent = (taskId, field, value) => {
    setNewEvent({
      ...newEvent,
      tasks: newEvent.tasks.map(t =>
        t.id === taskId ? { ...t, [field]: value } : t
      )
    });
  };

  const saveNewEvent = async () => {
    // Validointi
    if (!newEvent.title.trim()) {
      alert('Anna tapahtumalle nimi');
      return;
    }
    if (!newEvent.date) {
      alert('Valitse tapahtuman päivämäärä');
      return;
    }

    // Tarkista että kaikilla tehtävillä on nimi ja deadline
    for (const task of newEvent.tasks) {
      if (!task.title.trim()) {
        alert('Kaikilla tehtävillä täytyy olla nimi');
        return;
      }
      if (!task.dueDate) {
        alert('Kaikilla tehtävillä täytyy olla deadline');
        return;
      }
    }

    const eventYear = new Date(newEvent.date).getFullYear();
    const currentPosts = posts[eventYear] || [];

    if (supabase) {
      // Tallenna Supabaseen
      try {
        const { data: savedEvent, error: eventError } = await supabase
          .from('events')
          .insert({
            title: newEvent.title,
            date: newEvent.date,
            time: newEvent.time || null,
            artist: newEvent.artist || null,
            year: eventYear,
            images: {}
          })
          .select()
          .single();

        if (eventError) throw eventError;

        // Tallenna tehtävät
        if (newEvent.tasks.length > 0) {
          const tasksToInsert = newEvent.tasks.map(task => ({
            event_id: savedEvent.id,
            title: task.title,
            channel: task.channel,
            due_date: task.dueDate,
            due_time: task.dueTime || null,
            completed: false,
            content: task.content || null,
            assignee: task.assignee || null
          }));

          const { error: tasksError } = await supabase
            .from('tasks')
            .insert(tasksToInsert);

          if (tasksError) throw tasksError;
        }

        // Päivitä UI
        const { data: events, error } = await supabase
          .from('events')
          .select(`*, tasks (*)`)
          .eq('year', eventYear)
          .order('date', { ascending: true });

        if (!error) {
          const formattedEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time,
            artist: event.artist,
            images: event.images || {},
            tasks: event.tasks || []
          }));
          setPosts(prev => ({ ...prev, [eventYear]: formattedEvents }));
        }

      } catch (error) {
        console.error('Virhe tallennettaessa:', error);
        alert('Virhe tallennettaessa tapahtumaa: ' + error.message);
        return;
      }
    } else {
      // LocalStorage fallback
      const newPost = {
        id: Date.now(),
        ...newEvent,
        images: {},
        tasks: newEvent.tasks.map(t => ({ ...t, id: Date.now() + Math.random() }))
      };
      savePosts(eventYear, [...currentPosts, newPost].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      ));
    }

    // Tyhjennä lomake ja sulje modaali
    setNewEvent({
      title: '',
      date: '',
      time: '',
      artist: '',
      tasks: []
    });
    setShowAddEventModal(false);

    // Vaihda oikeaan vuoteen jos tarpeen
    if (eventYear !== selectedYear) {
      setSelectedYear(eventYear);
    }
  };

  const toggleImage = (formatId) => {
    if (!currentEventForImages) return;
    
    const currentPosts = posts[selectedYear] || [];
    const updatedPosts = currentPosts.map(post => {
      if (post.id === currentEventForImages.id) {
        const newImages = { ...post.images };
        if (newImages[formatId]) {
          delete newImages[formatId];
        } else {
          newImages[formatId] = { added: new Date().toISOString() };
        }
        return { ...post, images: newImages };
      }
      return post;
    });
    
    savePosts(selectedYear, updatedPosts);
    setCurrentEventForImages(updatedPosts.find(p => p.id === currentEventForImages.id));
  };

  const filterPosts = () => {
    const currentPosts = posts[selectedYear] || [];
    if (!searchQuery) return currentPosts;

    const q = searchQuery.toLowerCase();
    return currentPosts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.artist && p.artist.toLowerCase().includes(q))
    );
  };

  // Apufunktiot kalenterinäkymiä varten
  const getDaysInMonth = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Lisää tyhjät päivät ennen kuukauden alkua
    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      days.push(null);
    }
    // Lisää kuukauden päivät
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getWeekDays = (date) => {
    const day = date.getDay();
    const diff = date.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(date);
    monday.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    const allPosts = filterPosts();
    return allPosts.filter(post => post.date === dateStr);
  };

  const currentYearPosts = filterPosts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-green-800">Kirkkopuiston Terassi</h1>
              <p className="text-gray-600">Markkinoinnin työkalut</p>
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <Link href="/tehtavat">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  📋 Kaikki tehtävät
                </button>
              </Link>
              <Link href="/ideoi">
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                  💡 Ideoi sisältöä
                </button>
              </Link>
              <Link href="/poista-duplikaatit">
                <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm">
                  🗑️ Poista duplikaatit
                </button>
              </Link>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border rounded-lg"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h2 className="text-2xl font-bold">Kalenteri {selectedYear}</h2>
            <div className="flex gap-3 items-center">
              <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded ${viewMode === 'list' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                >
                  📋 Lista
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-4 py-2 rounded ${viewMode === 'month' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                >
                  📅 Kuukausi
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded ${viewMode === 'week' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                >
                  📆 Viikko
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddEventModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  ➕ Lisää tapahtuma
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  📥 Tuo taulukosta
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Hae tapahtumia..."
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          {/* Lista-näkymä */}
          {viewMode === 'list' && (
            currentYearPosts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-4">📅</p>
                <p>Ei tapahtumia</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentYearPosts.sort((a, b) => new Date(a.date) - new Date(b.date)).map(post => {
                const isExpanded = expandedEvents[post.id];
                const completed = post.tasks.filter(t => t.completed).length;
                const total = post.tasks.length;
                
                return (
                  <div key={post.id} className="border rounded-lg">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => setExpandedEvents(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                              className="text-gray-400 text-xl"
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                            <div>
                              <h3 className="font-semibold text-lg">{post.title}</h3>
                              <p className="text-sm text-gray-500">
                                {new Date(post.date).toLocaleDateString('fi-FI')}
                                {post.time && ` klo ${post.time}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="ml-8 flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-green-600">✓</span>
                              <span className="text-sm">{completed}/{total}</span>
                            </div>
                            <div className="flex-1 min-w-[100px] max-w-xs">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${(completed / total) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setCurrentEventForImages(post);
                                setShowImageModal(true);
                              }}
                              className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-lg"
                            >
                              📸 Kuvat
                            </button>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => deletePost(post.id)}
                          className="p-2 bg-red-100 text-red-700 rounded"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="space-y-2 ml-8">
                          {post.tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map(task => {
                            const channel = channels.find(c => c.id === task.channel);
                            
                            return (
                              <div
                                key={task.id}
                                className={`flex items-start gap-3 p-3 rounded-lg ${
                                  task.completed ? 'bg-green-50 border border-green-200' : 'bg-white border'
                                }`}
                              >
                                <button
                                  onClick={() => toggleTask(post.id, task.id)}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    task.completed ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'
                                  }`}
                                >
                                  {task.completed && '✓'}
                                </button>
                                
                                <span className={`${channel?.color} text-white px-2 py-1 rounded text-xs`}>
                                  {channel?.name}
                                </span>
                                
                                <div className="flex-1">
                                  <h5 className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                                    {task.title}
                                  </h5>
                                  <p className="text-xs text-gray-500 mt-1">
                                    📅 {new Date(task.dueDate).toLocaleDateString('fi-FI')} {task.dueTime}
                                  </p>
                                </div>
                                
                                <button
                                  onClick={() => openTaskEdit(post.id, task)}
                                  className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                >
                                  ✏️
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            )
          )}

          {/* Kuukausi-näkymä */}
          {viewMode === 'month' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => setSelectedMonth(m => m === 0 ? 11 : m - 1)}
                  className="px-2 md:px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm md:text-base"
                >
                  ← <span className="hidden sm:inline">Edellinen</span>
                </button>
                <h3 className="text-base md:text-xl font-bold">
                  {new Date(selectedYear, selectedMonth).toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setSelectedMonth(m => m === 11 ? 0 : m + 1)}
                  className="px-2 md:px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm md:text-base"
                >
                  <span className="hidden sm:inline">Seuraava</span> →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'].map((day, idx) => (
                  <div key={day} className="text-center font-bold text-gray-600 py-1 md:py-2 text-xs md:text-base">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{['M', 'T', 'K', 'T', 'P', 'L', 'S'][idx]}</span>
                  </div>
                ))}
                {getDaysInMonth(selectedYear, selectedMonth).map((date, idx) => {
                  const dayEvents = date ? getEventsForDate(date) : [];
                  const isToday = date && date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={idx}
                      className={`min-h-[60px] md:min-h-[100px] border rounded p-1 md:p-2 ${
                        !date ? 'bg-gray-50' : isToday ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {date && (
                        <>
                          <div className="text-right text-xs md:text-sm font-semibold mb-1">
                            {date.getDate()}
                          </div>
                          <div className="space-y-0.5 md:space-y-1">
                            {dayEvents.map(event => {
                              const completed = event.tasks.filter(t => t.completed).length;
                              const total = event.tasks.length;

                              return (
                                <div
                                  key={event.id}
                                  className="text-[9px] md:text-xs bg-green-100 border border-green-300 rounded p-0.5 md:p-1 cursor-pointer hover:bg-green-200"
                                  onClick={() => {
                                    setExpandedEvents(prev => ({ ...prev, [event.id]: true }));
                                    setViewMode('list');
                                  }}
                                  title={event.title}
                                >
                                  <div className="font-semibold truncate">{event.title}</div>
                                  {event.time && (
                                    <div className="text-gray-600 hidden md:block">{event.time}</div>
                                  )}
                                  <div className="flex items-center gap-1 mt-0.5 md:mt-1">
                                    <div className="flex-1 bg-gray-200 rounded-full h-0.5 md:h-1">
                                      <div
                                        className="bg-green-600 h-0.5 md:h-1 rounded-full"
                                        style={{ width: `${(completed / total) * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-[8px] md:text-[10px]">{completed}/{total}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Viikko-näkymä */}
          {viewMode === 'week' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedWeek);
                    newDate.setDate(newDate.getDate() - 7);
                    setSelectedWeek(newDate);
                  }}
                  className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                >
                  ← Edellinen viikko
                </button>
                <h3 className="text-xl font-bold">
                  Viikko {Math.ceil((selectedWeek.getDate() + new Date(selectedYear, 0, 1).getDay()) / 7)}
                </h3>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedWeek);
                    newDate.setDate(newDate.getDate() + 7);
                    setSelectedWeek(newDate);
                  }}
                  className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Seuraava viikko →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {getWeekDays(selectedWeek).map((date, idx) => {
                  const dayEvents = getEventsForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const dayName = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'][idx];

                  return (
                    <div
                      key={idx}
                      className={`border rounded p-2 ${
                        isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                      }`}
                    >
                      <div className="text-center mb-2">
                        <div className="font-bold text-gray-600">{dayName}</div>
                        <div className="text-sm">{date.getDate()}.{date.getMonth() + 1}</div>
                      </div>
                      <div className="space-y-2">
                        {dayEvents.map(event => {
                          const completed = event.tasks.filter(t => t.completed).length;
                          const total = event.tasks.length;

                          return (
                            <div
                              key={event.id}
                              className="text-xs bg-green-100 border border-green-300 rounded p-2 cursor-pointer hover:bg-green-200"
                              onClick={() => {
                                setExpandedEvents(prev => ({ ...prev, [event.id]: true }));
                                setViewMode('list');
                              }}
                            >
                              <div className="font-semibold mb-1">{event.title}</div>
                              {event.time && (
                                <div className="text-gray-600 mb-1">🕐 {event.time}</div>
                              )}
                              <div className="flex items-center gap-1">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-green-600 h-1.5 rounded-full"
                                    style={{ width: `${(completed / total) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-[10px]">{completed}/{total}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Tuo tapahtumia</h3>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full p-3 border rounded-lg h-48 font-mono text-sm"
                placeholder="Liitä taulukko..."
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleImport}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg"
                >
                  Lisää
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportText('');
                  }}
                  className="flex-1 bg-gray-200 py-2 rounded-lg"
                >
                  Peruuta
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddEventModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-6">➕ Lisää uusi tapahtuma</h3>

              {/* Tapahtuman tiedot */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Tapahtuman nimi *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Esim. Kesäkonsertti"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Päivämäärä *</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Aika</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Artisti / Esiintyjä</label>
                  <input
                    type="text"
                    value={newEvent.artist}
                    onChange={(e) => setNewEvent({ ...newEvent, artist: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Esim. Band XYZ"
                  />
                </div>
              </div>

              {/* Markkinointitehtävät */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold">Markkinointitehtävät</h4>
                  <button
                    onClick={addTaskToNewEvent}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    + Lisää tehtävä
                  </button>
                </div>

                {newEvent.tasks.length === 0 ? (
                  <p className="text-gray-500 text-sm mb-4">Ei tehtäviä. Klikkaa "Lisää tehtävä" lisätäksesi markkinointitehtäviä.</p>
                ) : (
                  <div className="space-y-4 mb-4">
                    {newEvent.tasks.map((task, index) => (
                      <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-medium text-sm text-gray-700">Tehtävä {index + 1}</span>
                          <button
                            onClick={() => removeTaskFromNewEvent(task.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            ✕ Poista
                          </button>
                        </div>

                        <div className="space-y-3">
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => updateTaskInNewEvent(task.id, 'title', e.target.value)}
                            className="w-full p-2 border rounded-lg text-sm"
                            placeholder="Tehtävän nimi *"
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <select
                              value={task.channel}
                              onChange={(e) => updateTaskInNewEvent(task.id, 'channel', e.target.value)}
                              className="w-full p-2 border rounded-lg text-sm"
                            >
                              {channels.map(ch => (
                                <option key={ch.id} value={ch.id}>{ch.name}</option>
                              ))}
                            </select>

                            <select
                              value={task.assignee}
                              onChange={(e) => updateTaskInNewEvent(task.id, 'assignee', e.target.value)}
                              className="w-full p-2 border rounded-lg text-sm"
                            >
                              <option value="">Ei vastuuhenkilöä</option>
                              {teamMembers.map(member => (
                                <option key={member.id} value={member.name}>{member.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="date"
                              value={task.dueDate}
                              onChange={(e) => updateTaskInNewEvent(task.id, 'dueDate', e.target.value)}
                              className="w-full p-2 border rounded-lg text-sm"
                              placeholder="Deadline *"
                            />
                            <input
                              type="time"
                              value={task.dueTime}
                              onChange={(e) => updateTaskInNewEvent(task.id, 'dueTime', e.target.value)}
                              className="w-full p-2 border rounded-lg text-sm"
                            />
                          </div>

                          <textarea
                            value={task.content}
                            onChange={(e) => updateTaskInNewEvent(task.id, 'content', e.target.value)}
                            className="w-full p-2 border rounded-lg text-sm"
                            placeholder="Sisältö / Muistiinpanot"
                            rows="2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Napit */}
              <div className="flex gap-3 mt-6 border-t pt-4">
                <button
                  onClick={saveNewEvent}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
                >
                  💾 Tallenna tapahtuma
                </button>
                <button
                  onClick={() => {
                    setShowAddEventModal(false);
                    setNewEvent({
                      title: '',
                      date: '',
                      time: '',
                      artist: '',
                      tasks: []
                    });
                  }}
                  className="flex-1 bg-gray-200 py-3 rounded-lg hover:bg-gray-300"
                >
                  Peruuta
                </button>
              </div>
            </div>
          </div>
        )}

        {showTaskEditModal && editingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Muokkaa tehtävää</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Otsikko</label>
                  <input
                    value={editingTask.task.title}
                    onChange={(e) => setEditingTask({
                      ...editingTask,
                      task: { ...editingTask.task, title: e.target.value }
                    })}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Deadline</label>
                    <input
                      type="date"
                      value={editingTask.task.dueDate}
                      onChange={(e) => setEditingTask({
                        ...editingTask,
                        task: { ...editingTask.task, dueDate: e.target.value }
                      })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Aika</label>
                    <input
                      type="time"
                      value={editingTask.task.dueTime}
                      onChange={(e) => setEditingTask({
                        ...editingTask,
                        task: { ...editingTask.task, dueTime: e.target.value }
                      })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Vastuuhenkilö</label>
                  <select
                    value={editingTask.task.assignee || ''}
                    onChange={(e) => setEditingTask({
                      ...editingTask,
                      task: { ...editingTask.task, assignee: e.target.value }
                    })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Ei määritetty</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Sisältö</label>
                  <textarea
                    value={taskAiContent}
                    onChange={(e) => {
                      setTaskAiContent(e.target.value);
                      setEditingTask({
                        ...editingTask,
                        task: { ...editingTask.task, content: e.target.value }
                      });
                    }}
                    className="w-full p-3 border rounded h-32"
                    placeholder="Sisältö..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateTask}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg"
                >
                  Tallenna
                </button>
                <button
                  onClick={() => {
                    setShowTaskEditModal(false);
                    setEditingTask(null);
                    setTaskAiContent('');
                  }}
                  className="flex-1 bg-gray-200 py-2 rounded-lg"
                >
                  Peruuta
                </button>
              </div>
            </div>
          </div>
        )}

        {showImageModal && currentEventForImages && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">{currentEventForImages.title}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {imageFormats.map(format => (
                  <div key={format.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{format.icon}</span>
                      <div>
                        <h4 className="font-semibold text-sm">{format.name}</h4>
                        <p className="text-xs text-gray-500">{format.ratio}</p>
                      </div>
                    </div>
                    
                    {currentEventForImages.images[format.id] ? (
                      <button
                        onClick={() => toggleImage(format.id)}
                        className="w-full bg-green-100 text-green-700 text-xs py-2 rounded"
                      >
                        ✅ Lisätty - Poista
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleImage(format.id)}
                        className="w-full bg-purple-600 text-white text-xs py-2 rounded"
                      >
                        ➕ Merkitse lisätyksi
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setCurrentEventForImages(null);
                }}
                className="w-full mt-6 bg-gray-200 py-2 rounded-lg"
              >
                Sulje
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

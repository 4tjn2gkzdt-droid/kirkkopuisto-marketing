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
  const [eventSize, setEventSize] = useState('medium');
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [generatingTaskId, setGeneratingTaskId] = useState(null);
  const [autoGenerateContent, setAutoGenerateContent] = useState(true);
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0, isGenerating: false });

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

  const generateTasksForEventSize = (size, eventDate) => {
    const baseDate = new Date(eventDate);
    const formatDate = (daysOffset) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + daysOffset);
      return date.toISOString().split('T')[0];
    };

    const baseTasks = {
      small: [
        { title: 'Instagram Story', channel: 'instagram', daysOffset: -1, time: '12:00' },
        { title: 'Facebook -postaus', channel: 'facebook', daysOffset: -2, time: '10:00' }
      ],
      medium: [
        { title: 'Instagram Feed -postaus', channel: 'instagram', daysOffset: -3, time: '12:00' },
        { title: 'Instagram Story', channel: 'instagram', daysOffset: -1, time: '14:00' },
        { title: 'Facebook -postaus', channel: 'facebook', daysOffset: -3, time: '10:00' },
        { title: 'TikTok -video', channel: 'tiktok', daysOffset: -2, time: '16:00' },
        { title: 'Turun tapahtumakalenteri', channel: 'turku-calendar', daysOffset: -28, time: '10:00' }
      ],
      large: [
        { title: 'Instagram Feed -julkaisu 1', channel: 'instagram', daysOffset: -7, time: '12:00' },
        { title: 'Instagram Feed -julkaisu 2', channel: 'instagram', daysOffset: -3, time: '12:00' },
        { title: 'Instagram Story -sarja', channel: 'instagram', daysOffset: -1, time: '14:00' },
        { title: 'Facebook Event', channel: 'facebook', daysOffset: -14, time: '10:00' },
        { title: 'Facebook -postaus', channel: 'facebook', daysOffset: -3, time: '10:00' },
        { title: 'TikTok -video', channel: 'tiktok', daysOffset: -5, time: '16:00' },
        { title: 'Uutiskirje', channel: 'newsletter', daysOffset: -7, time: '09:00' },
        { title: 'Printit (julisteet)', channel: 'print', daysOffset: -21, time: '10:00' },
        { title: 'TS Menovinkit', channel: 'ts-meno', daysOffset: -7, time: '10:00' },
        { title: 'Turun tapahtumakalenteri', channel: 'turku-calendar', daysOffset: -28, time: '10:00' }
      ]
    };

    const templateTasks = baseTasks[size] || baseTasks.medium;

    return templateTasks.map((task, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      title: task.title,
      channel: task.channel,
      dueDate: formatDate(task.daysOffset),
      dueTime: task.time,
      assignee: '',
      content: '',
      completed: false
    }));
  };

  const generateContentForTask = async (postId, task) => {
    if (!postId || !task) return;

    setGeneratingTaskId(task.id);

    try {
      const post = (posts[selectedYear] || []).find(p => p.id === postId);
      if (!post) throw new Error('Tapahtumaa ei löytynyt');

      const channel = channels.find(c => c.id === task.channel);

      const prompt = `Luo markkinointisisältö seuraavalle tapahtumalle:

Tapahtuma: ${post.title}
Artisti: ${post.artist || 'Ei ilmoitettu'}
Päivämäärä: ${new Date(post.date).toLocaleDateString('fi-FI')}
Aika: ${post.time || 'Ei ilmoitettu'}
Kanava: ${channel?.name || task.channel}
Tehtävä: ${task.title}

Luo sopiva postaus/sisältö tälle kanavalle. Sisällytä:
- Houkutteleva otsikko tai aloitus
- Tärkeimmät tiedot (artisti, aika, paikka)
- Kutsu toimintaan (CTA)
- Sopivat hashtagit (#kirkkopuistonterassi #turku)

Pidä tyyli rennon ja kutsuvana. Maksimi 2-3 kappaletta.`;

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });

      const data = await response.json();

      if (!response.ok) {
        // Luo error-objekti jossa on kaikki debug-tiedot
        const error = new Error(data.error || data.details || 'AI-pyyntö epäonnistui');
        error.debugInfo = data.debugInfo;
        error.help = data.help;
        error.details = data.details;
        error.envKeysFound = data.envKeysFound;
        error.statusCode = response.status;
        throw error;
      }

      if (!data.response) {
        throw new Error('Ei vastausta API:lta');
      }

      // Päivitä taskin content
      if (supabase && typeof task.id === 'number') {
        await supabase
          .from('tasks')
          .update({ content: data.response })
          .eq('id', task.id);
      }

      // Päivitä UI
      const updatedPosts = (posts[selectedYear] || []).map(p => {
        if (p.id === postId) {
          return {
            ...p,
            tasks: p.tasks.map(t =>
              t.id === task.id ? { ...t, content: data.response } : t
            )
          };
        }
        return p;
      });

      setPosts(prev => ({ ...prev, [selectedYear]: updatedPosts }));

      alert('✨ Sisältö generoitu! Voit muokata sitä tehtävän muokkauksessa.');

    } catch (error) {
      console.error('Virhe sisällön generoinnissa:', error);

      // Näytä kaikki mahdolliset virhetiedot
      let errorMessage = '❌ Virhe sisällön generoinnissa\n\n';
      errorMessage += 'Virhe: ' + error.message + '\n\n';

      // Jos virhe tuli API:lta, näytä lisätietoja
      if (error.debugInfo) {
        errorMessage += 'Debug info:\n';
        errorMessage += JSON.stringify(error.debugInfo, null, 2) + '\n\n';
      }

      if (error.help) {
        errorMessage += '💡 Ohje: ' + error.help + '\n\n';
      }

      if (error.details) {
        errorMessage += 'Lisätietoja: ' + error.details + '\n\n';
      }

      if (error.message.includes('API-avain') || error.message.includes('ANTHROPIC')) {
        errorMessage += '\n📝 Tarkista Vercel:\n';
        errorMessage += '1. Mene: vercel.com/dashboard\n';
        errorMessage += '2. Settings → Environment Variables\n';
        errorMessage += '3. Varmista että ANTHROPIC_API_KEY on asetettu\n';
        errorMessage += '4. Redeploy sovellus\n';
      }

      alert(errorMessage);

      // Logataan myös konsoliin kaikki tiedot
      console.log('Full error details:', error);
    } finally {
      setGeneratingTaskId(null);
    }
  };

  const generateContentForAllTasks = async (event) => {
    const tasksToGenerate = event.tasks.filter(t => !t.content || t.content.trim() === '');

    if (tasksToGenerate.length === 0) {
      return;
    }

    setGeneratingProgress({ current: 0, total: tasksToGenerate.length, isGenerating: true });

    for (let i = 0; i < tasksToGenerate.length; i++) {
      const task = tasksToGenerate[i];
      setGeneratingProgress({ current: i + 1, total: tasksToGenerate.length, isGenerating: true });

      try {
        const channel = channels.find(c => c.id === task.channel);
        const prompt = `Luo markkinointisisältö seuraavalle tapahtumalle:

Tapahtuma: ${event.title}
Artisti: ${event.artist || 'Ei ilmoitettu'}
Päivämäärä: ${new Date(event.date).toLocaleDateString('fi-FI')}
Aika: ${event.time || 'Ei ilmoitettu'}
Kanava: ${channel?.name || task.channel}
Tehtävä: ${task.title}

Luo sopiva postaus/sisältö tälle kanavalle. Sisällytä:
- Houkutteleva otsikko tai aloitus
- Tärkeimmät tiedot (artisti, aika, paikka)
- Kutsu toimintaan (CTA)
- Sopivat hashtagit (#kirkkopuistonterassi #turku)

Pidä tyyli rennon ja kutsuvana. Maksimi 2-3 kappaletta.`;

        const response = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt })
        });

        const data = await response.json();

        if (response.ok && data.response) {
          // Päivitä Supabaseen
          if (supabase && typeof task.id === 'number') {
            await supabase
              .from('tasks')
              .update({ content: data.response })
              .eq('id', task.id);
          }

          // Päivitä UI
          setPosts(prev => {
            const yearPosts = prev[selectedYear] || [];
            const updatedPosts = yearPosts.map(p => {
              if (p.id === event.id) {
                return {
                  ...p,
                  tasks: p.tasks.map(t =>
                    t.id === task.id ? { ...t, content: data.response } : t
                  )
                };
              }
              return p;
            });
            return { ...prev, [selectedYear]: updatedPosts };
          });
        }
      } catch (error) {
        console.error(`Virhe generoitaessa sisältöä tehtävälle ${task.title}:`, error);
        // Jatka seuraavaan tehtävään virheen sattuessa
      }
    }

    setGeneratingProgress({ current: 0, total: 0, isGenerating: false });
    alert(`✨ Sisältö generoitu ${tasksToGenerate.length} tehtävälle!`);
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
          setPosts(prev => ({ ...prev, [eventYear]: formattedEvents }));

          // Generoi sisältö automaattisesti jos valittu
          if (autoGenerateContent && newEvent.tasks.length > 0) {
            const createdEvent = formattedEvents.find(e => e.id === savedEvent.id);
            if (createdEvent) {
              await generateContentForAllTasks(createdEvent);
            }
          }
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

  // Laskee lähestyvät ja myöhässä olevat deadlinet
  const getUpcomingDeadlines = () => {
    const allPosts = posts[selectedYear] || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlines = [];

    allPosts.forEach(post => {
      (post.tasks || []).forEach(task => {
        if (!task.completed && task.dueDate) {
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          const diffTime = dueDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let urgency = 'normal';
          if (diffDays < 0) {
            urgency = 'overdue'; // Myöhässä
          } else if (diffDays <= 3) {
            urgency = 'urgent'; // Alle 3 päivää
          } else if (diffDays <= 7) {
            urgency = 'soon'; // Alle viikko
          }

          deadlines.push({
            task,
            event: post,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            diffDays,
            urgency
          });
        }
      });
    });

    return deadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
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
              <Link href="/materiaalit">
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                  📁 Materiaalit
                </button>
              </Link>
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

        {/* Deadline-muistutukset */}
        {(() => {
          const upcomingDeadlines = getUpcomingDeadlines();
          const overdue = upcomingDeadlines.filter(d => d.urgency === 'overdue');
          const urgent = upcomingDeadlines.filter(d => d.urgency === 'urgent');
          const soon = upcomingDeadlines.filter(d => d.urgency === 'soon');
          const totalCount = overdue.length + urgent.length + soon.length;

          if (totalCount === 0) return null;

          return (
            <div
              onClick={() => setShowDeadlineModal(true)}
              className="bg-white rounded-lg shadow-lg p-4 mb-6 cursor-pointer hover:shadow-xl transition-shadow border-l-4 border-yellow-500"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔔</span>
                  <div>
                    <h3 className="font-bold text-gray-800">Lähestyvät deadlinet</h3>
                    <div className="flex gap-4 text-sm mt-1">
                      {overdue.length > 0 && (
                        <span className="text-red-600 font-semibold">
                          ❌ {overdue.length} myöhässä
                        </span>
                      )}
                      {urgent.length > 0 && (
                        <span className="text-orange-600 font-semibold">
                          ⚠️ {urgent.length} kiireellinen
                        </span>
                      )}
                      {soon.length > 0 && (
                        <span className="text-blue-600">
                          📅 {soon.length} tällä viikolla
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="text-sm text-gray-600 hover:text-gray-800">
                  Näytä kaikki →
                </button>
              </div>
            </div>
          );
        })()}

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
                                  {task.content && (
                                    <p className="text-xs text-gray-600 mt-1 italic truncate">
                                      {task.content.substring(0, 50)}...
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => generateContentForTask(post.id, task)}
                                    disabled={generatingTaskId === task.id}
                                    className="p-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50"
                                    title="Luo sisältö AI:llä"
                                  >
                                    {generatingTaskId === task.id ? '⏳' : '✨'}
                                  </button>
                                  <button
                                    onClick={() => openTaskEdit(post.id, task)}
                                    className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                    title="Muokkaa"
                                  >
                                    ✏️
                                  </button>
                                </div>
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

        {/* Deadline-modaali */}
        {showDeadlineModal && (() => {
          const upcomingDeadlines = getUpcomingDeadlines();
          const overdue = upcomingDeadlines.filter(d => d.urgency === 'overdue');
          const urgent = upcomingDeadlines.filter(d => d.urgency === 'urgent');
          const soon = upcomingDeadlines.filter(d => d.urgency === 'soon');

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">🔔 Lähestyvät deadlinet</h3>
                  <button
                    onClick={() => setShowDeadlineModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Myöhässä */}
                {overdue.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
                      ❌ Myöhässä ({overdue.length})
                    </h4>
                    <div className="space-y-3">
                      {overdue.map((d, idx) => (
                        <div key={idx} className="border border-red-300 bg-red-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-semibold text-gray-800">{d.task.title}</h5>
                              <p className="text-sm text-gray-600">{d.event.title} - {d.event.artist}</p>
                              <div className="flex gap-4 mt-2 text-sm">
                                <span className="text-red-600 font-semibold">
                                  {Math.abs(d.diffDays)} päivää myöhässä
                                </span>
                                <span className="text-gray-600">
                                  {d.dueDate} {d.dueTime && `klo ${d.dueTime}`}
                                </span>
                                {d.task.assignee && (
                                  <span className="text-gray-600">👤 {d.task.assignee}</span>
                                )}
                              </div>
                              <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                                channels.find(c => c.id === d.task.channel)?.color || 'bg-gray-500'
                              } text-white`}>
                                {channels.find(c => c.id === d.task.channel)?.name || d.task.channel}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kiireelliset (alle 3 päivää) */}
                {urgent.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-orange-600 mb-3 flex items-center gap-2">
                      ⚠️ Kiireelliset ({urgent.length})
                    </h4>
                    <div className="space-y-3">
                      {urgent.map((d, idx) => (
                        <div key={idx} className="border border-orange-300 bg-orange-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-semibold text-gray-800">{d.task.title}</h5>
                              <p className="text-sm text-gray-600">{d.event.title} - {d.event.artist}</p>
                              <div className="flex gap-4 mt-2 text-sm">
                                <span className="text-orange-600 font-semibold">
                                  {d.diffDays === 0 ? 'Tänään' : d.diffDays === 1 ? 'Huomenna' : `${d.diffDays} päivän päästä`}
                                </span>
                                <span className="text-gray-600">
                                  {d.dueDate} {d.dueTime && `klo ${d.dueTime}`}
                                </span>
                                {d.task.assignee && (
                                  <span className="text-gray-600">👤 {d.task.assignee}</span>
                                )}
                              </div>
                              <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                                channels.find(c => c.id === d.task.channel)?.color || 'bg-gray-500'
                              } text-white`}>
                                {channels.find(c => c.id === d.task.channel)?.name || d.task.channel}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tällä viikolla (4-7 päivää) */}
                {soon.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-blue-600 mb-3 flex items-center gap-2">
                      📅 Tällä viikolla ({soon.length})
                    </h4>
                    <div className="space-y-3">
                      {soon.map((d, idx) => (
                        <div key={idx} className="border border-blue-300 bg-blue-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-semibold text-gray-800">{d.task.title}</h5>
                              <p className="text-sm text-gray-600">{d.event.title} - {d.event.artist}</p>
                              <div className="flex gap-4 mt-2 text-sm">
                                <span className="text-blue-600 font-semibold">
                                  {d.diffDays} päivän päästä
                                </span>
                                <span className="text-gray-600">
                                  {d.dueDate} {d.dueTime && `klo ${d.dueTime}`}
                                </span>
                                {d.task.assignee && (
                                  <span className="text-gray-600">👤 {d.task.assignee}</span>
                                )}
                              </div>
                              <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                                channels.find(c => c.id === d.task.channel)?.color || 'bg-gray-500'
                              } text-white`}>
                                {channels.find(c => c.id === d.task.channel)?.name || d.task.channel}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {upcomingDeadlines.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    🎉 Ei lähestyviä deadlineja!
                  </p>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowDeadlineModal(false)}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Sulje
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

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

              {/* Progress-ilmoitus sisällön generoinnille */}
              {generatingProgress.isGenerating && (
                <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin text-2xl">⏳</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900">Luodaan sisältöä AI:llä...</h4>
                      <p className="text-sm text-purple-700">
                        Tehtävä {generatingProgress.current} / {generatingProgress.total}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-purple-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(generatingProgress.current / generatingProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

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

                {/* Tapahtuman koko ja automaattiset tehtävät */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Tapahtuman koko</label>
                      <select
                        value={eventSize}
                        onChange={(e) => setEventSize(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="small">Pieni (Instagram Story + Facebook)</option>
                        <option value="medium">Keskisuuri (+ TikTok + Turun kalenteri)</option>
                        <option value="large">Iso (Kaikki kanavat + uutiskirje + printit)</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (!newEvent.date) {
                          alert('Valitse ensin tapahtuman päivämäärä');
                          return;
                        }
                        const generatedTasks = generateTasksForEventSize(eventSize, newEvent.date);
                        setNewEvent({ ...newEvent, tasks: generatedTasks });
                      }}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 whitespace-nowrap"
                    >
                      ✨ Luo automaattiset tehtävät
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    💡 Valitse tapahtuman koko ja luo automaattisesti sopivat markkinointitehtävät oikeilla deadlineilla
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoGenerateContent"
                      checked={autoGenerateContent}
                      onChange={(e) => setAutoGenerateContent(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300"
                    />
                    <label htmlFor="autoGenerateContent" className="text-sm text-gray-700 cursor-pointer">
                      ✨ Luo sisältö automaattisesti AI:llä kaikille tehtäville (säästää aikaa!)
                    </label>
                  </div>
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
                    + Lisää tehtävä manuaalisesti
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

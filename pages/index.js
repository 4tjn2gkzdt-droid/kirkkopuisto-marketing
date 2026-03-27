import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import InstallPrompt from '../components/InstallPrompt';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
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
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'list', 'month', 'week'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [teamMembers, setTeamMembers] = useState([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    artist: '',
    eventType: 'artist', // 'artist', 'dj', 'other'
    summary: '', // Tapahtuman yhteenveto 100-300 merkkiä
    tasks: []
  });
  const [eventSize, setEventSize] = useState('medium');
  const [selectedMarketingChannels, setSelectedMarketingChannels] = useState([]);
  const [defaultAssignee, setDefaultAssignee] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState('week'); // 'week' or 'month'
  const [showExportModal, setShowExportModal] = useState(false); // Vienti/tulostusmodaali
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportIncludeTasks, setExportIncludeTasks] = useState(true);
  const [showPastEvents, setShowPastEvents] = useState(false); // Näytä menneet tapahtumat
  const [showWeeklyTasksModal, setShowWeeklyTasksModal] = useState(false); // Tämän viikon työtehtävät
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all'); // 'all', 'my-tasks', 'urgent', 'incomplete'
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [generatingTaskId, setGeneratingTaskId] = useState(null);
  const [autoGenerateContent, setAutoGenerateContent] = useState(true);
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0, isGenerating: false });

  // Kalenterin lataussuodattimet
  const [calendarDownloadFilters, setCalendarDownloadFilters] = useState({
    includeEvents: true,
    includeSocial: true,
    includeTasks: true
  });
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  // Somepostausten hallinta
  const [socialPosts, setSocialPosts] = useState([]);
  const [showAddSocialPostModal, setShowAddSocialPostModal] = useState(false);
  const [editingSocialPost, setEditingSocialPost] = useState(null);
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
  const [contentFilter, setContentFilter] = useState('all'); // 'all', 'events', 'social'

  // AI-viimeistely
  const [polishingCaption, setPolishingCaption] = useState(false);
  const [polishedVersions, setPolishedVersions] = useState(null);

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

  // Somepostausten tyypit
  const socialPostTypes = [
    { id: 'viikko-ohjelma', name: 'Viikko-ohjelma', icon: '📅', color: 'bg-blue-500' },
    { id: 'kuukausiohjelma', name: 'Kuukausiohjelma', icon: '📆', color: 'bg-purple-500' },
    { id: 'artisti-animaatio', name: 'Artisti-animaatio', icon: '🎬', color: 'bg-pink-500' },
    { id: 'artisti-karuselli', name: 'Artisti-karuselli', icon: '📸', color: 'bg-orange-500' },
    { id: 'fiilistelypostaus', name: 'Fiilistelypostaus', icon: '✨', color: 'bg-yellow-500' },
    { id: 'reels', name: 'Reels', icon: '🎥', color: 'bg-red-500' },
    { id: 'tapahtuma-mainospostaus', name: 'Tapahtuma-mainospostaus', icon: '🎉', color: 'bg-green-500' },
    { id: 'muu', name: 'Muu', icon: '📝', color: 'bg-gray-500' }
  ];

  // Somekanavat (laajempi kuin markkinointikanavat)
  const socialChannels = [
    { id: 'FB', name: 'Facebook', icon: '📘' },
    { id: 'IG', name: 'Instagram Feed', icon: '📸' },
    { id: 'IG-Story', name: 'Instagram Story', icon: '📱' },
    { id: 'IG-Reels', name: 'Instagram Reels', icon: '🎬' },
    { id: 'TikTok', name: 'TikTok', icon: '🎵' }
  ];

  // Markkinointitoimenpiteet joista voidaan valita
  const marketingOperations = [
    {
      id: 'ig-feed',
      name: 'Instagram Feed -postaus',
      channel: 'instagram',
      icon: '📸',
      daysBeforeEvent: 7,
      defaultTime: '12:00',
      description: '1:1 kuva + caption'
    },
    {
      id: 'ig-reel',
      name: 'Instagram Reels',
      channel: 'instagram',
      icon: '🎬',
      daysBeforeEvent: 5,
      defaultTime: '14:00',
      description: 'Lyhyt video 15-30s'
    },
    {
      id: 'ig-story',
      name: 'Instagram Story',
      channel: 'instagram',
      icon: '📱',
      daysBeforeEvent: 1,
      defaultTime: '18:00',
      description: '9:16 stoory-päivitys'
    },
    {
      id: 'fb-post',
      name: 'Facebook -postaus',
      channel: 'facebook',
      icon: '📘',
      daysBeforeEvent: 5,
      defaultTime: '10:00',
      description: 'Orgaaninen postaus'
    },
    {
      id: 'fb-event',
      name: 'Facebook Event',
      channel: 'facebook',
      icon: '🎫',
      daysBeforeEvent: 14,
      defaultTime: '11:00',
      description: 'Tapahtuman luonti FB:ssä'
    },
    {
      id: 'tiktok',
      name: 'TikTok -video',
      channel: 'tiktok',
      icon: '🎵',
      daysBeforeEvent: 4,
      defaultTime: '16:00',
      description: 'Lyhyt mukaansatempaava video'
    },
    {
      id: 'newsletter',
      name: 'Uutiskirje',
      channel: 'newsletter',
      icon: '📧',
      daysBeforeEvent: 7,
      defaultTime: '09:00',
      description: 'Sähköpostiviesti tilaajille'
    },
    {
      id: 'print',
      name: 'Printit (julisteet)',
      channel: 'print',
      icon: '🖨️',
      daysBeforeEvent: 21,
      defaultTime: '10:00',
      description: 'Fyysiset julisteet ja mainosmateriaalit'
    },
    {
      id: 'ts-meno',
      name: 'TS Menovinkit',
      channel: 'ts-meno',
      icon: '📰',
      daysBeforeEvent: 10,
      defaultTime: '10:00',
      description: 'Turun Sanomien menolista'
    },
    {
      id: 'turku-calendar',
      name: 'Turun tapahtumakalenteri',
      channel: 'turku-calendar',
      icon: '📅',
      daysBeforeEvent: 28,
      defaultTime: '10:00',
      description: 'Kaupungin virallinen kalenteri'
    }
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

  // Tarkista autentikointi
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        console.log('[AUTH] Checking session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AUTH] Session error:', sessionError);
          setLoading(false);
          router.push('/login');
          return;
        }

        if (!session) {
          console.log('[AUTH] No session found, redirecting to login');
          setLoading(false);
          router.push('/login');
          return;
        }

        console.log('[AUTH] Session found for:', session.user.email);
        setUser(session.user);

        // Hae käyttäjäprofiili
        console.log('[AUTH] Fetching user profile...');
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('[AUTH] Profile error:', profileError);
          // Jatka silti - profiili ei ole pakollinen
          console.log('[AUTH] Continuing without profile');
        } else {
          console.log('[AUTH] Profile loaded:', profile.full_name);
          console.log('[AUTH] Profile is_admin:', profile.is_admin);
          console.log('[AUTH] Full profile:', profile);
          setUserProfile(profile);
        }

        console.log('[AUTH] Auth check complete, setting loading=false');
        setLoading(false);
      } catch (error) {
        console.error('[AUTH] Unexpected error:', error);
        // ÄLÄ ohjaa loginiin - anna käyttäjän nähdä virhe
        setLoading(false);
      }
    };

    checkAuth();

    // Kuuntele kirjautumisen muutoksia
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] State change:', event);
      if (event === 'SIGNED_OUT') {
        console.log('[AUTH] User signed out, redirecting to login');
        router.push('/login');
      } else if (event === 'SIGNED_IN' && session) {
        console.log('[AUTH] User signed in:', session.user.email);
        setUser(session.user);
        setLoading(false);

        // Hae päivitetty profiili
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          console.log('[AUTH] Profile updated');
          console.log('[AUTH] Updated is_admin:', profile.is_admin);
          console.log('[AUTH] Updated full profile:', profile);
          setUserProfile(profile);
        }
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, [router]);

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
            summary: event.summary,
            eventType: event.event_type || 'artist',
            images: event.images || {},
            tasks: (event.tasks || []).map(task => ({
              id: task.id,
              title: task.title,
              channel: task.channel,
              dueDate: task.due_date,
              dueTime: task.due_time,
              completed: task.completed,
              content: task.content,
              assignee: task.assignee,
              notes: task.notes
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

  // Lataa somepostaukset vuodelle
  useEffect(() => {
    const loadSocialPosts = async () => {
      if (supabase) {
        const { data, error } = await supabase
          .from('social_media_posts')
          .select('*')
          .eq('year', selectedYear)
          .order('date', { ascending: true });

        if (error) {
          console.error('Virhe ladattaessa somepostauksia:', error);
          setSocialPosts([]);
        } else {
          // Muunna Supabase-data sovelluksen formaattiin
          const formattedPosts = data.map(post => ({
            id: post.id,
            title: post.title,
            date: post.date,
            time: post.time,
            type: post.type,
            channels: post.channels || [],
            assignee: post.assignee,
            linkedEventId: post.linked_event_id,
            status: post.status,
            caption: post.caption,
            notes: post.notes,
            mediaLinks: post.media_links || []
          }));
          setSocialPosts(formattedPosts);
        }
      }
    };
    loadSocialPosts();
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
                event_type: post.eventType || 'artist',
                year: year,
                images: post.images || {},
                created_by_id: user?.id || null,
                created_by_email: user?.email || null,
                created_by_name: userProfile?.full_name || user?.email || null
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
                assignee: task.assignee || null,
                notes: task.notes || null,
                created_by_id: user?.id || null,
                created_by_email: user?.email || null,
                created_by_name: userProfile?.full_name || user?.email || null
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
                event_type: post.eventType || 'artist',
                images: post.images || {},
                updated_by_id: user?.id || null,
                updated_by_email: user?.email || null,
                updated_by_name: userProfile?.full_name || user?.email || null
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
                assignee: task.assignee || null,
                notes: task.notes || null,
                created_by_id: user?.id || null,
                created_by_email: user?.email || null,
                created_by_name: userProfile?.full_name || user?.email || null
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

  // Kirjaudu ulos
  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      router.push('/login');
    }
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
          summary: event.summary,
          eventType: event.event_type || 'artist',
          images: event.images || {},
          tasks: (event.tasks || []).map(task => ({
            id: task.id,
            title: task.title,
            channel: task.channel,
            dueDate: task.due_date,
            dueTime: task.due_time,
            completed: task.completed,
            content: task.content,
            assignee: task.assignee,
            notes: task.notes
          }))
        }));
        setPosts(prev => ({ ...prev, [selectedYear]: formattedEvents }));

        // Generoi sisältö kaikille uusille tapahtumille jos automaattinen generointi on päällä
        if (autoGenerateContent) {
          // Löydä juuri tuodut tapahtumat
          const importedEventIds = parsed.map(p => p.title); // Käytetään titlea koska ID muuttuu
          const importedEvents = formattedEvents.filter(e =>
            importedEventIds.includes(e.title)
          );

          if (importedEvents.length > 0) {
            setShowImportModal(false);
            setImportText('');

            // Generoi sisältö kaikille tuoduille tapahtumille
            for (const event of importedEvents) {
              await generateContentForAllTasks(event);
            }

            alert(`✨ Lisätty ${parsed.length} tapahtumaa ja generoitu sisältö tehtäville!`);
            return;
          }
        }
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

  const updateTask = async () => {
    if (!editingTask) return;

    // Tallenna Supabaseen jos käytössä ja ID on numero (ei temp-ID)
    if (supabase && typeof editingTask.task.id === 'number' && editingTask.task.id < 1000000000000) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({
            title: editingTask.task.title,
            due_date: editingTask.task.dueDate,
            due_time: editingTask.task.dueTime || null,
            assignee: editingTask.task.assignee || null,
            content: editingTask.task.content || null,
            notes: editingTask.task.notes || null
          })
          .eq('id', editingTask.task.id);

        if (error) throw error;
      } catch (error) {
        console.error('Virhe tallennettaessa tehtävää:', error);
        alert('Virhe tallennettaessa tehtävää: ' + error.message);
        return;
      }
    }

    // Päivitä myös paikallinen tila
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

    setPosts(prev => ({ ...prev, [selectedYear]: updatedPosts }));
    savePosts(selectedYear, updatedPosts);
    setShowTaskEditModal(false);
    setEditingTask(null);
    setTaskAiContent('');
  };

  const deletePost = async (id) => {
    const eventToDelete = (posts[selectedYear] || []).find(p => p.id === id);
    if (!eventToDelete) return;

    const confirmMessage = `Haluatko varmasti poistaa tapahtuman "${eventToDelete.title}"?\n\n` +
      `Tapahtumaan liittyy ${eventToDelete.tasks?.length || 0} tehtävää, jotka myös poistetaan.\n\n` +
      `Tätä toimintoa ei voi peruuttaa.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    if (supabase && typeof id === 'number' && id < 1000000000000) {
      // Poista Supabasesta (CASCADE poistaa automaattisesti tehtävät)
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) {
        console.error('Virhe poistettaessa Supabasesta:', error);
        alert('Virhe poistettaessa tapahtumaa. Yritä uudelleen.');
        return;
      }
    }
    const currentPosts = posts[selectedYear] || [];
    savePosts(selectedYear, currentPosts.filter(p => p.id !== id));
  };

  // Excel/CSV-vienti
  const exportToExcel = (startDate = null, endDate = null, includeTasks = true) => {
    let allPosts = posts[selectedYear] || [];

    // Suodata päivämäärän mukaan jos määritelty
    if (startDate || endDate) {
      allPosts = allPosts.filter(event => {
        const eventDate = new Date(event.date);
        if (startDate && endDate) {
          return eventDate >= new Date(startDate) && eventDate <= new Date(endDate);
        } else if (startDate) {
          return eventDate >= new Date(startDate);
        } else if (endDate) {
          return eventDate <= new Date(endDate);
        }
        return true;
      });
    }

    // Luo data taulukkoon
    const data = [];
    allPosts.forEach(event => {
      const eventData = {
        'Tapahtuma': event.title,
        'Päivämäärä': new Date(event.date).toLocaleDateString('fi-FI'),
        'Aika': event.time || '',
        'Tyyppi': event.eventType === 'artist' ? 'Artisti' :
                 event.eventType === 'dj' ? 'DJ' :
                 event.eventType === 'market' ? 'Kirppis' : 'Muu',
        'Esiintyjä/Lisätiedot': event.artist || '',
        'Yhteenveto': event.summary || ''
      };

      if (includeTasks) {
        eventData['Tehtäviä yhteensä'] = event.tasks?.length || 0;
        eventData['Valmiit tehtävät'] = event.tasks?.filter(t => t.completed).length || 0;
      }

      data.push(eventData);
    });

    // Luo worksheet ja workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tapahtumat');

    // Lataa tiedosto
    const dateRange = startDate && endDate ?
      `_${new Date(startDate).toLocaleDateString('fi-FI').replace(/\./g, '-')}_${new Date(endDate).toLocaleDateString('fi-FI').replace(/\./g, '-')}` :
      `_${selectedYear}`;
    XLSX.writeFile(wb, `Kirkkopuisto_Tapahtumat${dateRange}.xlsx`);
  };

  const exportToCSV = (startDate = null, endDate = null, includeTasks = true) => {
    let allPosts = posts[selectedYear] || [];

    // Suodata päivämäärän mukaan jos määritelty
    if (startDate || endDate) {
      allPosts = allPosts.filter(event => {
        const eventDate = new Date(event.date);
        if (startDate && endDate) {
          return eventDate >= new Date(startDate) && eventDate <= new Date(endDate);
        } else if (startDate) {
          return eventDate >= new Date(startDate);
        } else if (endDate) {
          return eventDate <= new Date(endDate);
        }
        return true;
      });
    }

    // Luo CSV-data
    const data = [];
    allPosts.forEach(event => {
      const eventData = {
        'Tapahtuma': event.title,
        'Päivämäärä': new Date(event.date).toLocaleDateString('fi-FI'),
        'Aika': event.time || '',
        'Tyyppi': event.eventType === 'artist' ? 'Artisti' :
                 event.eventType === 'dj' ? 'DJ' :
                 event.eventType === 'market' ? 'Kirppis' : 'Muu',
        'Esiintyjä/Lisätiedot': event.artist || '',
        'Yhteenveto': event.summary || ''
      };

      if (includeTasks) {
        eventData['Tehtäviä yhteensä'] = event.tasks?.length || 0;
        eventData['Valmiit tehtävät'] = event.tasks?.filter(t => t.completed).length || 0;
      }

      data.push(eventData);
    });

    // Luo worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);

    // Lataa CSV-tiedosto
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateRange = startDate && endDate ?
      `_${new Date(startDate).toLocaleDateString('fi-FI').replace(/\./g, '-')}_${new Date(endDate).toLocaleDateString('fi-FI').replace(/\./g, '-')}` :
      `_${selectedYear}`;
    link.download = `Kirkkopuisto_Tapahtumat${dateRange}.csv`;
    link.click();
  };

  // Tämän viikon työtehtävät PDF
  const generateWeeklyTasksPDF = () => {
    const doc = new jsPDF();
    const today = new Date();

    // Laske viikon alku ja loppu
    const currentDayOfWeek = today.getDay();
    const daysToMonday = (currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1);
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Hae kaikki tehtävät tältä viikolta
    const allPosts = posts[selectedYear] || [];
    const thisWeekTasks = [];

    allPosts.forEach(post => {
      (post.tasks || []).forEach(task => {
        if (!task.completed && task.dueDate) {
          const dueDate = new Date(task.dueDate);
          if (dueDate >= monday && dueDate <= sunday) {
            thisWeekTasks.push({
              tapahtuma: post.title,
              tehtava: task.title,
              deadline: new Date(task.dueDate).toLocaleDateString('fi-FI'),
              aika: task.dueTime || '-',
              vastuuhenkilo: task.assignee || 'Ei määritetty',
              kanava: channels.find(c => c.id === task.channel)?.name || task.channel
            });
          }
        }
      });
    });

    // Järjestä deadlinen mukaan
    thisWeekTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    // Otsikko
    doc.setFontSize(18);
    doc.text('Kirkkopuiston Terassi', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Tämän viikon työtehtävät', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(
      `${monday.toLocaleDateString('fi-FI')} - ${sunday.toLocaleDateString('fi-FI')}`,
      105,
      32,
      { align: 'center' }
    );

    // Taulukko
    doc.autoTable({
      startY: 40,
      head: [['Tapahtuma', 'Tehtävä', 'Deadline', 'Vastuuhenkilö', 'Kanava']],
      body: thisWeekTasks.map(task => [
        task.tapahtuma,
        task.tehtava,
        `${task.deadline} ${task.aika}`,
        task.vastuuhenkilo,
        task.kanava
      ]),
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] }, // Vihreä
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 50 },
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 30 }
      }
    });

    // Alatunniste
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Sivu ${i}/${pageCount} - Tulostettu ${new Date().toLocaleDateString('fi-FI')}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Tallenna
    doc.save(`Viikon_tyotehtavat_${monday.toLocaleDateString('fi-FI').replace(/\./g, '-')}.pdf`);
  };

  // Pikavalinnat markkinointikanavien valintaan
  const applyQuickSelection = (type) => {
    switch(type) {
      case 'small':
        // Pieni ilta: vain sosiaalinen media
        setSelectedMarketingChannels(['ig-story', 'fb-post']);
        break;
      case 'normal':
        // Normaali konsertti: sosiaalinen media + paikalliset
        setSelectedMarketingChannels(['ig-feed', 'ig-story', 'fb-post', 'ts-meno', 'turku-calendar']);
        break;
      case 'large':
        // Iso tapahtuma: kaikki kanavat
        setSelectedMarketingChannels(['ig-feed', 'ig-reel', 'ig-story', 'fb-post', 'fb-event', 'tiktok', 'newsletter', 'print', 'ts-meno', 'turku-calendar']);
        break;
      default:
        break;
    }
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

  // Uusi: Generoi sisältö kaikille kanaville kerralla optimoituna
  const generateMultichannelContent = async (event) => {
    if (!event || !event.tasks || event.tasks.length === 0) {
      alert('Tapahtumalla ei ole tehtäviä');
      return;
    }

    // Kysytään käyttäjältä mitkä kanavat
    const availableChannels = ['instagram', 'facebook', 'tiktok', 'linkedin', 'newsletter'];
    const eventChannels = [...new Set(event.tasks.map(t => t.channel))];

    // Mappi kanavista
    const channelMap = {
      'instagram': 'instagram',
      'facebook': 'facebook',
      'tiktok': 'tiktok',
      'linkedin': 'linkedin',
      'newsletter': 'newsletter',
      'uutiskirje': 'newsletter'
    };

    const selectedChannels = eventChannels
      .map(ch => channelMap[ch.toLowerCase()])
      .filter(ch => ch && availableChannels.includes(ch));

    if (selectedChannels.length === 0) {
      alert('Ei tuettuja kanavia tälle tapahtumalle');
      return;
    }

    if (!confirm(`Luodaanko optimoitu sisältö ${selectedChannels.length} kanavalle?\n\n${selectedChannels.join(', ')}`)) {
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/optimize-multichannel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            title: event.title,
            artist: event.artist,
            date: event.date,
            time: event.time,
            summary: event.summary
          },
          channels: selectedChannels
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Virhe sisällön generoinnissa');
      }

      const contents = data.contents;

      // Päivitä tehtävät sisällöllä
      let updatedCount = 0;
      for (const task of event.tasks) {
        const channelKey = channelMap[task.channel.toLowerCase()];
        if (channelKey && contents[channelKey]) {
          const newContent = contents[channelKey];

          // Päivitä Supabaseen
          if (supabase && typeof task.id === 'number') {
            await supabase
              .from('tasks')
              .update({ content: newContent })
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
                    t.id === task.id ? { ...t, content: newContent } : t
                  )
                };
              }
              return p;
            });
            return { ...prev, [selectedYear]: updatedPosts };
          });

          updatedCount++;
        }
      }

      alert(`✨ Luotu optimoitu sisältö ${updatedCount} tehtävälle!`);

    } catch (error) {
      console.error('Error generating multichannel content:', error);
      alert('Virhe sisällön generoinnissa: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
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
            summary: newEvent.summary || null,
            event_type: newEvent.eventType || 'artist',
            year: eventYear,
            images: {},
            created_by_id: user?.id || null,
            created_by_email: user?.email || null,
            created_by_name: userProfile?.full_name || user?.email || null
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
            assignee: task.assignee || null,
            notes: task.notes || null,
            created_by_id: user?.id || null,
            created_by_email: user?.email || null,
            created_by_name: userProfile?.full_name || user?.email || null
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
            summary: event.summary,
            eventType: event.event_type || 'artist',
            images: event.images || {},
            tasks: (event.tasks || []).map(task => ({
              id: task.id,
              title: task.title,
              channel: task.channel,
              dueDate: task.due_date,
              dueTime: task.due_time,
              completed: task.completed,
              content: task.content,
              assignee: task.assignee,
              notes: task.notes
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
      eventType: 'artist',
      tasks: []
    });
    setSelectedMarketingChannels([]);
    setDefaultAssignee('');
    setShowPreview(false);
    setShowAddEventModal(false);

    // Vaihda oikeaan vuoteen jos tarpeen
    if (eventYear !== selectedYear) {
      setSelectedYear(eventYear);
    }
  };

  // === SOMEPOSTAUSTEN HALLINTA ===

  const saveSocialPost = async () => {
    // Validointi
    if (!newSocialPost.title.trim()) {
      alert('Anna postaukselle otsikko');
      return;
    }
    if (!newSocialPost.date) {
      alert('Valitse postauksen päivämäärä');
      return;
    }

    // Validoi toisto
    if ((newSocialPost.recurrence === 'weekly' || newSocialPost.recurrence === 'monthly') && !newSocialPost.recurrenceEndDate) {
      alert('Valitse mihin päivään asti toistoa jatketaan');
      return;
    }

    const postYear = new Date(newSocialPost.date).getFullYear();

    if (supabase) {
      try {
        // Jos AI-versioita on olemassa, lisää ne notes-kenttään
        let notesText = newSocialPost.notes || '';
        if (polishedVersions) {
          const aiVersionsText = '\n\n🤖 AI-EHDOTUKSET:\n\n📝 LYHYT:\n' + polishedVersions.short + '\n\n📄 KESKIPITKÄ:\n' + polishedVersions.medium + '\n\n📜 PITKÄ:\n' + polishedVersions.long;
          notesText = notesText ? notesText + aiVersionsText : aiVersionsText.trim();
        }

        const dataToSave = {
          title: newSocialPost.title,
          date: newSocialPost.date,
          time: newSocialPost.time || null,
          type: newSocialPost.type,
          channels: newSocialPost.channels,
          assignee: newSocialPost.assignee || null,
          linked_event_id: newSocialPost.linkedEventId || null,
          status: newSocialPost.status,
          caption: newSocialPost.caption || null,
          notes: notesText || null,
          media_links: newSocialPost.mediaLinks || [],
          recurrence: newSocialPost.recurrence || 'none',
          recurrence_end_date: newSocialPost.recurrenceEndDate || null,
          year: postYear,
          created_by_id: user?.id || null,
          created_by_email: user?.email || null,
          created_by_name: userProfile?.full_name || user?.email || null
        };

        if (editingSocialPost) {
          // Päivitä olemassa oleva
          const { error } = await supabase
            .from('social_media_posts')
            .update({
              ...dataToSave,
              updated_by_id: user?.id || null,
              updated_by_email: user?.email || null,
              updated_by_name: userProfile?.full_name || user?.email || null
            })
            .eq('id', editingSocialPost.id);

          if (error) throw error;
        } else {
          // Lisää uusi (tai useita jos toisto)
          if (newSocialPost.recurrence !== 'none' && newSocialPost.recurrenceEndDate) {
            // Luo toistuvat postaukset
            const postsToCreate = [];
            const startDate = new Date(newSocialPost.date);
            const endDate = new Date(newSocialPost.recurrenceEndDate);
            let currentDate = new Date(startDate);

            while (currentDate <= endDate) {
              postsToCreate.push({
                ...dataToSave,
                date: currentDate.toISOString().split('T')[0],
                year: currentDate.getFullYear(),
                parent_post_id: null // Ensimmäinen on parent
              });

              // Lisää päivämäärään
              if (newSocialPost.recurrence === 'weekly') {
                currentDate.setDate(currentDate.getDate() + 7);
              } else if (newSocialPost.recurrence === 'monthly') {
                currentDate.setMonth(currentDate.getMonth() + 1);
              }
            }

            // Tallenna kaikki postaukset
            const { data: savedPosts, error } = await supabase
              .from('social_media_posts')
              .insert(postsToCreate)
              .select();

            if (error) throw error;

            // Päivitä parent_post_id kaikkiin paitsi ensimmäiseen
            if (savedPosts && savedPosts.length > 1) {
              const parentId = savedPosts[0].id;
              const childIds = savedPosts.slice(1).map(p => p.id);

              await supabase
                .from('social_media_posts')
                .update({ parent_post_id: parentId })
                .in('id', childIds);
            }

            alert(`✅ Luotiin ${postsToCreate.length} somepostausta!`);
          } else {
            // Tavallinen yksittäinen postaus
            const { error } = await supabase
              .from('social_media_posts')
              .insert(dataToSave);

            if (error) throw error;
          }
        }

        // Lataa päivitetyt somepostaukset
        const { data, error: loadError } = await supabase
          .from('social_media_posts')
          .select('*')
          .eq('year', selectedYear)
          .order('date', { ascending: true });

        if (!loadError) {
          const formattedPosts = data.map(post => ({
            id: post.id,
            title: post.title,
            date: post.date,
            time: post.time,
            type: post.type,
            channels: post.channels || [],
            assignee: post.assignee,
            linkedEventId: post.linked_event_id,
            status: post.status,
            caption: post.caption,
            notes: post.notes,
            mediaLinks: post.media_links || []
          }));
          setSocialPosts(formattedPosts);
        }

      } catch (error) {
        console.error('Virhe tallennettaessa somepostausta:', error);
        alert('Virhe tallennettaessa: ' + error.message);
        return;
      }
    }

    // Tyhjennä lomake ja sulje modaali
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
      mediaLinks: []
    });
    setEditingSocialPost(null);
    setShowAddSocialPostModal(false);

    // Vaihda oikeaan vuoteen jos tarpeen
    if (postYear !== selectedYear) {
      setSelectedYear(postYear);
    }
  };

  const deleteSocialPost = async (id) => {
    if (!confirm('Haluatko varmasti poistaa tämän somepostauksen?')) {
      return;
    }

    if (supabase) {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Virhe poistettaessa:', error);
        alert('Virhe poistettaessa somepostausta');
        return;
      }
    }

    // Päivitä UI
    setSocialPosts(socialPosts.filter(post => post.id !== id));
  };

  const openEditSocialPostModal = (post) => {
    setEditingSocialPost(post);
    setNewSocialPost({
      title: post.title,
      date: post.date,
      time: post.time,
      type: post.type,
      channels: post.channels,
      assignee: post.assignee,
      linkedEventId: post.linkedEventId,
      status: post.status,
      caption: post.caption,
      notes: post.notes,
      mediaLinks: post.mediaLinks
    });
    setShowAddSocialPostModal(true);
  };

  const polishCaptionWithAI = async () => {
    if (!newSocialPost.caption || newSocialPost.caption.trim().length === 0) {
      alert('Kirjoita ensin teksti ennen AI-viimeistelyä');
      return;
    }

    setPolishingCaption(true);
    setPolishedVersions(null);

    try {
      const response = await fetch('/api/polish-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: newSocialPost.caption
        })
      });

      const data = await response.json();

      if (data.success) {
        setPolishedVersions(data.versions);
      } else {
        alert('Virhe AI-viimeistelyss\u00e4: ' + (data.error || 'Tuntematon virhe'));
      }
    } catch (error) {
      console.error('Error polishing caption:', error);
      alert('Virhe AI-viimeistelyss\u00e4: ' + error.message);
    } finally {
      setPolishingCaption(false);
    }
  };

  const selectPolishedVersion = (version) => {
    // Kopioi valittu versio caption-kenttään, mutta pidä kaikki versiot näkyvissä
    setNewSocialPost({ ...newSocialPost, caption: version });
    // ÄLÄ nollaa polishedVersions - käyttäjä haluaa että ne jäävät näkyviin!
    // setPolishedVersions(null); // POISTETTU
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
    let currentPosts = posts[selectedYear] || [];

    // Suodata sisältötyypin mukaan
    if (contentFilter === 'social') {
      // Jos halutaan vain somepostaukset, palauta tyhjä (tapahtumat pois)
      currentPosts = [];
    }

    // Piilota menneet tapahtumat jos showPastEvents = false
    if (!showPastEvents) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      currentPosts = currentPosts.filter(post => {
        const eventDate = new Date(post.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      });
    }

    // Hakusuodatus
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      currentPosts = currentPosts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.artist && p.artist.toLowerCase().includes(q))
      );
    }

    return currentPosts;
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

  const getSocialPostsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    let filteredSocialPosts = [...socialPosts];

    // Suodata contentFilterin mukaan
    if (contentFilter === 'events') {
      // Jos halutaan vain tapahtumat, palauta tyhjä
      return [];
    }

    // Piilota menneet jos showPastEvents = false
    if (!showPastEvents) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filteredSocialPosts = filteredSocialPosts.filter(post => {
        const postDate = new Date(post.date);
        postDate.setHours(0, 0, 0, 0);
        return postDate >= today;
      });
    }

    // Vastuuhenkilön suodatus
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        filteredSocialPosts = filteredSocialPosts.filter(post => !post.assignee || !post.assignee.trim());
      } else {
        filteredSocialPosts = filteredSocialPosts.filter(post => post.assignee === assigneeFilter);
      }
    }

    return filteredSocialPosts.filter(post => post.date === dateStr);
  };

  const currentYearPosts = filterPosts();

  // Näytä latausruutu autentikoinnin aikana
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">⏳ Ladataan...</p>
        </div>
      </div>
    );
  }

  // Jos ei ole käyttäjää, ei näytetä mitään (ohjataan kirjautumissivulle)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-green-800">Kirkkopuiston Terassi</h1>
              <p className="text-gray-600">Markkinoinnin työkalut</p>
              {userProfile && (
                <p className="text-sm text-gray-500 mt-1">
                  👤 Kirjautunut: <span className="font-semibold">{userProfile.full_name}</span>
                  {userProfile.is_admin && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Admin</span>}
                </p>
              )}
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative">
                <button
                  onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                  title="Lataa kalenteri - lisää omaan kalenteriisi (Apple, Google, Outlook)"
                >
                  📅 Lataa kalenteri
                  <span className="text-xs">{showDownloadOptions ? '▲' : '▼'}</span>
                </button>
                {showDownloadOptions && (
                  <div className="absolute top-full mt-2 left-0 bg-white border-2 border-green-600 rounded-lg shadow-lg p-4 z-50 min-w-[280px]">
                    <div className="space-y-3">
                      <div className="font-semibold text-gray-800 border-b pb-2">Valitse sisältö:</div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={calendarDownloadFilters.includeEvents}
                          onChange={(e) => setCalendarDownloadFilters({...calendarDownloadFilters, includeEvents: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">🎵 Tapahtumat</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={calendarDownloadFilters.includeSocial}
                          onChange={(e) => setCalendarDownloadFilters({...calendarDownloadFilters, includeSocial: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">📱 Somepostaukset</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={calendarDownloadFilters.includeTasks}
                          onChange={(e) => setCalendarDownloadFilters({...calendarDownloadFilters, includeTasks: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">⏰ Tehtävien deadlinet</span>
                      </label>
                      <a
                        href={`/api/calendar.ics?includeEvents=${calendarDownloadFilters.includeEvents}&includeSocial=${calendarDownloadFilters.includeSocial}&includeTasks=${calendarDownloadFilters.includeTasks}`}
                        target="_blank"
                        className="block w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-center font-medium mt-4"
                        onClick={() => setShowDownloadOptions(false)}
                      >
                        📥 Lataa
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <Link href="/perehdytys">
                <button className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 font-medium">
                  🎓 Perehdytys
                </button>
              </Link>
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
              <Link href="/uutiskirje">
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  📧 Uutiskirje
                </button>
              </Link>
              <Link href="/mallit">
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                  📝 Sisältömallit
                </button>
              </Link>
              <Link href="/sisaltokalenteri">
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                  SOME-AI
                </button>
              </Link>
              <Link href="/copilot">
                <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
                  🤖 Co-Pilot
                </button>
              </Link>
              <Link href="/muistutukset">
                <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                  🔔 Muistutukset
                </button>
              </Link>
              <Link href="/poista-duplikaatit">
                <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm">
                  🗑️ Poista duplikaatit
                </button>
              </Link>
              <Link href="/tiimi">
                <button className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700">
                  👥 Tiimi
                </button>
              </Link>
              {userProfile?.is_admin && (
                <Link href="/admin">
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium">
                    ⚙️ Admin
                  </button>
                </Link>
              )}

              {/* DEBUG: Näytä admin-status */}
              <div className="flex gap-2 items-center">
                <div className="bg-gray-800 text-white px-3 py-2 rounded text-xs font-mono">
                  Admin: {userProfile?.is_admin ? '✅ TRUE' : '❌ FALSE'}
                  {!userProfile && ' (profile ei ladattu)'}
                </div>
                <Link href="/profile-debug">
                  <button className="bg-yellow-600 text-white px-3 py-2 rounded text-xs hover:bg-yellow-700">
                    🔍 Debug
                  </button>
                </Link>
              </div>

              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium"
              >
                🚪 Kirjaudu ulos
              </button>
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
                  onClick={() => setViewMode('dashboard')}
                  className={`px-4 py-2 rounded ${viewMode === 'dashboard' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                >
                  📊 Viikkonäkymä
                </button>
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
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowAddEventModal(true)}
                  className="bg-green-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-green-700 text-sm md:text-base whitespace-nowrap"
                >
                  ➕ <span className="hidden sm:inline">Lisää tapahtuma</span><span className="sm:hidden">Lisää</span>
                </button>
                <button
                  onClick={() => setShowAddSocialPostModal(true)}
                  className="bg-indigo-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-indigo-700 text-sm md:text-base whitespace-nowrap"
                >
                  📱 <span className="hidden sm:inline">Lisää somepostaus</span><span className="sm:hidden">Some</span>
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-blue-700 text-sm md:text-base whitespace-nowrap"
                >
                  📥 <span className="hidden sm:inline">Tuo</span>
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="bg-emerald-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-emerald-700 text-sm md:text-base whitespace-nowrap"
                  title="Vie tai tulosta tapahtumat"
                >
                  📤 <span className="hidden sm:inline">Vie/Tulosta</span><span className="sm:hidden">Vie</span>
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

          {/* Tämän viikon työtehtävät -kortti */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-4 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  Tämän viikon työtehtävät
                </h3>
                <p className="text-sm text-gray-600">
                  Tulosta tai jaa PDF viikon kaikista työtehtävistä
                </p>
              </div>
              <button
                onClick={() => setShowWeeklyTasksModal(true)}
                className="bg-blue-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-md hover:shadow-lg transition-all text-sm md:text-base w-full sm:w-auto"
              >
                📄 Avaa viikon tehtävät
              </button>
            </div>
          </div>

          {/* Suodattimet */}
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-semibold text-gray-700">🔍 Suodata:</span>

                {/* Sisältötyyppi-suodatin */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setContentFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      contentFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    📊 Kaikki
                  </button>
                  <button
                    onClick={() => setContentFilter('events')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      contentFilter === 'events'
                        ? 'bg-green-600 text-white shadow'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    🎉 Vain tapahtumat
                  </button>
                  <button
                    onClick={() => setContentFilter('social')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      contentFilter === 'social'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    📱 Vain somepostaukset
                  </button>
                </div>

                {/* Vastuuhenkilön suodatin */}
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">👥 Kaikki henkilöt</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.name}>👤 {member.name}</option>
                  ))}
                  <option value="unassigned">❓ Ei vastuuhenkilöä</option>
                </select>

                {/* Pikasuodattimet */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setTaskFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      taskFilter === 'all'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    📋 Kaikki
                  </button>
                  <button
                    onClick={() => setTaskFilter('urgent')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      taskFilter === 'urgent'
                        ? 'bg-red-600 text-white shadow'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    🔥 Kiireelliset
                  </button>
                  <button
                    onClick={() => setTaskFilter('incomplete')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      taskFilter === 'incomplete'
                        ? 'bg-orange-600 text-white shadow'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    ⏳ Ei valmiit
                  </button>
                  <button
                    onClick={() => setTaskFilter('this-week')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      taskFilter === 'this-week'
                        ? 'bg-green-600 text-white shadow'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    📅 Tällä viikolla
                  </button>
                </div>

                {/* Nollaa suodattimet */}
                {(assigneeFilter !== 'all' || taskFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setAssigneeFilter('all');
                      setTaskFilter('all');
                    }}
                    className="ml-auto px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                  >
                    ✕ Tyhjennä suodattimet
                  </button>
                )}
              </div>

              {/* Näytä/piilota menneet tapahtumat */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowPastEvents(!showPastEvents)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showPastEvents
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
                  }`}
                >
                  {showPastEvents ? '👁️ Piilota menneet tapahtumat' : '📦 Näytä menneet tapahtumat'}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  {showPastEvents
                    ? 'Näytetään myös tapahtumat, jotka ovat jo menneet'
                    : 'Piilotetaan tapahtumat, joiden päivämäärä on ohitettu'}
                </p>
              </div>
            </div>

          {/* Viikkonäkymä - Dashboard */}
          {viewMode === 'dashboard' && (() => {
            const today = new Date();
            const currentDayOfWeek = today.getDay();
            const daysToMonday = (currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1);
            const monday = new Date(today);
            monday.setDate(today.getDate() - daysToMonday);
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            // Hae kaikki tehtävät tältä viikolta
            const allPosts = posts[selectedYear] || [];
            const thisWeekTasks = [];

            allPosts.forEach(post => {
              (post.tasks || []).forEach(task => {
                if (!task.completed && task.dueDate) {
                  const dueDate = new Date(task.dueDate);
                  if (dueDate >= monday && dueDate <= sunday) {
                    const dueDateOnly = new Date(dueDate);
                    dueDateOnly.setHours(0, 0, 0, 0);
                    const diffTime = dueDateOnly - new Date().setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    let urgency = 'normal';
                    if (diffDays < 0) {
                      urgency = 'overdue';
                    } else if (diffDays <= 1) {
                      urgency = 'urgent';
                    } else if (diffDays <= 3) {
                      urgency = 'soon';
                    }

                    thisWeekTasks.push({
                      task,
                      event: post,
                      dueDate: task.dueDate,
                      dueTime: task.dueTime,
                      diffDays,
                      urgency
                    });
                  }
                }
              });
            });

            // Suodata tehtävät
            let filteredTasks = [...thisWeekTasks];

            // Vastuuhenkilön suodatus
            if (assigneeFilter !== 'all') {
              if (assigneeFilter === 'unassigned') {
                filteredTasks = filteredTasks.filter(item => !item.task.assignee || !item.task.assignee.trim());
              } else {
                filteredTasks = filteredTasks.filter(item => item.task.assignee === assigneeFilter);
              }
            }

            // Tehtävän tyypin suodatus
            if (taskFilter === 'urgent') {
              filteredTasks = filteredTasks.filter(item => item.urgency === 'overdue' || item.urgency === 'urgent');
            } else if (taskFilter === 'incomplete') {
              filteredTasks = filteredTasks.filter(item => !item.task.completed);
            }
            // 'this-week' ja 'all' näyttävät kaikki tehtävät

            // Ryhmittele tehtävät vastuuhenkilöittäin
            const tasksByAssignee = {};
            const unassignedTasks = [];

            filteredTasks.forEach(item => {
              if (item.task.assignee && item.task.assignee.trim()) {
                if (!tasksByAssignee[item.task.assignee]) {
                  tasksByAssignee[item.task.assignee] = [];
                }
                tasksByAssignee[item.task.assignee].push(item);
              } else {
                unassignedTasks.push(item);
              }
            });

            // Järjestä tehtävät deadlinen mukaan
            Object.keys(tasksByAssignee).forEach(assignee => {
              tasksByAssignee[assignee].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            });
            unassignedTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            const getUrgencyColor = (urgency) => {
              switch (urgency) {
                case 'overdue': return 'bg-red-100 border-red-300';
                case 'urgent': return 'bg-orange-100 border-orange-300';
                case 'soon': return 'bg-yellow-100 border-yellow-300';
                default: return 'bg-blue-50 border-blue-200';
              }
            };

            const getUrgencyBadge = (urgency) => {
              switch (urgency) {
                case 'overdue': return 'bg-red-600 text-white';
                case 'urgent': return 'bg-orange-600 text-white';
                case 'soon': return 'bg-yellow-600 text-white';
                default: return 'bg-blue-600 text-white';
              }
            };

            const getUrgencyText = (diffDays) => {
              if (diffDays < 0) return `${Math.abs(diffDays)} pv myöhässä`;
              if (diffDays === 0) return 'Tänään';
              if (diffDays === 1) return 'Huomenna';
              return `${diffDays} päivän päästä`;
            };

            return (
              <div>
                {/* Viikon otsikko */}
                <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border-l-4 border-green-600">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    📊 Tämän viikon tehtävät
                  </h3>
                  <p className="text-sm text-gray-600">
                    {monday.toLocaleDateString('fi-FI', { day: 'numeric', month: 'long' })} - {sunday.toLocaleDateString('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="text-gray-700">
                      <strong>{thisWeekTasks.length}</strong> tehtävää
                    </span>
                    <span className="text-red-600">
                      <strong>{thisWeekTasks.filter(t => t.urgency === 'overdue').length}</strong> myöhässä
                    </span>
                    <span className="text-orange-600">
                      <strong>{thisWeekTasks.filter(t => t.urgency === 'urgent').length}</strong> kiireellinen
                    </span>
                    <span className="text-yellow-600">
                      <strong>{thisWeekTasks.filter(t => t.urgency === 'soon').length}</strong> pian
                    </span>
                  </div>
                </div>

                {thisWeekTasks.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-4xl mb-4">🎉</p>
                    <p className="text-lg font-medium">Ei tehtäviä tällä viikolla!</p>
                    <p className="text-sm mt-2">Kaikki on valmiina tai deadlinet ovat myöhemmin.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Tehtävät vastuuhenkilöittäin */}
                    {Object.entries(tasksByAssignee).map(([assignee, tasks]) => (
                      <div key={assignee} className="bg-white border-2 border-gray-200 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {assignee.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-gray-800">{assignee}</h4>
                              <p className="text-sm text-gray-600">{tasks.length} tehtävää</p>
                            </div>
                          </div>
                          {tasks.some(t => t.urgency === 'overdue' || t.urgency === 'urgent') && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                              ⚠️ Kiireellisiä tehtäviä
                            </span>
                          )}
                        </div>

                        <div className="space-y-3">
                          {tasks.map((item, idx) => {
                            const channel = channels.find(c => c.id === item.task.channel);
                            const completedFormats = imageFormats.filter(f => item.event.images[f.id]).length;
                            const totalFormats = imageFormats.length;
                            const imageProgress = Math.round((completedFormats / totalFormats) * 100);

                            return (
                              <div
                                key={idx}
                                className={`border-2 rounded-lg p-4 ${getUrgencyColor(item.urgency)} hover:shadow-md transition-shadow`}
                              >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${getUrgencyBadge(item.urgency)}`}>
                                        {getUrgencyText(item.diffDays)}
                                      </span>
                                      <span className={`${channel?.color || 'bg-gray-500'} text-white px-2 py-1 rounded text-xs font-medium`}>
                                        {channel?.name || item.task.channel}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <h5 className="font-semibold text-gray-900">{item.task.title}</h5>
                                      {item.task.notes && item.task.notes.trim() && (
                                        <span className="text-xs" title={item.task.notes}>
                                          📝
                                        </span>
                                      )}
                                    </div>
                                    {item.task.notes && item.task.notes.trim() && (
                                      <p className="text-xs text-blue-600 mb-1 italic">
                                        💭 {item.task.notes.length > 50 ? item.task.notes.substring(0, 50) + '...' : item.task.notes}
                                      </p>
                                    )}
                                    <p className="text-sm text-gray-700">
                                      📅 {item.event.title}
                                      {item.event.artist && ` - ${item.event.artist}`}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      Deadline: {new Date(item.dueDate).toLocaleDateString('fi-FI')}
                                      {item.dueTime && ` klo ${item.dueTime}`}
                                    </p>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setExpandedEvents(prev => ({ ...prev, [item.event.id]: true }));
                                      setViewMode('list');
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                                  >
                                    Avaa →
                                  </button>
                                </div>

                                {/* Kuvien edistyminen */}
                                <div className="bg-white bg-opacity-50 rounded p-2 mt-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-700">Kuvat:</span>
                                    <span className="text-xs font-bold text-gray-800">
                                      {completedFormats}/{totalFormats} ({imageProgress}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        imageProgress === 100 ? 'bg-green-600' :
                                        imageProgress >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                                      }`}
                                      style={{ width: `${imageProgress}%` }}
                                    />
                                  </div>
                                  {imageProgress < 100 && (
                                    <button
                                      onClick={() => {
                                        setCurrentEventForImages(item.event);
                                        setShowImageModal(true);
                                      }}
                                      className="text-xs text-purple-600 hover:text-purple-800 mt-1 font-medium"
                                    >
                                      📸 Päivitä kuvia
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Tehtävät ilman vastuuhenkilöä */}
                    {unassignedTasks.length > 0 && (
                      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-5">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                          <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            ?
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-800">Ei vastuuhenkilöä</h4>
                            <p className="text-sm text-gray-600">{unassignedTasks.length} tehtävää odottaa määritystä</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {unassignedTasks.map((item, idx) => {
                            const channel = channels.find(c => c.id === item.task.channel);

                            return (
                              <div
                                key={idx}
                                className={`border-2 rounded-lg p-4 bg-white ${getUrgencyColor(item.urgency)} hover:shadow-md transition-shadow`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${getUrgencyBadge(item.urgency)}`}>
                                        {getUrgencyText(item.diffDays)}
                                      </span>
                                      <span className={`${channel?.color || 'bg-gray-500'} text-white px-2 py-1 rounded text-xs font-medium`}>
                                        {channel?.name || item.task.channel}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <h5 className="font-semibold text-gray-900">{item.task.title}</h5>
                                      {item.task.notes && item.task.notes.trim() && (
                                        <span className="text-xs" title={item.task.notes}>
                                          📝
                                        </span>
                                      )}
                                    </div>
                                    {item.task.notes && item.task.notes.trim() && (
                                      <p className="text-xs text-blue-600 mb-1 italic">
                                        💭 {item.task.notes.length > 50 ? item.task.notes.substring(0, 50) + '...' : item.task.notes}
                                      </p>
                                    )}
                                    <p className="text-sm text-gray-700">
                                      📅 {item.event.title}
                                      {item.event.artist && ` - ${item.event.artist}`}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      Deadline: {new Date(item.dueDate).toLocaleDateString('fi-FI')}
                                      {item.dueTime && ` klo ${item.dueTime}`}
                                    </p>
                                  </div>

                                  <button
                                    onClick={() => {
                                      openTaskEdit(item.event.id, item.task);
                                    }}
                                    className="bg-purple-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-purple-700"
                                  >
                                    Määritä
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Lista-näkymä */}
          {viewMode === 'list' && (contentFilter === 'all' || contentFilter === 'events') && (() => {
            // Suodata tapahtumat
            let filteredPosts = [...currentYearPosts];

            // Piilota menneet tapahtumat jos showPastEvents = false
            if (!showPastEvents) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              filteredPosts = filteredPosts.filter(post => {
                const eventDate = new Date(post.date);
                eventDate.setHours(0, 0, 0, 0);
                return eventDate >= today;
              });
            }

            // Suodata tapahtumia jotka sisältävät suodatettuja tehtäviä
            if (assigneeFilter !== 'all' || taskFilter !== 'all') {
              filteredPosts = filteredPosts.map(post => {
                let filteredTasks = [...(post.tasks || [])];

                // Vastuuhenkilön suodatus
                if (assigneeFilter !== 'all') {
                  if (assigneeFilter === 'unassigned') {
                    filteredTasks = filteredTasks.filter(task => !task.assignee || !task.assignee.trim());
                  } else {
                    filteredTasks = filteredTasks.filter(task => task.assignee === assigneeFilter);
                  }
                }

                // Tehtävän tyypin suodatus
                if (taskFilter === 'urgent') {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  filteredTasks = filteredTasks.filter(task => {
                    if (task.completed) return false;
                    const dueDate = new Date(task.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    return diffDays < 0 || diffDays <= 1;
                  });
                } else if (taskFilter === 'incomplete') {
                  filteredTasks = filteredTasks.filter(task => !task.completed);
                } else if (taskFilter === 'this-week') {
                  const today = new Date();
                  const currentDayOfWeek = today.getDay();
                  const daysToMonday = (currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1);
                  const monday = new Date(today);
                  monday.setDate(today.getDate() - daysToMonday);
                  monday.setHours(0, 0, 0, 0);
                  const sunday = new Date(monday);
                  sunday.setDate(monday.getDate() + 6);
                  sunday.setHours(23, 59, 59, 999);

                  filteredTasks = filteredTasks.filter(task => {
                    if (!task.dueDate || task.completed) return false;
                    const dueDate = new Date(task.dueDate);
                    return dueDate >= monday && dueDate <= sunday;
                  });
                }

                return { ...post, tasks: filteredTasks };
              }).filter(post => post.tasks.length > 0);
            }

            return filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-4">📅</p>
                <p>Ei tapahtumia suodattimilla</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.sort((a, b) => new Date(a.date) - new Date(b.date)).map(post => {
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
                              {post.summary && (
                                <p className="text-sm text-gray-600 mt-1 italic">
                                  {post.summary}
                                </p>
                              )}
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

                        <div className="flex gap-2">
                          <button
                            onClick={() => generateMultichannelContent(post)}
                            className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded hover:from-purple-200 hover:to-pink-200"
                            title="Luo kaikille kanaville - AI optimoi sisällön jokaiselle kanavalle"
                            disabled={isGenerating}
                          >
                            ✨🌐
                          </button>
                          <button
                            onClick={() => {
                              // Kopioi tapahtuma
                              const copiedEvent = {
                                ...post,
                                id: `temp-${Date.now()}`,
                                title: `${post.title} (kopio)`,
                                tasks: post.tasks.map(task => ({
                                  ...task,
                                  id: `temp-${Date.now()}-${Math.random()}`,
                                  completed: false,
                                  content: task.content || ''
                                }))
                              };
                              setNewEvent(copiedEvent);
                              setShowAddEventModal(true);
                            }}
                            className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                            title="Kopioi tapahtuma"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => {
                              setEditingEvent(post);
                              setShowEditEventModal(true);
                            }}
                            className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            title="Muokkaa tapahtumaa"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deletePost(post.id)}
                            className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                            title="Poista tapahtuma"
                          >
                            🗑️
                          </button>
                        </div>
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
                                  <div className="flex items-center gap-2">
                                    <h5 className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                                      {task.title}
                                    </h5>
                                    {task.notes && task.notes.trim() && (
                                      <span className="text-xs" title={task.notes}>
                                        📝
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    📅 {new Date(task.dueDate).toLocaleDateString('fi-FI')} {task.dueTime}
                                    {task.assignee && <span className="ml-2">👤 {task.assignee}</span>}
                                  </p>
                                  {task.notes && task.notes.trim() && (
                                    <p className="text-xs text-blue-600 mt-1 italic">
                                      💭 {task.notes.length > 60 ? task.notes.substring(0, 60) + '...' : task.notes}
                                    </p>
                                  )}
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
            );
          })()}

          {/* Somepostaukset lista-näkymässä */}
          {viewMode === 'list' && (contentFilter === 'all' || contentFilter === 'social') && (() => {
            // Suodata somepostaukset
            let filteredSocialPosts = [...socialPosts];

            // Piilota menneet jos showPastEvents = false
            if (!showPastEvents) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              filteredSocialPosts = filteredSocialPosts.filter(post => {
                const postDate = new Date(post.date);
                postDate.setHours(0, 0, 0, 0);
                return postDate >= today;
              });
            }

            // Vastuuhenkilön suodatus
            if (assigneeFilter !== 'all') {
              if (assigneeFilter === 'unassigned') {
                filteredSocialPosts = filteredSocialPosts.filter(post => !post.assignee || !post.assignee.trim());
              } else {
                filteredSocialPosts = filteredSocialPosts.filter(post => post.assignee === assigneeFilter);
              }
            }

            if (filteredSocialPosts.length === 0 && contentFilter === 'social') {
              return (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-4">📱</p>
                  <p>Ei somepostauksia suodattimilla</p>
                </div>
              );
            }

            if (filteredSocialPosts.length === 0) return null;

            const typeInfo = socialPostTypes.find(t => t.id === 'viikko-ohjelma') || {};

            return (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">📱 Somepostaukset</h2>
                  <span className="text-sm text-gray-500">({filteredSocialPosts.length} kpl)</span>
                </div>
                <div className="space-y-3">
                  {filteredSocialPosts.sort((a, b) => new Date(a.date) - new Date(b.date)).map(post => {
                    const postType = socialPostTypes.find(t => t.id === post.type) || { icon: '📝', name: 'Muu', color: 'bg-gray-500' };
                    const statusEmoji = {
                      'suunniteltu': '📋',
                      'työn alla': '⏳',
                      'valmis': '✅',
                      'julkaistu': '🎉'
                    }[post.status] || '📋';

                    return (
                      <div key={post.id} className={`border-2 rounded-lg p-4 ${postType.color} bg-opacity-10 border-opacity-30`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">{postType.icon}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-lg">{post.title}</h3>
                                  <span className="text-sm">{statusEmoji}</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {new Date(post.date).toLocaleDateString('fi-FI')}
                                  {post.time && ` klo ${post.time}`}
                                  {' • '}
                                  <span className={`font-medium ${postType.color.replace('bg-', 'text-')}`}>
                                    {postType.name}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="ml-11">
                              {/* Kanavat */}
                              {post.channels && post.channels.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {post.channels.map(channelId => {
                                    const channel = socialChannels.find(c => c.id === channelId);
                                    return channel ? (
                                      <span key={channelId} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                        {channel.icon} {channel.name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              )}

                              {/* Vastuuhenkilö */}
                              {post.assignee && (
                                <p className="text-sm text-gray-600 mb-2">
                                  👤 <span className="font-medium">{post.assignee}</span>
                                </p>
                              )}

                              {/* Caption */}
                              {post.caption && (
                                <p className="text-sm text-gray-700 mt-2 italic">
                                  "{post.caption.substring(0, 100)}{post.caption.length > 100 ? '...' : ''}"
                                </p>
                              )}

                              {/* Muistiinpanot */}
                              {post.notes && (
                                <p className="text-xs text-gray-500 mt-2">
                                  📝 {post.notes.substring(0, 80)}{post.notes.length > 80 ? '...' : ''}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Toimintonapit */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditSocialPostModal(post)}
                              className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              title="Muokkaa"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteSocialPost(post.id)}
                              className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                              title="Poista"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

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
                  const daySocialPosts = date ? getSocialPostsForDate(date) : [];
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
                            {daySocialPosts.map(post => {
                              const postType = socialPostTypes.find(t => t.id === post.type) || { icon: '📝', name: 'Muu', color: 'bg-gray-500' };
                              const statusEmoji = {
                                'suunniteltu': '📋',
                                'työn alla': '⏳',
                                'valmis': '✅',
                                'julkaistu': '🎉'
                              }[post.status] || '📋';

                              return (
                                <div
                                  key={`social-${post.id}`}
                                  className="text-[9px] md:text-xs bg-blue-100 border border-blue-300 rounded p-0.5 md:p-1 cursor-pointer hover:bg-blue-200"
                                  onClick={() => openEditSocialPostModal(post)}
                                  title={post.title}
                                >
                                  <div className="font-semibold truncate flex items-center gap-1">
                                    <span>{postType.icon}</span>
                                    <span className="truncate">{post.title}</span>
                                  </div>
                                  {post.time && (
                                    <div className="text-gray-600 hidden md:block">{post.time}</div>
                                  )}
                                  <div className="text-[8px] md:text-[10px] text-gray-600">
                                    {statusEmoji} {post.status}
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
                  const daySocialPosts = getSocialPostsForDate(date);
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
                        {daySocialPosts.map(post => {
                          const postType = socialPostTypes.find(t => t.id === post.type) || { icon: '📝', name: 'Muu', color: 'bg-gray-500' };
                          const statusEmoji = {
                            'suunniteltu': '📋',
                            'työn alla': '⏳',
                            'valmis': '✅',
                            'julkaistu': '🎉'
                          }[post.status] || '📋';

                          return (
                            <div
                              key={`social-${post.id}`}
                              className="text-xs bg-blue-100 border border-blue-300 rounded p-2 cursor-pointer hover:bg-blue-200"
                              onClick={() => openEditSocialPostModal(post)}
                            >
                              <div className="font-semibold mb-1 flex items-center gap-1">
                                <span>{postType.icon}</span>
                                <span className="truncate">{post.title}</span>
                              </div>
                              {post.time && (
                                <div className="text-gray-600 mb-1">🕐 {post.time}</div>
                              )}
                              <div className="text-[10px] text-gray-600">
                                {statusEmoji} {post.status}
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
              <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <input
                  type="checkbox"
                  id="autoGenerateContentImport"
                  checked={autoGenerateContent}
                  onChange={(e) => setAutoGenerateContent(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300"
                />
                <label htmlFor="autoGenerateContentImport" className="text-sm text-gray-700 cursor-pointer">
                  ✨ Luo sisältö automaattisesti AI:llä kaikille tehtäville (säästää aikaa!)
                </label>
              </div>
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
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
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

              {/* Vaihe 1: Tapahtuman perustiedot */}
              <div className="space-y-5 mb-6">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border-l-4 border-green-600">
                  <h4 className="font-bold text-gray-800 mb-1">📝 Vaihe 1: Tapahtuman tiedot</h4>
                  <p className="text-sm text-gray-600">Anna tapahtumalle nimi, päivämäärä ja tyyppi</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-800">Tapahtuman nimi *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-lg"
                    placeholder="Esim. Kesäkonsertti, Avajaiset, Kirppispäivä..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-800">Päivämäärä *</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-800">Kellonaika</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-800">Tapahtuman tyyppi *</label>
                    <select
                      value={newEvent.eventType}
                      onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value })}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    >
                      <option value="artist">🎤 Artisti / Bändi</option>
                      <option value="dj">🎧 DJ</option>
                      <option value="market">🛍️ Kirppis / Markkinat</option>
                      <option value="other">✨ Muu tapahtuma</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-800">
                    {newEvent.eventType === 'artist' ? 'Esiintyjä / Artisti' :
                     newEvent.eventType === 'dj' ? 'DJ:n nimi' :
                     newEvent.eventType === 'market' ? 'Lisätiedot' : 'Tapahtuman kuvaus'}
                  </label>
                  <input
                    type="text"
                    value={newEvent.artist}
                    onChange={(e) => setNewEvent({ ...newEvent, artist: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    placeholder={
                      newEvent.eventType === 'artist' ? 'Esim. The Beatles' :
                      newEvent.eventType === 'dj' ? 'Esim. DJ Spotlight' :
                      newEvent.eventType === 'market' ? 'Esim. Kesäkirppis' : 'Lyhyt kuvaus tapahtumasta'
                    }
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-800">
                      📝 Tapahtuman yhteenveto
                    </label>
                    <span className={`text-xs font-medium ${
                      newEvent.summary.length < 100 ? 'text-gray-400' :
                      newEvent.summary.length <= 300 ? 'text-green-600' :
                      'text-red-600'
                    }`}>
                      {newEvent.summary.length}/300 merkkiä
                    </span>
                  </div>
                  <textarea
                    value={newEvent.summary}
                    onChange={(e) => {
                      if (e.target.value.length <= 300) {
                        setNewEvent({ ...newEvent, summary: e.target.value });
                      }
                    }}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none resize-none"
                    rows="3"
                    placeholder="Lyhyt informatiivinen yhteenveto tapahtumasta (100-300 merkkiä). Esim. 'Kesäkonsertti Kirkkopuiston Terassilla. Livemusiiikkia ja hyvää ruokaa auringonlaskussa.'"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Vinkki: Yhteenveto näkyy tapahtumalistassa ja auttaa hahmottamaan mitä tapahtumassa on kyse
                  </p>
                </div>
              </div>

              {/* Vaihe 2: Markkinointikanavat */}
              <div className="space-y-5 mb-6 border-t pt-6">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-l-4 border-purple-600">
                  <h4 className="font-bold text-gray-800 mb-1">📢 Vaihe 2: Valitse markkinointikanavat</h4>
                  <p className="text-sm text-gray-600">Klikkaa laatikkoa valitaksesi kanavat. Deadlinet lasketaan automaattisesti.</p>
                </div>

                {/* Pikavalinnat */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-3">⚡ Pikavalinnat:</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => applyQuickSelection('small')}
                      className="bg-white border-2 border-blue-300 text-blue-900 px-4 py-2 rounded-lg hover:bg-blue-50 font-medium text-sm transition-all hover:shadow"
                    >
                      ⚡ Pieni ilta
                      <span className="block text-xs text-gray-600 mt-0.5">IG Story + FB postaus</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickSelection('normal')}
                      className="bg-white border-2 border-green-300 text-green-900 px-4 py-2 rounded-lg hover:bg-green-50 font-medium text-sm transition-all hover:shadow"
                    >
                      🎤 Normaali konsertti
                      <span className="block text-xs text-gray-600 mt-0.5">5 kanavaa (Some + Paikalliset)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickSelection('large')}
                      className="bg-white border-2 border-purple-300 text-purple-900 px-4 py-2 rounded-lg hover:bg-purple-50 font-medium text-sm transition-all hover:shadow"
                    >
                      🔥 Iso tapahtuma
                      <span className="block text-xs text-gray-600 mt-0.5">Kaikki kanavat (10 kpl)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMarketingChannels([])}
                      className="bg-white border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm transition-all"
                    >
                      🗑️ Tyhjennä
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {marketingOperations.map(op => {
                    const isSelected = selectedMarketingChannels.includes(op.id);
                    const channel = channels.find(c => c.id === op.channel);

                    // Laske deadline jos tapahtuman päivämäärä on valittu
                    let deadlineText = '';
                    if (newEvent.date) {
                      const eventDate = new Date(newEvent.date);
                      const deadline = new Date(eventDate);
                      deadline.setDate(eventDate.getDate() - op.daysBeforeEvent);
                      deadlineText = `📅 ${deadline.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}`;
                    }

                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMarketingChannels(prev => prev.filter(id => id !== op.id));
                          } else {
                            setSelectedMarketingChannels(prev => [...prev, op.id]);
                          }
                        }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-2xl">{op.icon}</span>
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <span className="text-white text-sm">✓</span>}
                          </div>
                        </div>
                        <h5 className="font-bold text-sm text-gray-900 mb-1">{op.name}</h5>
                        <p className="text-xs text-gray-600 mb-2">{op.description}</p>
                        <div className="flex items-center gap-2">
                          <span className={`${channel?.color || 'bg-gray-500'} text-white px-2 py-0.5 rounded text-[10px] font-medium`}>
                            {channel?.name}
                          </span>
                          {deadlineText && (
                            <span className="text-[10px] text-gray-700 font-semibold">
                              {deadlineText}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedMarketingChannels.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      ✅ Valittu {selectedMarketingChannels.length} markkinointitoimenpidettä
                    </p>
                  </div>
                )}
              </div>

              {/* Vaihe 3: AI-sisältö ja vastuuhenkilö */}
              <div className="space-y-4 mb-6 border-t pt-6">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-l-4 border-yellow-600">
                  <h4 className="font-bold text-gray-800 mb-1">✨ Vaihe 3: AI-sisältö ja vastuuhenkilö</h4>
                  <p className="text-sm text-gray-600">Viimeistele tapahtuman asetukset</p>
                </div>

                {/* Vastuuhenkilön valinta */}
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-5">
                  <label className="text-base font-bold text-gray-900 block mb-3">
                    👤 Vastuuhenkilö (vapaaehtoinen)
                  </label>
                  <select
                    value={defaultAssignee}
                    onChange={(e) => setDefaultAssignee(e.target.value)}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Ei oletusvastuuhenkilöä (voit määrittää myöhemmin)</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-2">
                    Jos valitset vastuuhenkilön, kaikki tehtävät määritetään hänelle automaattisesti.
                  </p>
                </div>

                {/* AI-sisällön generointi */}
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-5">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      id="autoGenerateContentNew"
                      checked={autoGenerateContent}
                      onChange={(e) => setAutoGenerateContent(e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded border-gray-300 mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="autoGenerateContentNew" className="text-base font-bold text-gray-900 cursor-pointer block mb-2">
                        ✨ Luo automaattiset tekstiehdotukset AI:llä
                      </label>
                      <p className="text-sm text-gray-700 mb-2">
                        Claude luo valmiit tekstiehdotukset kaikille valituille markkinointikanavilles. Voit muokata niitä myöhemmin.
                      </p>
                      <ul className="text-xs text-gray-600 space-y-1 ml-4">
                        <li>• Houkuttelevat otsikot ja tekstit</li>
                        <li>• Sopivat hashtagit (#kirkkopuistonterassi #turku)</li>
                        <li>• Call-to-action -kehotukset</li>
                        <li>• Räätälöity jokaiselle kanavalle erikseen</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Napit */}
              <div className="flex gap-3 mt-6 border-t pt-6">
                <button
                  onClick={() => {
                    if (!newEvent.title.trim()) {
                      alert('Anna tapahtumalle nimi');
                      return;
                    }
                    if (!newEvent.date) {
                      alert('Valitse tapahtuman päivämäärä');
                      return;
                    }
                    if (selectedMarketingChannels.length === 0) {
                      alert('Valitse vähintään yksi markkinointikanava');
                      return;
                    }

                    // Luo tehtävät valittujen kanavien perusteella
                    const eventDate = new Date(newEvent.date);
                    const tasks = selectedMarketingChannels.map(opId => {
                      const op = marketingOperations.find(o => o.id === opId);
                      const deadline = new Date(eventDate);
                      deadline.setDate(eventDate.getDate() - op.daysBeforeEvent);

                      return {
                        id: `temp-${Date.now()}-${Math.random()}`,
                        title: op.name,
                        channel: op.channel,
                        dueDate: deadline.toISOString().split('T')[0],
                        dueTime: op.defaultTime,
                        assignee: defaultAssignee,
                        content: '',
                        completed: false
                      };
                    });

                    setNewEvent({ ...newEvent, tasks });
                    setShowPreview(true);
                  }}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  👀 Esikatselu
                </button>
                <button
                  onClick={() => {
                    setShowAddEventModal(false);
                    setNewEvent({
                      title: '',
                      date: '',
                      time: '',
                      artist: '',
                      eventType: 'artist',
                      tasks: []
                    });
                    setSelectedMarketingChannels([]);
                    setDefaultAssignee('');
                    setShowPreview(false);
                  }}
                  className="bg-gray-200 px-6 py-4 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Peruuta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview-modaali */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-6">👀 Esikatselu - Varmista tiedot</h3>

              {/* Tapahtuman tiedot */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-5 mb-6 border-2 border-green-200">
                <h4 className="text-xl font-bold text-gray-900 mb-3">{newEvent.title}</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">📅 Päivämäärä:</span>
                    <p className="font-semibold">{new Date(newEvent.date).toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  {newEvent.time && (
                    <div>
                      <span className="text-gray-600">🕐 Kellonaika:</span>
                      <p className="font-semibold">{newEvent.time}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">🎭 Tyyppi:</span>
                    <p className="font-semibold">
                      {newEvent.eventType === 'artist' ? '🎤 Artisti / Bändi' :
                       newEvent.eventType === 'dj' ? '🎧 DJ' :
                       newEvent.eventType === 'market' ? '🛍️ Kirppis / Markkinat' : '✨ Muu tapahtuma'}
                    </p>
                  </div>
                  {newEvent.artist && (
                    <div>
                      <span className="text-gray-600">
                        {newEvent.eventType === 'artist' ? '🎤 Esiintyjä:' :
                         newEvent.eventType === 'dj' ? '🎧 DJ:' : '📝 Lisätiedot:'}
                      </span>
                      <p className="font-semibold">{newEvent.artist}</p>
                    </div>
                  )}
                </div>
                {newEvent.summary && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <span className="text-gray-600 text-sm">📝 Yhteenveto:</span>
                    <p className="mt-1 text-gray-900 italic">{newEvent.summary}</p>
                  </div>
                )}
              </div>

              {/* Tehtävät */}
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  📋 Luotavat tehtävät
                  <span className="text-sm font-normal text-gray-600">({newEvent.tasks?.length || 0} kpl)</span>
                </h4>
                <div className="space-y-3">
                  {newEvent.tasks?.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map((task, index) => {
                    const channel = channels.find(c => c.id === task.channel);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(task.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                    let urgencyColor = 'bg-blue-50 border-blue-200';
                    let urgencyBadge = 'bg-blue-600';
                    if (diffDays < 0) {
                      urgencyColor = 'bg-red-50 border-red-200';
                      urgencyBadge = 'bg-red-600';
                    } else if (diffDays <= 3) {
                      urgencyColor = 'bg-orange-50 border-orange-200';
                      urgencyBadge = 'bg-orange-600';
                    } else if (diffDays <= 7) {
                      urgencyColor = 'bg-yellow-50 border-yellow-200';
                      urgencyBadge = 'bg-yellow-600';
                    }

                    return (
                      <div key={index} className={`border-2 rounded-lg p-4 ${urgencyColor}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`${urgencyBadge} text-white px-2 py-1 rounded text-xs font-bold`}>
                                {diffDays < 0 ? `${Math.abs(diffDays)} pv myöhässä` :
                                 diffDays === 0 ? 'Tänään' :
                                 diffDays === 1 ? 'Huomenna' :
                                 `${diffDays} päivän päästä`}
                              </span>
                              <span className={`${channel?.color || 'bg-gray-500'} text-white px-2 py-1 rounded text-xs font-medium`}>
                                {channel?.name}
                              </span>
                            </div>
                            <h5 className="font-bold text-gray-900 mb-1">{task.title}</h5>
                            <div className="text-sm text-gray-700">
                              <p>📅 Deadline: <strong>{new Date(task.dueDate).toLocaleDateString('fi-FI')} klo {task.dueTime}</strong></p>
                              {task.assignee && (
                                <p>👤 Vastuuhenkilö: <strong>{task.assignee}</strong></p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI-generointi info */}
              {autoGenerateContent && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-semibold text-purple-900 mb-1">
                    ✨ AI luo automaattisesti tekstiehdotukset
                  </p>
                  <p className="text-xs text-purple-700">
                    Claude generoi markkinointitekstin kaikille {newEvent.tasks?.length || 0} tehtävälle tapahtuman tallennuksen jälkeen.
                  </p>
                </div>
              )}

              {/* Napit */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPreview(false);
                    saveNewEvent();
                  }}
                  className="flex-1 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  ✅ Vahvista ja tallenna
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="bg-gray-200 px-6 py-4 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  ← Takaisin muokkaukseen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Muokkaa tapahtumaa -modaali */}
        {showEditEventModal && editingEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-6">✏️ Muokkaa tapahtumaa</h3>

              <div className="space-y-5 mb-6">
                {/* Perustiedot */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-800">Tapahtuman nimi *</label>
                  <input
                    type="text"
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-lg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-800">Päivämäärä *</label>
                    <input
                      type="date"
                      value={editingEvent.date}
                      onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    />
                    <p className="text-xs text-orange-600 mt-1">⚠️ Päivämäärän muutos ei päivitä tehtävien deadlineja automaattisesti</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-800">Kellonaika</label>
                    <input
                      type="time"
                      value={editingEvent.time || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-800">Tapahtuman tyyppi</label>
                    <select
                      value={editingEvent.eventType || 'artist'}
                      onChange={(e) => setEditingEvent({ ...editingEvent, eventType: e.target.value })}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    >
                      <option value="artist">🎤 Artisti / Bändi</option>
                      <option value="dj">🎧 DJ</option>
                      <option value="market">🛍️ Kirppis / Markkinat</option>
                      <option value="other">✨ Muu tapahtuma</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-800">
                    {editingEvent.eventType === 'artist' ? 'Esiintyjä / Artisti' :
                     editingEvent.eventType === 'dj' ? 'DJ:n nimi' :
                     editingEvent.eventType === 'market' ? 'Lisätiedot' : 'Tapahtuman kuvaus'}
                  </label>
                  <input
                    type="text"
                    value={editingEvent.artist || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, artist: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-800">
                      📝 Tapahtuman yhteenveto
                    </label>
                    <span className={`text-xs font-medium ${
                      (editingEvent.summary || '').length < 100 ? 'text-gray-400' :
                      (editingEvent.summary || '').length <= 300 ? 'text-green-600' :
                      'text-red-600'
                    }`}>
                      {(editingEvent.summary || '').length}/300 merkkiä
                    </span>
                  </div>
                  <textarea
                    value={editingEvent.summary || ''}
                    onChange={(e) => {
                      if (e.target.value.length <= 300) {
                        setEditingEvent({ ...editingEvent, summary: e.target.value });
                      }
                    }}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none resize-none"
                    rows="3"
                    placeholder="Lyhyt informatiivinen yhteenveto tapahtumasta (100-300 merkkiä)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Yhteenveto näkyy tapahtumalistassa
                  </p>
                </div>
              </div>

              {/* Tehtävien hallinta */}
              <div className="border-t pt-6 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    📋 Tehtävät ({editingEvent.tasks?.length || 0} kpl)
                  </p>
                  <p className="text-xs text-gray-700">
                    Tehtäviä voi muokata yksitellen klikkaamalla niitä lista-näkymässä.
                    Jos haluat lisätä uusia markkinointikanavia, luo uusi tapahtuma tai lisää tehtäviä manuaalisesti.
                  </p>
                </div>
              </div>

              {/* Napit */}
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!editingEvent.title.trim()) {
                      alert('Anna tapahtumalle nimi');
                      return;
                    }
                    if (!editingEvent.date) {
                      alert('Valitse tapahtuman päivämäärä');
                      return;
                    }

                    const eventYear = new Date(editingEvent.date).getFullYear();
                    const currentPosts = posts[eventYear] || [];

                    if (supabase && typeof editingEvent.id === 'number') {
                      try {
                        const { error: updateError } = await supabase
                          .from('events')
                          .update({
                            title: editingEvent.title,
                            date: editingEvent.date,
                            time: editingEvent.time || null,
                            artist: editingEvent.artist || null,
                            summary: editingEvent.summary || null,
                            event_type: editingEvent.eventType || 'artist',
                            images: editingEvent.images || {}
                          })
                          .eq('id', editingEvent.id);

                        if (updateError) throw updateError;

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
                            summary: event.summary,
                            eventType: event.event_type || 'artist',
                            images: event.images || {},
                            tasks: (event.tasks || []).map(task => ({
                              id: task.id,
                              title: task.title,
                              channel: task.channel,
                              dueDate: task.due_date,
                              dueTime: task.due_time,
                              completed: task.completed,
                              content: task.content,
                              assignee: task.assignee,
                              notes: task.notes
                            }))
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
                      const updatedPosts = currentPosts.map(p =>
                        p.id === editingEvent.id ? editingEvent : p
                      );
                      savePosts(eventYear, updatedPosts);
                    }

                    setShowEditEventModal(false);
                    setEditingEvent(null);
                    alert('✅ Tapahtuma päivitetty!');
                  }}
                  className="flex-1 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  💾 Tallenna muutokset
                </button>
                <button
                  onClick={() => {
                    setShowEditEventModal(false);
                    setEditingEvent(null);
                  }}
                  className="bg-gray-200 px-6 py-4 rounded-lg hover:bg-gray-300 font-semibold"
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium">Sisältö</label>
                    <button
                      onClick={async () => {
                        if (!editingTask || isGenerating) return;

                        setIsGenerating(true);
                        const event = (posts[selectedYear] || []).find(p => p.id === editingTask.eventId);
                        if (!event) {
                          setIsGenerating(false);
                          return;
                        }

                        const channel = channels.find(c => c.id === editingTask.task.channel);
                        const prompt = `Luo markkinointiteksti ${channel?.name || editingTask.task.channel}-kanavalle tehtävälle "${editingTask.task.title}".

Tapahtuma: ${event.title}
${event.artist ? `Esiintyjä: ${event.artist}` : ''}
Päivämäärä: ${new Date(event.date).toLocaleDateString('fi-FI')}
${event.time ? `Aika: ${event.time}` : ''}

Luo houkutteleva, lyhyt ja napakka teksti joka sopii ${channel?.name || editingTask.task.channel}-kanavalle. Lisää sopivat hashtagit (#kirkkopuistonterassi #turku). Älä käytä emojeja.`;

                        try {
                          const response = await fetch('/api/claude', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message: prompt })
                          });

                          const data = await response.json();
                          if (response.ok && data.response) {
                            setTaskAiContent(data.response);
                            setEditingTask({
                              ...editingTask,
                              task: { ...editingTask.task, content: data.response }
                            });
                          } else {
                            alert('Virhe generoitaessa sisältöä: ' + (data.error || 'Tuntematon virhe'));
                          }
                        } catch (error) {
                          console.error('Virhe:', error);
                          alert('Virhe generoitaessa sisältöä');
                        } finally {
                          setIsGenerating(false);
                        }
                      }}
                      disabled={isGenerating}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        isGenerating
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {isGenerating ? '⏳ Generoidaan...' : '🔄 Generoi uudelleen'}
                    </button>
                  </div>
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
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Vinkki: Klikkaa "Generoi uudelleen" jos et ole tyytyväinen tekstiin
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">📝 Muistiinpanot</label>
                  <textarea
                    value={editingTask.task.notes || ''}
                    onChange={(e) => {
                      setEditingTask({
                        ...editingTask,
                        task: { ...editingTask.task, notes: e.target.value }
                      });
                    }}
                    className="w-full p-3 border rounded h-24 resize-none"
                    placeholder="Lisää muistiinpanoja tai kommentteja tähän tehtävään... (vapaaehtoinen)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Esim. "Muista lisätä linkki lippukauppaan" tai "Tarkista kuvat Maijalta"
                  </p>
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
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-3">📸 Kuvat: {currentEventForImages.title}</h3>

                {/* Progress bar */}
                {(() => {
                  const completedFormats = imageFormats.filter(f => currentEventForImages.images[f.id]).length;
                  const totalFormats = imageFormats.length;
                  const percentage = (completedFormats / totalFormats) * 100;

                  return (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Edistyminen: {completedFormats} / {totalFormats} kuvaformaattia
                        </span>
                        <span className="text-sm font-bold text-green-600">
                          {Math.round(percentage)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      {completedFormats === totalFormats ? (
                        <p className="text-sm text-green-600 mt-2 font-semibold">
                          ✅ Kaikki kuvat valmiina!
                        </p>
                      ) : (
                        <p className="text-sm text-orange-600 mt-2">
                          ⚠️ Puuttuu vielä {totalFormats - completedFormats} kuvaformaattia
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

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

      {/* Tulostusmodaali */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">🖨️ Tulosta tapahtumalista</h3>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-gray-700">Valitse aikaväli:</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setPrintMode('week')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                    printMode === 'week'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📅 Viikko
                </button>
                <button
                  onClick={() => setPrintMode('month')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                    printMode === 'month'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📆 Kuukausi
                </button>
              </div>
            </div>

            <div className="border-t pt-6 mb-6">
              <div id="printable-area" className="bg-white p-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-green-800">Kirkkopuiston Terassi</h1>
                  <h2 className="text-xl text-gray-600 mt-2">
                    {printMode === 'week' ? 'Viikkolista' : 'Kuukausisuunnitelma'} - {selectedYear}
                  </h2>
                  <p className="text-sm text-gray-500 mt-2">
                    Tulostettu: {new Date().toLocaleDateString('fi-FI')}
                  </p>
                </div>

                {(() => {
                  const allPosts = posts[selectedYear] || [];
                  const today = new Date();

                  let filteredPosts = [];

                  if (printMode === 'week') {
                    // Hae tämän viikon tapahtumat
                    const currentDayOfWeek = today.getDay();
                    const daysToMonday = (currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1);
                    const monday = new Date(today);
                    monday.setDate(today.getDate() - daysToMonday);
                    monday.setHours(0, 0, 0, 0);

                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    sunday.setHours(23, 59, 59, 999);

                    filteredPosts = allPosts.filter(post => {
                      const eventDate = new Date(post.date);
                      return eventDate >= monday && eventDate <= sunday;
                    });
                  } else {
                    // Hae tämän kuukauden tapahtumat
                    const currentMonth = today.getMonth();
                    filteredPosts = allPosts.filter(post => {
                      const eventDate = new Date(post.date);
                      return eventDate.getMonth() === currentMonth;
                    });
                  }

                  if (filteredPosts.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <p>Ei tapahtumia valitulla aikavälillä.</p>
                      </div>
                    );
                  }

                  // Järjestä päivämäärän mukaan
                  filteredPosts.sort((a, b) => new Date(a.date) - new Date(b.date));

                  return (
                    <div className="space-y-6">
                      {filteredPosts.map((event, index) => (
                        <div key={event.id} className="border-2 border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                {index + 1}. {event.title}
                              </h3>
                              {event.artist && (
                                <p className="text-sm text-gray-600">{event.artist}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {new Date(event.date).toLocaleDateString('fi-FI', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long'
                                })}
                              </p>
                              {event.time && (
                                <p className="text-sm text-gray-600">Klo {event.time}</p>
                              )}
                            </div>
                          </div>
                          {event.summary && (
                            <p className="text-sm text-gray-700 mt-2 italic">{event.summary}</p>
                          )}
                          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-gray-500">
                            <span>
                              {event.eventType === 'artist' ? '🎤 Artisti' :
                               event.eventType === 'dj' ? '🎧 DJ' :
                               event.eventType === 'market' ? '🛍️ Kirppis' : '✨ Muu'}
                            </span>
                            <span>
                              {event.tasks?.length || 0} tehtävää
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-bold"
              >
                🖨️ Tulosta
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Sulje
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tämän viikon työtehtävät -modaali */}
      {showWeeklyTasksModal && (() => {
        const today = new Date();
        const currentDayOfWeek = today.getDay();
        const daysToMonday = (currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1);
        const monday = new Date(today);
        monday.setDate(today.getDate() - daysToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        // Hae kaikki tehtävät tältä viikolta
        const allPosts = posts[selectedYear] || [];
        const thisWeekTasks = [];

        allPosts.forEach(post => {
          (post.tasks || []).forEach(task => {
            if (!task.completed && task.dueDate) {
              const dueDate = new Date(task.dueDate);
              if (dueDate >= monday && dueDate <= sunday) {
                const dueDateOnly = new Date(dueDate);
                dueDateOnly.setHours(0, 0, 0, 0);
                const diffTime = dueDateOnly - new Date().setHours(0, 0, 0, 0);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let urgency = 'normal';
                if (diffDays < 0) urgency = 'overdue';
                else if (diffDays <= 1) urgency = 'urgent';
                else if (diffDays <= 3) urgency = 'soon';

                thisWeekTasks.push({
                  task,
                  event: post,
                  dueDate: task.dueDate,
                  dueTime: task.dueTime,
                  diffDays,
                  urgency
                });
              }
            }
          });
        });

        // Järjestä deadlinen mukaan
        thisWeekTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold">📋 Tämän viikon työtehtävät</h3>
                <button
                  onClick={() => setShowWeeklyTasksModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900">
                  📅 {monday.toLocaleDateString('fi-FI', { day: 'numeric', month: 'long' })} - {sunday.toLocaleDateString('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs text-gray-700 mt-1">
                  Yhteensä {thisWeekTasks.length} tehtävää
                </p>
              </div>

              {thisWeekTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-4">🎉</p>
                  <p className="text-lg font-medium">Ei tehtäviä tällä viikolla!</p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {thisWeekTasks.map((item, idx) => {
                    const channel = channels.find(c => c.id === item.task.channel);
                    return (
                      <div
                        key={idx}
                        className={`border-2 rounded-lg p-3 md:p-4 ${
                          item.urgency === 'overdue' ? 'bg-red-50 border-red-300' :
                          item.urgency === 'urgent' ? 'bg-orange-50 border-orange-300' :
                          item.urgency === 'soon' ? 'bg-yellow-50 border-yellow-300' :
                          'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm md:text-base">{item.task.title}</h4>
                            <p className="text-xs md:text-sm text-gray-600 mt-1">
                              📅 {item.event.title} {item.event.artist && `- ${item.event.artist}`}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`${channel?.color || 'bg-gray-500'} text-white px-2 py-0.5 rounded text-xs`}>
                                {channel?.name || item.task.channel}
                              </span>
                              {item.task.assignee && (
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                  👤 {item.task.assignee}
                                </span>
                              )}
                              <span className="text-xs text-gray-600">
                                {new Date(item.dueDate).toLocaleDateString('fi-FI')} {item.dueTime && `klo ${item.dueTime}`}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs font-semibold">
                            {item.diffDays < 0 ? (
                              <span className="text-red-600">🔴 Myöhässä {Math.abs(item.diffDays)} pv</span>
                            ) : item.diffDays === 0 ? (
                              <span className="text-orange-600">🟠 Tänään!</span>
                            ) : item.diffDays === 1 ? (
                              <span className="text-orange-600">🟡 Huomenna</span>
                            ) : (
                              <span className="text-gray-600">{item.diffDays} päivän päästä</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={generateWeeklyTasksPDF}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-bold"
                >
                  📄 Lataa PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-bold"
                >
                  🖨️ Tulosta
                </button>
                <button
                  onClick={() => setShowWeeklyTasksModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Sulje
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Vienti/tulostusmodaali */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-2xl font-bold mb-6">📤 Vie tai tulosta tapahtumat</h3>

            <div className="space-y-4 mb-6">
              {/* Päivämääräväli */}
              <div>
                <label className="block text-sm font-semibold mb-2">Valitse aikaväli</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Alkupäivä</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Loppupäivä</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Jätä tyhjäksi jos haluat viedä kaikki {selectedYear} vuoden tapahtumat
                </p>
              </div>

              {/* Sisällytä tehtävät */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <input
                  type="checkbox"
                  id="exportIncludeTasks"
                  checked={exportIncludeTasks}
                  onChange={(e) => setExportIncludeTasks(e.target.checked)}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="exportIncludeTasks" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Sisällytä tehtävätiedot (tehtävien määrä, valmiit tehtävät)
                </label>
              </div>
            </div>

            {/* Toimintonapit */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    exportToExcel(exportStartDate, exportEndDate, exportIncludeTasks);
                    setShowExportModal(false);
                  }}
                  className="bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-bold"
                >
                  📊 Excel
                </button>
                <button
                  onClick={() => {
                    exportToCSV(exportStartDate, exportEndDate, exportIncludeTasks);
                    setShowExportModal(false);
                  }}
                  className="bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 font-bold"
                >
                  📄 CSV
                </button>
                <button
                  onClick={() => {
                    setShowExportModal(false);
                    setShowPrintModal(true);
                  }}
                  className="bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-bold"
                >
                  🖨️ Tulosta
                </button>
              </div>

              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportStartDate('');
                  setExportEndDate('');
                  setExportIncludeTasks(true);
                }}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Peruuta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Somepostauksen lisäys/muokkausmodaali */}
      {showAddSocialPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              {editingSocialPost ? '✏️ Muokkaa somepostausta' : '📱 Lisää somepostaus'}
            </h3>

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

              {/* Vastuuhenkilö */}
              <div>
                <label className="block text-sm font-semibold mb-2">Vastuuhenkilö</label>
                <select
                  value={newSocialPost.assignee}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, assignee: e.target.value })}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Valitse henkilö...</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </div>

              {/* Linkitys tapahtumaan */}
              <div>
                <label className="block text-sm font-semibold mb-2">Linkitä tapahtumaan (valinnainen)</label>
                <select
                  value={newSocialPost.linkedEventId || ''}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, linkedEventId: e.target.value || null })}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Ei linkitetty tapahtumaan</option>
                  {(posts[selectedYear] || []).map(event => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {new Date(event.date).toLocaleDateString('fi-FI')}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Linkitä postaus tapahtumaan jos se liittyy johonkin tiettyyn tapahtumaan
                </p>
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

              {/* Toisto */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <label className="block text-sm font-semibold mb-3 text-purple-900">🔁 Toisto</label>
                <div className="space-y-3">
                  <select
                    value={newSocialPost.recurrence}
                    onChange={(e) => setNewSocialPost({ ...newSocialPost, recurrence: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="none">Ei toistoa</option>
                    <option value="weekly">📅 Viikoittain</option>
                    <option value="monthly">📆 Kuukausittain</option>
                  </select>

                  {(newSocialPost.recurrence === 'weekly' || newSocialPost.recurrence === 'monthly') && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Toista mihin päivään asti?</label>
                      <input
                        type="date"
                        value={newSocialPost.recurrenceEndDate}
                        onChange={(e) => setNewSocialPost({ ...newSocialPost, recurrenceEndDate: e.target.value })}
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        {newSocialPost.recurrence === 'weekly' && 'Luo automaattisesti sama postaus joka viikko samana viikonpäivänä.'}
                        {newSocialPost.recurrence === 'monthly' && 'Luo automaattisesti sama postaus joka kuukausi samana päivänä.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Caption/Teksti */}
              <div>
                <label className="block text-sm font-semibold mb-2">Caption / Postauksen teksti</label>
                <textarea
                  value={newSocialPost.caption}
                  onChange={(e) => {
                    setNewSocialPost({ ...newSocialPost, caption: e.target.value });
                    setPolishedVersions(null); // Nollaa versiot kun käyttäjä muokkaa tekstiä
                  }}
                  rows={4}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Kirjoita postauksen teksti..."
                />

                {/* AI-viimeistely nappi */}
                <button
                  type="button"
                  onClick={polishCaptionWithAI}
                  disabled={polishingCaption || !newSocialPost.caption}
                  className={`mt-2 px-4 py-2 rounded-lg font-semibold transition ${
                    polishingCaption || !newSocialPost.caption
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {polishingCaption ? '🤖 Viimeistellään...' : '✨ Viimeistele AI:lla'}
                </button>

                {/* Viimeistellyt versiot */}
                {polishedVersions && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Valitse versio:</p>

                    {/* Lyhyt versio */}
                    <div className="border-2 border-purple-200 rounded-lg p-3 hover:border-purple-400 cursor-pointer transition"
                         onClick={() => selectPolishedVersion(polishedVersions.short)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-600">📱 LYHYT (klikkaa kopioidaksesi)</span>
                        <span className="text-xs text-gray-500">{polishedVersions.short.length} merkkiä</span>
                      </div>
                      <p className="text-sm text-gray-700">{polishedVersions.short}</p>
                    </div>

                    {/* Keskipitkä versio */}
                    <div className="border-2 border-purple-200 rounded-lg p-3 hover:border-purple-400 cursor-pointer transition"
                         onClick={() => selectPolishedVersion(polishedVersions.medium)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-600">📸 KESKIPITKÄ (klikkaa kopioidaksesi)</span>
                        <span className="text-xs text-gray-500">{polishedVersions.medium.length} merkkiä</span>
                      </div>
                      <p className="text-sm text-gray-700">{polishedVersions.medium}</p>
                    </div>

                    {/* Pitkä versio */}
                    <div className="border-2 border-purple-200 rounded-lg p-3 hover:border-purple-400 cursor-pointer transition"
                         onClick={() => selectPolishedVersion(polishedVersions.long)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-600">📝 PITKÄ (klikkaa kopioidaksesi)</span>
                        <span className="text-xs text-gray-500">{polishedVersions.long.length} merkkiä</span>
                      </div>
                      <p className="text-sm text-gray-700">{polishedVersions.long}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPolishedVersions(null)}
                      className="text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      Sulje versiot
                    </button>
                  </div>
                )}
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
                  setEditingSocialPost(null);
                  setNewSocialPost({
                    title: '',
                    date: '',
                    time: '',
                    type: 'viikko-ohjelma',
                    channels: [],
                    assignee: '',
                    linkedEventId: null,
                    status: 'suunniteltu',
                    caption: '',
                    notes: '',
                    mediaLinks: []
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

      {/* PWA Asennusprompt */}
      <InstallPrompt />
    </div>
  );
}

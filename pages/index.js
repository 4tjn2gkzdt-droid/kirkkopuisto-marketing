import React, { useState, useEffect } from 'react';

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

  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  
  const channels = [
    { id: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
    { id: 'facebook', name: 'Facebook', color: 'bg-blue-500' },
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

  useEffect(() => {
    const loadYear = () => {
      const stored = localStorage.getItem(`posts-${selectedYear}`);
      if (stored) {
        setPosts(prev => ({ ...prev, [selectedYear]: JSON.parse(stored) }));
      } else {
        setPosts(prev => ({ ...prev, [selectedYear]: [] }));
      }
    };
    loadYear();
  }, [selectedYear]);

  const savePosts = (year, updatedPosts) => {
    localStorage.setItem(`posts-${year}`, JSON.stringify(updatedPosts));
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
      { id: `t1-${Date.now()}-${Math.random()}`, title: 'Turun tapahtumakalenteri', channel: 'turku-calendar', dueDate: formatDate(fourWeeks), dueTime: '10:00', completed: false, content: '' },
      { id: `t2-${Date.now()}-${Math.random()}`, title: 'TS Menovinkit', channel: 'ts-meno', dueDate: formatDate(fourWeeks), dueTime: '11:00', completed: false, content: '' },
      { id: `t3-${Date.now()}-${Math.random()}`, title: 'Instagram-postaus', channel: 'instagram', dueDate: formatDate(oneWeek), dueTime: '10:00', completed: false, content: '' },
      { id: `t4-${Date.now()}-${Math.random()}`, title: 'Facebook-tapahtuma', channel: 'facebook', dueDate: formatDate(oneWeek), dueTime: '11:00', completed: false, content: '' },
      { id: `t5-${Date.now()}-${Math.random()}`, title: 'TikTok-video', channel: 'instagram', dueDate: formatDate(fiveDays), dueTime: '14:00', completed: false, content: '' },
      { id: `t6-${Date.now()}-${Math.random()}`, title: 'Facebook-postaus', channel: 'facebook', dueDate: formatDate(threeDays), dueTime: '12:00', completed: false, content: '' },
      { id: `t7-${Date.now()}-${Math.random()}`, title: 'Instagram Story', channel: 'instagram', dueDate: formatDate(oneDay), dueTime: '18:00', completed: false, content: '' }
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

  const handleImport = () => {
    const parsed = parseImportedData(importText);
    if (parsed.length === 0) {
      alert('Ei voitu lukea tapahtumia');
      return;
    }
    
    const currentPosts = posts[selectedYear] || [];
    savePosts(selectedYear, [...currentPosts, ...parsed]);
    
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
    setTaskAiContent('​​​​​​​​​​​​​​​​

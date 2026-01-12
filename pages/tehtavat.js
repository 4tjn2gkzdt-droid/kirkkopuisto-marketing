import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Tehtavat() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Suodattimet
  const [filterChannel, setFilterChannel] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, completed, pending
  const [sortBy, setSortBy] = useState('deadline'); // deadline, channel, assignee

  // Lataa tehtävät ja vastuuhenkilöt
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    if (supabase) {
      // Hae kaikki tehtävät ja niihin liittyvät tapahtumat
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          events (
            id,
            title,
            date
          )
        `)
        .order('due_date', { ascending: true });

      if (tasksError) {
        console.error('Virhe ladattaessa tehtäviä:', tasksError);
      } else {
        setTasks(tasksData || []);
        setFilteredTasks(tasksData || []);
      }

      // Hae vastuuhenkilöt
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .order('name');

      if (membersError) {
        console.error('Virhe ladattaessa vastuuhenkilöitä:', membersError);
      } else {
        setTeamMembers(membersData || []);
      }
    } else {
      // Fallback localStorageen
      const storedData = JSON.parse(localStorage.getItem('posts') || '{}');
      const allTasks = [];

      Object.values(storedData).forEach(yearPosts => {
        yearPosts.forEach(event => {
          if (event.tasks) {
            event.tasks.forEach(task => {
              allTasks.push({
                ...task,
                events: {
                  id: event.id,
                  title: event.title,
                  date: event.date
                }
              });
            });
          }
        });
      });

      setTasks(allTasks);
      setFilteredTasks(allTasks);
    }

    setLoading(false);
  };

  // Suodata ja järjestä tehtävät
  useEffect(() => {
    let filtered = [...tasks];

    // Suodata kanavan mukaan
    if (filterChannel) {
      filtered = filtered.filter(task => task.channel === filterChannel);
    }

    // Suodata vastuuhenkilön mukaan
    if (filterAssignee) {
      filtered = filtered.filter(task => task.assignee === filterAssignee);
    }

    // Suodata statuksen mukaan
    if (filterStatus === 'completed') {
      filtered = filtered.filter(task => task.completed);
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(task => !task.completed);
    }

    // Järjestä
    filtered.sort((a, b) => {
      if (sortBy === 'deadline') {
        return new Date(a.due_date) - new Date(b.due_date);
      } else if (sortBy === 'channel') {
        return a.channel.localeCompare(b.channel);
      } else if (sortBy === 'assignee') {
        return (a.assignee || '').localeCompare(b.assignee || '');
      }
      return 0;
    });

    setFilteredTasks(filtered);
  }, [tasks, filterChannel, filterAssignee, filterStatus, sortBy]);

  // Vaihda tehtävän tila
  const toggleTaskStatus = async (taskId, currentStatus) => {
    if (supabase) {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !currentStatus })
        .eq('id', taskId);

      if (error) {
        console.error('Virhe päivitettäessä tehtävää:', error);
      } else {
        loadData();
      }
    } else {
      // LocalStorage-päivitys
      const storedData = JSON.parse(localStorage.getItem('posts') || '{}');
      let updated = false;

      Object.keys(storedData).forEach(year => {
        storedData[year].forEach(event => {
          if (event.tasks) {
            event.tasks.forEach(task => {
              if (task.id === taskId) {
                task.completed = !currentStatus;
                updated = true;
              }
            });
          }
        });
      });

      if (updated) {
        localStorage.setItem('posts', JSON.stringify(storedData));
        loadData();
      }
    }
  };

  // Hae uniikit kanavat
  const uniqueChannels = [...new Set(tasks.map(t => t.channel))].sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-center text-gray-600">Ladataan tehtäviä...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Otsikko ja navigaatio */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">📋 Kaikki tehtävät</h1>
          <div className="space-x-4">
            <Link href="/" className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              ← Etusivu
            </Link>
            <Link href="/henkilot" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              👥 Henkilöt
            </Link>
            <Link href="/ideoi" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              💡 Ideoi
            </Link>
          </div>
        </div>

        {/* Suodattimet ja järjestys */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Suodattimet ja järjestys</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Kanavasuodatin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kanava
              </label>
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Kaikki kanavat</option>
                {uniqueChannels.map(channel => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
            </div>

            {/* Vastuuhenkilösuodatin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vastuuhenkilö
              </label>
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Kaikki henkilöt</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>
            </div>

            {/* Statussuodatin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tila
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">Kaikki tehtävät</option>
                <option value="pending">Keskeneräiset</option>
                <option value="completed">Valmiit</option>
              </select>
            </div>

            {/* Järjestys */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Järjestys
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="deadline">Deadline</option>
                <option value="channel">Kanava</option>
                <option value="assignee">Vastuuhenkilö</option>
              </select>
            </div>
          </div>

          {/* Tilastot */}
          <div className="mt-4 flex gap-4 text-sm text-gray-600">
            <span>Yhteensä: {tasks.length} tehtävää</span>
            <span>Näytetään: {filteredTasks.length} tehtävää</span>
            <span>Valmiit: {tasks.filter(t => t.completed).length}</span>
            <span>Keskeneräiset: {tasks.filter(t => !t.completed).length}</span>
          </div>
        </div>

        {/* Tehtävälista */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              Ei tehtäviä valituilla suodattimilla
            </div>
          ) : (
            filteredTasks.map(task => (
              <div
                key={task.id}
                className={`bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow ${
                  task.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={task.completed || false}
                      onChange={() => toggleTaskStatus(task.id, task.completed)}
                      className="mt-1 w-5 h-5 cursor-pointer"
                    />

                    {/* Tehtävän tiedot */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-semibold text-lg ${task.completed ? 'line-through' : ''}`}>
                          {task.title}
                        </h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {task.channel}
                        </span>
                        {task.assignee && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            👤 {task.assignee}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-2">
                        📅 Tapahtuma: <span className="font-medium">{task.events?.title || 'Ei tapahtumaa'}</span>
                        {task.events?.date && ` (${new Date(task.events.date).toLocaleDateString('fi-FI')})`}
                      </p>

                      <p className="text-gray-600 text-sm">
                        ⏰ Deadline: <span className="font-medium">{new Date(task.due_date).toLocaleDateString('fi-FI')}</span>
                        {task.due_time && ` klo ${task.due_time}`}
                      </p>

                      {task.content && (
                        <p className="text-gray-500 text-sm mt-2">{task.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

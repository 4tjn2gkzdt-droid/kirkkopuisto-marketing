/**
 * Suodatus-apufunktiot
 * Sisältää tapahtumien, tehtävien ja somepostausten suodattamiseen liittyviä funktioita
 */

// Apufunktio: Parsii YYYY-MM-DD stringin paikalliseksi Date-objektiksi (ei UTC)
// Välttää aikavyöhykeongelmia, joissa päivämäärä siirtyy päivällä
function parseLocalDate(dateString) {
  if (!dateString) return new Date()
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Suodattaa tapahtumat hakutermin ja aikasuodatuksen perusteella
 * @param {Array} posts - Tapahtumat
 * @param {Object} filters - Suodatusasetukset
 * @param {string} filters.searchQuery - Hakutermi
 * @param {boolean} filters.showPastEvents - Näytetäänkö menneet tapahtumat
 * @param {string} filters.contentFilter - Sisältötyyppi ('all', 'events', 'social')
 * @returns {Array} - Suodatetut tapahtumat
 */
export const filterPosts = (posts, filters = {}) => {
  const { searchQuery = '', showPastEvents = false, contentFilter = 'all' } = filters;
  let currentPosts = [...posts];

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
      const eventDate = parseLocalDate(post.date);
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

/**
 * Hakee tapahtumille päivälle
 * @param {Date} date - Päivämäärä
 * @param {Array} allPosts - Kaikki tapahtumat
 * @returns {Array} - Päivän tapahtumat
 */
export const getEventsForDate = (date, allPosts = []) => {
  if (!date) return [];
  // Muodosta päivämäärä-string paikallisesta ajasta (ei UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return allPosts.filter(post => post.date === dateStr);
};

/**
 * Suodattaa somepostaukset
 * @param {Array} socialPosts - Somepostaukset
 * @param {Object} filters - Suodatusasetukset
 * @returns {Array} - Suodatetut somepostaukset
 */
export const filterSocialPosts = (socialPosts, filters = {}) => {
  const {
    contentFilter = 'all',
    showPastEvents = false,
    assigneeFilter = 'all',
    date = null
  } = filters;

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
      const postDate = parseLocalDate(post.date);
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

  // Päivämäärän suodatus
  if (date) {
    // Muodosta päivämäärä-string paikallisesta ajasta (ei UTC)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    filteredSocialPosts = filteredSocialPosts.filter(post => post.date === dateStr);
  }

  return filteredSocialPosts;
};

/**
 * Hakee somepostaukset päivälle
 * @param {Date} date - Päivämäärä
 * @param {Array} socialPosts - Somepostaukset
 * @param {Object} filters - Suodatusasetukset
 * @returns {Array} - Päivän somepostaukset
 */
export const getSocialPostsForDate = (date, socialPosts = [], filters = {}) => {
  if (!date) return [];
  return filterSocialPosts(socialPosts, { ...filters, date });
};

/**
 * Hakee lähestyvät deadlinet
 * @param {Array} posts - Tapahtumat
 * @returns {Array} - Deadlinet kiireellisyysjärjestyksessä
 */
export const getUpcomingDeadlines = (posts = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlines = [];

  posts.forEach(post => {
    (post.tasks || []).forEach(task => {
      if (!task.completed && task.dueDate) {
        const dueDate = parseLocalDate(task.dueDate);
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

  return deadlines.sort((a, b) => parseLocalDate(a.dueDate) - parseLocalDate(b.dueDate));
};

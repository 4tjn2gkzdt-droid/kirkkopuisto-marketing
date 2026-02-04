/**
 * Päivämäärä-apufunktiot
 * Sisältää kalenterinäkymien ja päivämäärien käsittelyyn liittyviä funktioita
 */

/**
 * Palauttaa kuukauden päivät kalenterinäkymää varten
 * @param {number} year - Vuosi
 * @param {number} month - Kuukausi (0-11)
 * @returns {Array<Date|null>} - Array päivistä, null tyhjille soluille
 */
export const getDaysInMonth = (year, month) => {
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

/**
 * Palauttaa viikon päivät (ma-su)
 * @param {Date} date - Mikä tahansa päivä viikolla
 * @returns {Array<Date>} - Array viikon päivistä
 */
export const getWeekDays = (date) => {
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

/**
 * Muotoilee päivämäärän suomalaiseen muotoon
 * @param {Date|string} date - Päivämäärä
 * @returns {string} - Muotoiltu päivämäärä (esim. "15.1.2026")
 */
export const formatDateFI = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
};

/**
 * Muotoilee päivämäärän ISO-muotoon (YYYY-MM-DD)
 * @param {Date} date - Päivämäärä
 * @returns {string} - ISO-muotoinen päivämäärä
 */
export const formatDateISO = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Tarkistaa onko päivämäärä tänään
 * @param {Date|string} date - Päivämäärä
 * @returns {boolean}
 */
export const isToday = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compareDate = typeof date === 'string' ? new Date(date) : new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  return today.getTime() === compareDate.getTime();
};

/**
 * Tarkistaa onko päivämäärä tulevaisuudessa
 * @param {Date|string} date - Päivämäärä
 * @returns {boolean}
 */
export const isFutureDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compareDate = typeof date === 'string' ? new Date(date) : new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  return compareDate >= today;
};

/**
 * Laskee päivien eron kahden päivämäärän välillä
 * @param {Date|string} date1 - Ensimmäinen päivämäärä
 * @param {Date|string} date2 - Toinen päivämäärä
 * @returns {number} - Päivien lukumäärä
 */
export const getDaysDiff = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : new Date(date1);
  const d2 = typeof date2 === 'string' ? new Date(date2) : new Date(date2);

  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);

  const diffTime = d2 - d1;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

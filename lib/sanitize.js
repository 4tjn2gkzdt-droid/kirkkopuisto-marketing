/**
 * XSS-suojaus: Sanitoi HTML-sisältö DOMPurify-kirjastolla
 * Käytä tätä aina kun renderöit HTML:ää dangerouslySetInnerHTML:llä
 */
import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitoi HTML-merkkijono poistamalla vaaralliset elementit ja attribuutit
 * @param {string} dirty - Raaka HTML-sisältö
 * @param {Object} config - DOMPurify-konfiguraatio (valinnainen)
 * @returns {string} - Sanitoitu HTML-sisältö
 */
export function sanitizeHtml(dirty, config = {}) {
  if (!dirty || typeof dirty !== 'string') {
    return ''
  }

  // Oletuskonfiguraatio: Salli perus-HTML-tagit, mutta estä vaaralliset skriptit
  const defaultConfig = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'div', 'span', 'hr'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'target', 'rel', 'width', 'height'
    ],
    ALLOW_DATA_ATTR: false,
    // Estä JavaScript-linkit
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ...config
  }

  return DOMPurify.sanitize(dirty, defaultConfig)
}

/**
 * Sanitoi HTML sallien kaikki turvalliset tagit (esim. uutiskirjeet)
 * @param {string} dirty - Raaka HTML-sisältö
 * @returns {string} - Sanitoitu HTML-sisältö
 */
export function sanitizeRichHtml(dirty) {
  return sanitizeHtml(dirty, {
    ALLOWED_TAGS: false, // Salli kaikki tagit paitsi vaaralliset
    ALLOWED_ATTR: false,  // Salli kaikki attribuutit paitsi vaaralliset
    KEEP_CONTENT: true,   // Säilytä sisältö vaikka tagi poistetaan
  })
}

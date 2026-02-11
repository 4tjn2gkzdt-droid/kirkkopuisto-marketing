/**
 * Logger-moduuli ympäristökohtaiseen loggaukseen
 *
 * Käyttö:
 * import logger from '@/lib/logger'
 * logger.info('General info')
 * logger.error('Error occurred', error)
 * logger.debug('Debug info with data', { data })
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Sanitoi herkän datan objektista tai stringistä
 */
function sanitize(data) {
  if (!data) return data;

  // Jos data on objekti
  if (typeof data === 'object') {
    const sanitized = { ...data };

    // Piilota herkkä tieto
    const sensitiveKeys = ['email', 'password', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret'];

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }

      // Rekursiivisesti sanitoi sisäkkäiset objektit
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }

  // Jos data on string ja näyttää sähköpostilta tai tokenilta
  if (typeof data === 'string') {
    // Piilota sähköpostit
    if (data.includes('@')) {
      return data.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
    }

    // Piilota long tokenit (yli 32 merkkiä ilman välilyöntejä)
    if (data.length > 32 && !/\s/.test(data) && /^[A-Za-z0-9_\-\.]+$/.test(data)) {
      return `${data.substring(0, 8)}...[REDACTED]`;
    }
  }

  return data;
}

/**
 * Formatoi log-viestin prefiksillä
 */
function formatMessage(level, prefix, message) {
  const timestamp = new Date().toISOString();
  const prefixStr = prefix ? `[${prefix}] ` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${prefixStr}${message}`;
}

const logger = {
  /**
   * Info-tason loggaus (näkyy vain developmentissa)
   */
  info: (message, ...args) => {
    if (isDevelopment) {
      const sanitizedArgs = args.map(sanitize);
      console.log(message, ...sanitizedArgs);
    }
  },

  /**
   * Debug-tason loggaus (näkyy vain developmentissa)
   */
  debug: (message, ...args) => {
    if (isDevelopment) {
      const sanitizedArgs = args.map(sanitize);
      console.debug(message, ...sanitizedArgs);
    }
  },

  /**
   * Warning-tason loggaus (näkyy vain developmentissa)
   */
  warn: (message, ...args) => {
    if (isDevelopment) {
      const sanitizedArgs = args.map(sanitize);
      console.warn(message, ...sanitizedArgs);
    }
  },

  /**
   * Error-tason loggaus (näkyy aina, mutta sanitoidaan tuotannossa)
   */
  error: (message, ...args) => {
    if (isDevelopment) {
      // Developmentissa näytä kaikki
      console.error(message, ...args);
    } else {
      // Tuotannossa sanitoi
      const sanitizedArgs = args.map(sanitize);
      console.error(message, ...sanitizedArgs);
    }
  },

  /**
   * Prefixed logger - luo loggerin joka lisää prefix kaikkiin viesteihin
   * Esim: logger.withPrefix('[AUTH]').info('Checking session')
   */
  withPrefix: (prefix) => ({
    info: (message, ...args) => logger.info(`[${prefix}] ${message}`, ...args),
    debug: (message, ...args) => logger.debug(`[${prefix}] ${message}`, ...args),
    warn: (message, ...args) => logger.warn(`[${prefix}] ${message}`, ...args),
    error: (message, ...args) => logger.error(`[${prefix}] ${message}`, ...args),
  }),
};

export default logger;

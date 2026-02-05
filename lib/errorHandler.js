/**
 * Yhtenäinen virheenkäsittely API-routeille
 */

import logger from './logger'

/**
 * Virhetyypit ja HTTP-statuskoodit
 */
export const ErrorTypes = {
  VALIDATION: { status: 400, type: 'ValidationError' },
  AUTHENTICATION: { status: 401, type: 'AuthenticationError' },
  FORBIDDEN: { status: 403, type: 'ForbiddenError' },
  NOT_FOUND: { status: 404, type: 'NotFoundError' },
  RATE_LIMIT: { status: 429, type: 'RateLimitError' },
  SERVER_ERROR: { status: 500, type: 'ServerError' },
  DATABASE_ERROR: { status: 500, type: 'DatabaseError' },
  EXTERNAL_API_ERROR: { status: 502, type: 'ExternalAPIError' }
}

/**
 * Luo standardoidun virheobjektin
 */
export class AppError extends Error {
  constructor(message, errorType = ErrorTypes.SERVER_ERROR, details = null) {
    super(message)
    this.name = errorType.type
    this.status = errorType.status
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

/**
 * Analysoi Claude API -virheet
 */
function parseClaudeError(error) {
  const status = error.status || error.statusCode

  if (status === 401) {
    return new AppError(
      'API-avain on virheellinen tai puuttuu',
      ErrorTypes.AUTHENTICATION,
      { originalError: error.message, help: 'Tarkista ANTHROPIC_API_KEY ympäristömuuttuja' }
    )
  }

  if (status === 429) {
    return new AppError(
      'API rate limit ylitetty',
      ErrorTypes.RATE_LIMIT,
      { originalError: error.message, help: 'Odota hetki ennen uutta yritystä' }
    )
  }

  if (error.error?.type === 'overloaded_error') {
    return new AppError(
      'Claude API on ylikuormitettu',
      ErrorTypes.EXTERNAL_API_ERROR,
      { originalError: error.message, help: 'Yritä uudelleen hetken kuluttua' }
    )
  }

  return new AppError(
    'Virhe Claude API -pyynnössä',
    ErrorTypes.EXTERNAL_API_ERROR,
    { originalError: error.message, status }
  )
}

/**
 * Analysoi Supabase-virheet
 */
function parseSupabaseError(error) {
  // PGRST virheet (PostgREST)
  if (error.code?.startsWith('PGRST')) {
    return new AppError(
      'Tietokantavirhe',
      ErrorTypes.DATABASE_ERROR,
      { originalError: error.message, code: error.code }
    )
  }

  // Auth virheet
  if (error.message?.includes('Invalid login credentials')) {
    return new AppError(
      'Virheelliset kirjautumistiedot',
      ErrorTypes.AUTHENTICATION,
      { originalError: error.message }
    )
  }

  if (error.message?.includes('JWT')) {
    return new AppError(
      'Istunto on vanhentunut',
      ErrorTypes.AUTHENTICATION,
      { originalError: error.message, help: 'Kirjaudu uudelleen sisään' }
    )
  }

  // Yleiset tietokantavirheet
  return new AppError(
    'Tietokantavirhe',
    ErrorTypes.DATABASE_ERROR,
    { originalError: error.message }
  )
}

/**
 * Muotoilee virheen API-vastaukseksi
 */
export function formatErrorResponse(error) {
  // Jos kyseessä on jo AppError
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      type: error.name,
      details: error.details,
      timestamp: error.timestamp
    }
  }

  // Claude API virheet
  if (error.status || error.error?.type) {
    const claudeError = parseClaudeError(error)
    return formatErrorResponse(claudeError)
  }

  // Supabase virheet
  if (error.code || error.message?.includes('PGRST')) {
    const supabaseError = parseSupabaseError(error)
    return formatErrorResponse(supabaseError)
  }

  // Yleiset virheet
  return {
    success: false,
    error: error.message || 'Tuntematon virhe',
    type: 'ServerError',
    timestamp: new Date().toISOString()
  }
}

/**
 * API handler wrapper joka käsittelee virheet automaattisesti
 */
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res)
    } catch (error) {
      logger.error('API Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      })

      const errorResponse = formatErrorResponse(error)
      const status = error.status || error.statusCode || 500

      return res.status(status).json(errorResponse)
    }
  }
}

/**
 * Yhdistetty CORS + virheenkäsittely wrapper
 */
export function withCorsAndErrorHandling(handler) {
  return async (req, res) => {
    // CORS headerit
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    )

    // OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    try {
      return await handler(req, res)
    } catch (error) {
      logger.error('API Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      })

      const errorResponse = formatErrorResponse(error)
      const status = error.status || error.statusCode || 500

      return res.status(status).json(errorResponse)
    }
  }
}

/**
 * Validointifunktiot
 */
export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new AppError(
      `${fieldName} on pakollinen kenttä`,
      ErrorTypes.VALIDATION
    )
  }
  return value
}

export function validateArray(value, fieldName, minLength = 1) {
  if (!Array.isArray(value) || value.length < minLength) {
    throw new AppError(
      `${fieldName} täytyy olla taulukko vähintään ${minLength} elementillä`,
      ErrorTypes.VALIDATION
    )
  }
  return value
}

export function validateApiKey(apiKey) {
  if (!apiKey) {
    throw new AppError(
      'API-avain puuttuu',
      ErrorTypes.AUTHENTICATION,
      { help: 'Tarkista ANTHROPIC_API_KEY ympäristömuuttuja' }
    )
  }

  if (!apiKey.startsWith('sk-ant-')) {
    throw new AppError(
      'Virheellinen API-avain',
      ErrorTypes.AUTHENTICATION,
      { help: 'API-avaimen pitää alkaa "sk-ant-"' }
    )
  }

  return apiKey
}

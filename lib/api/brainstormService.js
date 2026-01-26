/**
 * Brainstorming Service
 * Palvelut brainstorming-toiminnallisuudelle:
 * - Historiallisen sisällön hallinta
 * - Kontekstin kerääminen AI:lle
 * - Ideoiden tallennus
 */

import { supabase } from '../supabase'
import { supabaseAdmin } from '../supabase-admin'

/**
 * Hakee historiallista sisältöä AI-kontekstia varten
 * @param {Object} options - Hakuparametrit
 * @param {string[]} options.types - Sisältötyypit (news, newsletter, article, social_post, campaign)
 * @param {number} options.year - Vuosi (esim. 2024, 2023)
 * @param {number} options.limit - Maksimimäärä tuloksia
 * @param {Object} options.client - Supabase client (käyttäjäkohtainen tai globaali)
 * @returns {Promise<Array>} Historiallinen sisältö
 */
export async function getHistoricalContent(options = {}) {
  const {
    types = ['news', 'newsletter', 'article'],
    year = null,
    limit = 50,
    isActive = true,
    client = supabase
  } = options

  try {
    let query = client
      .from('historical_content')
      .select('*')
      .in('type', types)
      .order('publish_date', { ascending: false })

    if (year) {
      query = query.eq('year', year)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive)
    }

    query = query.limit(limit)

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching historical content:', error)
    throw error
  }
}

/**
 * Hakee aikaisempien vuosien tapahtumia markkinointikontekstia varten
 * @param {number[]} years - Vuodet (esim. [2024, 2023, 2022])
 * @returns {Promise<Array>} Tapahtumat
 */
export async function getHistoricalEvents(years = []) {
  try {
    let query = supabase
      .from('events')
      .select(`
        id,
        title,
        artist,
        year,
        date,
        event_instances (
          date,
          start_time,
          end_time
        )
      `)
      .order('year', { ascending: false })
      .order('date', { ascending: false })

    if (years.length > 0) {
      query = query.in('year', years)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching historical events:', error)
    throw error
  }
}

/**
 * Hakee brändiohjeet AI-kontekstia varten
 * @returns {Promise<Array>} Brändiohjeet
 */
export async function getBrandGuidelines() {
  try {
    const { data, error } = await supabase
      .from('brand_guidelines')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'uploaded')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching brand guidelines:', error)
    throw error
  }
}

/**
 * Rakentaa rikkaan kontekstin AI:lle brainstorming-keskustelua varten
 * @param {Object} options - Kontekstiasetukset
 * @param {Object} options.client - Supabase client (käyttäjäkohtainen tai globaali)
 * @returns {Promise<string>} Muotoiltu konteksti AI:lle
 */
export async function buildBrainstormContext(options = {}) {
  const {
    includeHistoricalContent = true,
    includeSocialPosts = true,
    includeEvents = true,
    includeBrandGuidelines = true,
    contentYears = [2024, 2023],
    eventYears = [2025, 2024, 2023],
    client = supabase
  } = options

  let contextParts = []

  try {
    // 1. Historiallinen sisältö (uutiset, uutiskirjeet)
    if (includeHistoricalContent) {
      const historicalContent = await getHistoricalContent({
        types: ['news', 'newsletter', 'article'],
        limit: 30,
        client
      })

      if (historicalContent.length > 0) {
        contextParts.push('# HISTORIALLINEN SISÄLTÖ (Uutiset ja uutiskirjeet)\n')
        contextParts.push('Käytä näitä aikaisempia uutisia ja uutiskirjeitä inspiraationa ja tyylin mallina:\n\n')

        historicalContent.forEach(item => {
          contextParts.push(`## ${item.title} (${item.type}, ${item.publish_date || item.year})`)
          if (item.summary) {
            contextParts.push(`Yhteenveto: ${item.summary}`)
          }
          if (item.url) {
            contextParts.push(`Lähde: ${item.url}`)
          }
          contextParts.push(`\n${item.content.substring(0, 500)}...\n\n`)
        })
      }
    }

    // 1.5. Sosiaalisen median postaukset (Instagram & Facebook)
    if (includeSocialPosts) {
      const socialPosts = await getHistoricalContent({
        types: ['social_post'],
        limit: 50,
        client
      })

      if (socialPosts.length > 0) {
        // Järjestä postaukset sitoutumisen mukaan (likes + comments + shares)
        const sortedPosts = socialPosts
          .map(post => {
            const likes = post.metadata?.likes || 0
            const comments = post.metadata?.comments || 0
            const shares = post.metadata?.shares || 0
            const engagement = likes + (comments * 2) + (shares * 3) // Painota kommentit ja jaot enemmän
            return { ...post, engagement }
          })
          .sort((a, b) => b.engagement - a.engagement)

        contextParts.push('\n# SOSIAALISEN MEDIAN POSTAUKSET (Instagram & Facebook)\n')
        contextParts.push('Käytä näitä aikaisempia postauksia inspiraationa. Postaukset on järjestetty sitoutumisen mukaan (parhaimmat ensin):\n\n')

        // Näytä top 20 postausta
        sortedPosts.slice(0, 20).forEach((post, index) => {
          const source = post.metadata?.source || 'unknown'
          const sourceEmoji = source === 'instagram' ? '📷' : '📘'

          contextParts.push(`## ${sourceEmoji} ${post.title}`)
          contextParts.push(`\n**Julkaistu:** ${post.publish_date ? new Date(post.publish_date).toLocaleDateString('fi-FI') : 'Tuntematon'}`)

          // Näytä sitoutumismittarit
          if (post.metadata?.likes || post.metadata?.comments || post.metadata?.shares) {
            const metrics = []
            if (post.metadata.likes) metrics.push(`❤️ ${post.metadata.likes} tykkäystä`)
            if (post.metadata.comments) metrics.push(`💬 ${post.metadata.comments} kommenttia`)
            if (post.metadata.shares) metrics.push(`🔄 ${post.metadata.shares} jakoa`)
            contextParts.push(`\n**Sitoutuminen:** ${metrics.join(', ')} (YHTEENSÄ: ${Math.round(post.engagement)} pistettä)`)
          }

          if (post.summary) {
            contextParts.push(`\n**Yhteenveto:** ${post.summary}`)
          }

          contextParts.push(`\n**Sisältö:**\n${post.content}\n`)

          if (post.url) {
            contextParts.push(`**Linkki:** ${post.url}`)
          }

          contextParts.push('\n---\n\n')
        })

        // Lisää analyysi menestyneimmistä teemoista
        if (sortedPosts.length > 0) {
          const topPosts = sortedPosts.slice(0, 10)
          contextParts.push('\n### 📊 ANALYYSI: Menestyneimmät sisältötyypit\n')
          contextParts.push('Huomaa että seuraavat aiheet ja tyylit ovat saaneet eniten sitoutumista:\n\n')

          topPosts.forEach((post, i) => {
            const preview = post.content.substring(0, 100).replace(/\n/g, ' ')
            contextParts.push(`${i + 1}. "${preview}..." (${Math.round(post.engagement)} pistettä)\n`)
          })

          contextParts.push('\n💡 **Suositus AI:lle:** Kun luot uutta sisältöä, ota mallia näistä menestyneimmistä postauksista. Huomioi mikä tyyli, sävy ja aiheet ovat resonoineet yleisön kanssa.\n\n')
        }
      }
    }

    // 2. Aikaisempien vuosien tapahtumat
    if (includeEvents) {
      const events = await getHistoricalEvents(eventYears)

      if (events.length > 0) {
        contextParts.push('\n# AIKAISEMPIEN VUOSIEN TAPAHTUMAT\n')
        contextParts.push('Käytä näitä aikaisempia tapahtumia mallina ja inspiraationa:\n\n')

        // Ryhmittele vuosittain
        const eventsByYear = events.reduce((acc, event) => {
          if (!acc[event.year]) acc[event.year] = []
          acc[event.year].push(event)
          return acc
        }, {})

        Object.keys(eventsByYear)
          .sort((a, b) => b - a)
          .forEach(year => {
            contextParts.push(`## Vuosi ${year}\n`)
            eventsByYear[year].forEach(event => {
              contextParts.push(`- **${event.title}**`)
              if (event.artist) contextParts.push(` (${event.artist})`)
              if (event.event_instances && event.event_instances.length > 0) {
                const dates = event.event_instances.map(ei => ei.date).join(', ')
                contextParts.push(` - Päivät: ${dates}`)
              } else if (event.date) {
                contextParts.push(` - ${event.date}`)
              }
              contextParts.push('\n')
            })
            contextParts.push('\n')
          })
      }
    }

    // 3. Brändiohjeet
    if (includeBrandGuidelines) {
      const guidelines = await getBrandGuidelines()

      if (guidelines.length > 0) {
        contextParts.push('\n# BRÄNDIOHJEET\n')
        contextParts.push('Noudata näitä brändiin liittyviä ohjeita kaikessa sisällössä:\n\n')
        guidelines.forEach(guideline => {
          contextParts.push(`- ${guideline.title}`)
          if (guideline.file_url) {
            contextParts.push(` (Tiedosto: ${guideline.file_name})`)
          }
          contextParts.push('\n')
        })
      }
    }

    return contextParts.join('')
  } catch (error) {
    console.error('Error building brainstorm context:', error)
    return ''
  }
}

/**
 * Luo uusi brainstorming-sessio
 * @param {Object} sessionData - Session tiedot
 * @returns {Promise<Object>} Luotu sessio
 */
export async function createBrainstormSession(sessionData) {
  const { title, user } = sessionData

  try {
    const { data, error } = await supabase
      .from('brainstorm_sessions')
      .insert([
        {
          title,
          created_by_id: user?.id,
          created_by_email: user?.email,
          created_by_name: user?.user_metadata?.full_name || user?.email
        }
      ])
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error creating brainstorm session:', error)
    throw error
  }
}

/**
 * Tallentaa viestin brainstorming-sessioon
 * @param {string} sessionId - Session ID
 * @param {string} role - Rooli (user/assistant)
 * @param {string} content - Viestin sisältö
 * @param {Object} metadata - Lisämetatietoja
 * @returns {Promise<Object>} Tallennettu viesti
 */
export async function saveBrainstormMessage(sessionId, role, content, metadata = {}) {
  try {
    const { data, error } = await supabase
      .from('brainstorm_messages')
      .insert([
        {
          session_id: sessionId,
          role,
          content,
          metadata
        }
      ])
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error saving brainstorm message:', error)
    throw error
  }
}

/**
 * Hakee brainstorming-session viestit
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} Viestit
 */
export async function getBrainstormMessages(sessionId) {
  try {
    const { data, error } = await supabase
      .from('brainstorm_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching brainstorm messages:', error)
    throw error
  }
}

/**
 * Tallentaa idean ideavarastoon
 * @param {Object} ideaData - Idean tiedot
 * @returns {Promise<Object>} Tallennettu idea
 */
export async function saveIdea(ideaData) {
  const {
    sessionId,
    title,
    content,
    tags = [],
    category = 'draft',
    status = 'draft',
    notes = '',
    user
  } = ideaData

  try {
    const { data, error } = await supabase
      .from('saved_ideas')
      .insert([
        {
          session_id: sessionId,
          title,
          content,
          tags,
          category,
          status,
          notes,
          created_by_id: user?.id,
          created_by_email: user?.email,
          created_by_name: user?.user_metadata?.full_name || user?.email
        }
      ])
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error saving idea:', error)
    throw error
  }
}

/**
 * Hakee tallennetut ideat
 * @param {Object} options - Hakuparametrit
 * @returns {Promise<Array>} Ideat
 */
export async function getSavedIdeas(options = {}) {
  const {
    status = null,
    category = null,
    tags = [],
    limit = 100
  } = options

  try {
    let query = supabase
      .from('saved_ideas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (tags.length > 0) {
      query = query.contains('tags', tags)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching saved ideas:', error)
    throw error
  }
}

/**
 * Lisää historiallista sisältöä
 * @param {Object} contentData - Sisällön tiedot
 * @returns {Promise<Object>} Lisätty sisältö
 */
export async function addHistoricalContent(contentData) {
  const {
    type,
    title,
    content,
    summary = '',
    publishDate = null,
    year = null,
    url = null,
    metadata = {},
    user
  } = contentData

  try {
    const { data, error } = await supabase
      .from('historical_content')
      .insert([
        {
          type,
          title,
          content,
          summary,
          publish_date: publishDate,
          year,
          url,
          metadata,
          created_by_id: user?.id,
          created_by_email: user?.email,
          is_active: true
        }
      ])
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding historical content:', error)
    throw error
  }
}

/**
 * Hakee kaikki brainstorming-sessiot
 * @param {number} limit - Maksimimäärä tuloksia
 * @returns {Promise<Array>} Sessiot
 */
export async function getBrainstormSessions(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('brainstorm_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching brainstorm sessions:', error)
    throw error
  }
}

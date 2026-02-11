/**
 * Meta Graph API -integraatio Instagram ja Facebook -postausten hakemiseen
 *
 * Vaatii:
 * - FACEBOOK_ACCESS_TOKEN (pitkäikäinen access token)
 * - INSTAGRAM_BUSINESS_ACCOUNT_ID
 * - FACEBOOK_PAGE_ID
 */

import { supabase } from '../../lib/supabase'

/**
 * Hae Instagram-postaukset
 */
async function fetchInstagramPosts(accessToken, instagramAccountId, limit = 50) {
  try {
    // Hae postaukset Instagram Graph API:sta
    const fields = [
      'id',
      'caption',
      'media_type',
      'media_url',
      'permalink',
      'timestamp',
      'like_count',
      'comments_count'
    ].join(',')

    const url = `https://graph.facebook.com/v18.0/${instagramAccountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      throw new Error(`Instagram API error: ${data.error.message}`)
    }

    return data.data || []
  } catch (error) {
    console.error('Error fetching Instagram posts:', error)
    throw error
  }
}

/**
 * Hae Facebook-postaukset
 */
async function fetchFacebookPosts(accessToken, pageId, limit = 50) {
  try {
    const fields = [
      'id',
      'message',
      'created_time',
      'permalink_url',
      'full_picture',
      'likes.summary(true)',
      'comments.summary(true)',
      'shares'
    ].join(',')

    const url = `https://graph.facebook.com/v18.0/${pageId}/posts?fields=${fields}&limit=${limit}&access_token=${accessToken}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`)
    }

    return data.data || []
  } catch (error) {
    console.error('Error fetching Facebook posts:', error)
    throw error
  }
}

/**
 * Muunna Instagram-postaus historical_content -muotoon
 */
function convertInstagramPost(post) {
  const year = post.timestamp ? new Date(post.timestamp).getFullYear() : null

  return {
    type: 'social_post',
    title: `Instagram: ${(post.caption || '').substring(0, 100)}...`,
    content: post.caption || '',
    summary: `Instagram-postaus julkaistu ${post.timestamp ? new Date(post.timestamp).toLocaleDateString('fi-FI') : 'tuntematon päivä'}. Tykkäykset: ${post.like_count || 0}, Kommentit: ${post.comments_count || 0}`,
    url: post.permalink,
    publish_date: post.timestamp,
    year: year,
    metadata: {
      source: 'instagram',
      media_type: post.media_type,
      media_url: post.media_url,
      likes: post.like_count || 0,
      comments: post.comments_count || 0,
      instagram_id: post.id
    }
  }
}

/**
 * Muunna Facebook-postaus historical_content -muotoon
 */
function convertFacebookPost(post) {
  const year = post.created_time ? new Date(post.created_time).getFullYear() : null
  const likes = post.likes?.summary?.total_count || 0
  const comments = post.comments?.summary?.total_count || 0
  const shares = post.shares?.count || 0

  return {
    type: 'social_post',
    title: `Facebook: ${(post.message || '').substring(0, 100)}...`,
    content: post.message || '',
    summary: `Facebook-postaus julkaistu ${post.created_time ? new Date(post.created_time).toLocaleDateString('fi-FI') : 'tuntematon päivä'}. Tykkäykset: ${likes}, Kommentit: ${comments}, Jaot: ${shares}`,
    url: post.permalink_url,
    publish_date: post.created_time,
    year: year,
    metadata: {
      source: 'facebook',
      image_url: post.full_picture,
      likes: likes,
      comments: comments,
      shares: shares,
      facebook_id: post.id
    }
  }
}

/**
 * Tallenna postaukset tietokantaan
 */
async function savePosts(posts) {
  if (posts.length === 0) {
    return { count: 0, items: [] }
  }

  // Tarkista duplikaatit (älä tallenna samaa postausta uudelleen)
  const existingPosts = await supabase
    .from('historical_content')
    .select('metadata')
    .eq('type', 'social_post')
    .in('metadata->source', ['instagram', 'facebook'])

  const existingIds = new Set()
  if (existingPosts.data) {
    existingPosts.data.forEach(post => {
      if (post.metadata?.instagram_id) existingIds.add(post.metadata.instagram_id)
      if (post.metadata?.facebook_id) existingIds.add(post.metadata.facebook_id)
    })
  }

  // Suodata pois jo olemassa olevat
  const newPosts = posts.filter(post => {
    const id = post.metadata?.instagram_id || post.metadata?.facebook_id
    return id && !existingIds.has(id)
  })

  if (newPosts.length === 0) {
    return { count: 0, items: [], message: 'Kaikki postaukset jo tietokannassa' }
  }

  // Tallenna uudet postaukset
  const dataToInsert = newPosts.map(post => ({
    ...post,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('historical_content')
    .insert(dataToInsert)
    .select()

  if (error) {
    throw error
  }

  return { count: data.length, items: data }
}

/**
 * API endpoint
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const {
      sources = ['instagram', 'facebook'],
      limit = 50,
      saveToDatabase = true
    } = req.body

    // Hae ympäristömuuttujat
    const facebookAccessToken = process.env.FACEBOOK_ACCESS_TOKEN
    const instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    const facebookPageId = process.env.FACEBOOK_PAGE_ID

    if (!facebookAccessToken) {
      return res.status(400).json({
        error: 'Facebook Access Token not configured',
        message: 'Aseta FACEBOOK_ACCESS_TOKEN ympäristömuuttuja'
      })
    }

    let allPosts = []
    let instagramCount = 0
    let facebookCount = 0
    let errors = []

    // Hae Instagram-postaukset
    if (sources.includes('instagram') && instagramAccountId) {
      try {
        const igPosts = await fetchInstagramPosts(facebookAccessToken, instagramAccountId, limit)
        const converted = igPosts.map(convertInstagramPost)
        allPosts.push(...converted)
        instagramCount = converted.length
      } catch (error) {
        console.error('Instagram fetch failed:', error)
        errors.push({ source: 'instagram', error: error.message })
      }
    }

    // Hae Facebook-postaukset
    if (sources.includes('facebook') && facebookPageId) {
      try {
        const fbPosts = await fetchFacebookPosts(facebookAccessToken, facebookPageId, limit)
        const converted = fbPosts.map(convertFacebookPost)
        allPosts.push(...converted)
        facebookCount = converted.length
      } catch (error) {
        console.error('Facebook fetch failed:', error)
        errors.push({ source: 'facebook', error: error.message })
      }
    }

    // Tallenna tietokantaan jos pyydetty
    let saveResult = null
    if (saveToDatabase && allPosts.length > 0) {
      saveResult = await savePosts(allPosts)
    }

    return res.status(200).json({
      success: true,
      fetched: {
        instagram: instagramCount,
        facebook: facebookCount,
        total: allPosts.length
      },
      saved: saveResult,
      errors: errors.length > 0 ? errors : null,
      preview: allPosts.slice(0, 5) // Näytä 5 ensimmäistä esikatselu
    })

  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * API-reitti historiallisen sisällön hallintaan
 */

import {
  addHistoricalContent,
  getHistoricalContent
} from '../../../lib/api/brainstormService'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // GET - Hae historiallista sisältöä
    if (req.method === 'GET') {
      const { types, year, limit, isActive } = req.query

      const content = await getHistoricalContent({
        types: types ? types.split(',') : ['news', 'newsletter', 'article'],
        year: year ? parseInt(year) : null,
        limit: limit ? parseInt(limit) : 50,
        isActive: isActive === 'false' ? false : true
      })

      return res.status(200).json({ content })
    }

    // POST - Lisää uusi historiallinen sisältö
    if (req.method === 'POST') {
      const validTypes = ['news', 'newsletter', 'article', 'social_post', 'campaign']

      // Bulk-lisäys
      if (req.body.bulk && req.body.items) {
        const items = req.body.items

        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({
            error: 'Items array is required for bulk insert'
          })
        }

        // Validoi jokainen item
        for (const item of items) {
          if (!item.type || !item.title || !item.content) {
            return res.status(400).json({
              error: 'Each item must have type, title and content'
            })
          }
          if (!validTypes.includes(item.type)) {
            return res.status(400).json({
              error: `Invalid type "${item.type}". Must be one of: ${validTypes.join(', ')}`
            })
          }
        }

        // Lisää kaikki itemit
        const dataToInsert = items.map(item => ({
          type: item.type,
          title: item.title,
          content: item.content,
          summary: item.summary || '',
          publish_date: item.publish_date || null,
          year: item.year || null,
          url: item.url || null,
          metadata: item.metadata || {},
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { data, error } = await supabase
          .from('historical_content')
          .insert(dataToInsert)
          .select()

        if (error) throw error

        return res.status(201).json({
          success: true,
          count: data.length,
          content: data
        })
      }

      // Yksittäinen lisäys
      const {
        type,
        title,
        content,
        summary = '',
        publishDate = null,
        year = null,
        url = null,
        metadata = {}
      } = req.body

      // Validointi
      if (!type || !title || !content) {
        return res.status(400).json({
          error: 'Type, title and content are required'
        })
      }

      // Tarkista että type on validi
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
        })
      }

      // Lisää sisältö
      const savedContent = await addHistoricalContent({
        type,
        title,
        content,
        summary,
        publishDate,
        year,
        url,
        metadata,
        user
      })

      return res.status(201).json({
        success: true,
        content: savedContent
      })
    }

    // PUT - Päivitä historiallinen sisältö
    if (req.method === 'PUT') {
      const {
        id,
        type,
        title,
        content,
        summary,
        publishDate,
        year,
        url,
        metadata,
        isActive
      } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Content ID is required' })
      }

      const { data, error } = await supabase
        .from('historical_content')
        .update({
          type,
          title,
          content,
          summary,
          publish_date: publishDate,
          year,
          url,
          metadata,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return res.status(200).json({
        success: true,
        content: data
      })
    }

    // DELETE - Poista historiallinen sisältö
    if (req.method === 'DELETE') {
      const { id } = req.query

      if (!id) {
        return res.status(400).json({ error: 'Content ID is required' })
      }

      const { error } = await supabase
        .from('historical_content')
        .delete()
        .eq('id', id)

      if (error) throw error

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Error in historical-content API:', error)
    res.status(500).json({
      error: error.message || 'Internal server error'
    })
  }
}

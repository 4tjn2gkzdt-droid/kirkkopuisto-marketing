/**
 * API-reitti idean tallennukseen ideavarastoon
 */

import { saveIdea, getSavedIdeas } from '../../../lib/api/brainstormService'
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

    // GET - Hae tallennetut ideat
    if (req.method === 'GET') {
      const { status, category, tags, limit } = req.query

      const ideas = await getSavedIdeas({
        status: status || null,
        category: category || null,
        tags: tags ? tags.split(',') : [],
        limit: limit ? parseInt(limit) : 100
      })

      return res.status(200).json({ ideas })
    }

    // POST - Tallenna uusi idea
    if (req.method === 'POST') {
      const {
        sessionId,
        title,
        content,
        tags = [],
        category = 'draft',
        status = 'draft',
        notes = ''
      } = req.body

      // Validointi
      if (!title || !content) {
        return res.status(400).json({
          error: 'Title and content are required'
        })
      }

      // Tallenna idea
      const savedIdea = await saveIdea({
        sessionId,
        title,
        content,
        tags,
        category,
        status,
        notes,
        user
      })

      return res.status(201).json({
        success: true,
        idea: savedIdea
      })
    }

    // PUT - Päivitä idea
    if (req.method === 'PUT') {
      const { id, title, content, tags, category, status, notes } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Idea ID is required' })
      }

      const { data, error } = await supabase
        .from('saved_ideas')
        .update({
          title,
          content,
          tags,
          category,
          status,
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return res.status(200).json({
        success: true,
        idea: data
      })
    }

    // DELETE - Poista idea
    if (req.method === 'DELETE') {
      const { id } = req.query

      if (!id) {
        return res.status(400).json({ error: 'Idea ID is required' })
      }

      const { error } = await supabase
        .from('saved_ideas')
        .delete()
        .eq('id', id)

      if (error) throw error

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Error in save-idea API:', error)
    res.status(500).json({
      error: error.message || 'Internal server error'
    })
  }
}

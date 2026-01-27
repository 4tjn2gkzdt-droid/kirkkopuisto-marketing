/**
 * API-reitti brainstorming-sessioiden hallintaan
 */

import {
  createBrainstormSession,
  getBrainstormSessions,
  getBrainstormMessages
} from '../../../lib/api/brainstormService'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Luo käyttäjäkohtainen Supabase-client tokenilla
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // GET - Hae sessiot tai yksittäisen session viestit
    if (req.method === 'GET') {
      const { sessionId, limit } = req.query

      // Jos sessionId annettu, hae kyseisen session viestit
      if (sessionId) {
        const { data: messages, error } = await supabase
          .from('brainstorm_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })

        if (error) throw error

        return res.status(200).json({ messages: messages || [] })
      }

      // Muuten hae kaikki sessiot
      const { data: sessions, error } = await supabase
        .from('brainstorm_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit ? parseInt(limit) : 50)

      if (error) throw error

      return res.status(200).json({ sessions: sessions || [] })
    }

    // POST - Luo uusi sessio
    if (req.method === 'POST') {
      const { title } = req.body

      // Luo uusi sessio suoraan käyttäjäkohtaisella clientillä
      const { data: session, error } = await supabase
        .from('brainstorm_sessions')
        .insert({
          title: title || 'Uusi brainstorming-sessio',
          created_by_id: user.id,
          created_by_email: user.email,
          created_by_name: user.user_metadata?.full_name || user.email
        })
        .select()
        .single()

      if (error) throw error

      return res.status(201).json({
        success: true,
        session
      })
    }

    // PUT - Päivitä session otsikko
    if (req.method === 'PUT') {
      const { sessionId, title } = req.body

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' })
      }

      const { data, error } = await supabase
        .from('brainstorm_sessions')
        .update({
          title,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error

      return res.status(200).json({
        success: true,
        session: data
      })
    }

    // DELETE - Poista sessio
    if (req.method === 'DELETE') {
      const { sessionId } = req.query

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' })
      }

      const { error } = await supabase
        .from('brainstorm_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Error in sessions API:', error)
    res.status(500).json({
      error: error.message || 'Internal server error'
    })
  }
}

/**
 * API endpoint: Hae kaikki brändiohjedokumentit
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import { loadBrandGuidelines } from '../../../lib/api/brandGuidelineService'
import logger from '../../../lib/logger'

export default async function handler(req, res) {
  const listLogger = logger.withPrefix('list');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  listLogger.info('==========================================');
  listLogger.info('Haetaan aktiiviset dokumentit');

  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      listLogger.error('❌ Authorization header puuttuu');
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Tarkista käyttäjä Supabasesta
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      listLogger.error('❌ Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized' })
    }

    listLogger.info('✅ Käyttäjä tunnistettu');

    // Hae dokumentit
    const guidelines = await loadBrandGuidelines()

    listLogger.info(`✅ Löytyi ${guidelines?.length || 0} dokumenttia`);
    guidelines?.forEach((doc, i) => {
      listLogger.debug(`  ${i + 1}. ${doc.title} (status: ${doc.status})`);
    })
    listLogger.info('==========================================');

    return res.status(200).json({
      success: true,
      guidelines
    })

  } catch (error) {
    listLogger.error('❌ Error:', error);
    listLogger.info('==========================================');
    return res.status(500).json({
      error: 'Dokumenttien haku epäonnistui',
      details: error.message
    })
  }
}

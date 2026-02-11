/**
 * API endpoint: Testaa tiedoston lataamista ja lukemista
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import { downloadAndReadFile } from '../../../lib/api/brandGuidelineService'
import logger from '../../../lib/logger'

export default async function handler(req, res) {
  const testLogger = logger.withPrefix('test-download');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  testLogger.info('==========================================');
  testLogger.info('Aloitetaan tiedoston lataus ja luku');

  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Tarkista käyttäjä
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    testLogger.info('✅ Käyttäjä tunnistettu');

    // Hae filePath requestista
    const { filePath } = req.body

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'filePath puuttuu',
        details: 'Anna filePath request bodyssä'
      })
    }

    testLogger.info(`Ladataan tiedostoa: ${filePath}`);

    // Lataa ja lue tiedosto
    const content = await downloadAndReadFile(filePath)

    testLogger.info('✅ Tiedosto ladattu ja luettu!');
    testLogger.debug(`Sisällön pituus: ${content.length} merkkiä`);
    testLogger.debug(`Ensimmäiset 100 merkkiä: ${content.substring(0, 100)}...`);
    testLogger.info('==========================================');

    return res.status(200).json({
      success: true,
      message: 'Tiedosto ladattu ja luettu onnistuneesti',
      filePath,
      contentLength: content.length,
      contentPreview: content.substring(0, 500), // Ensimmäiset 500 merkkiä
      fileType: filePath.toLowerCase().endsWith('.pdf') ? 'PDF' :
                filePath.toLowerCase().endsWith('.md') ? 'Markdown' :
                filePath.toLowerCase().endsWith('.json') ? 'JSON' : 'Unknown'
    })

  } catch (error) {
    testLogger.error('❌❌❌ Kriittinen virhe:', error);
    testLogger.info('==========================================');
    return res.status(500).json({
      success: false,
      error: 'Tiedoston lataus epäonnistui',
      details: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    })
  }
}

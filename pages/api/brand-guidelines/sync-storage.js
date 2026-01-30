/**
 * API endpoint: Synkronoi Storage bucket tiedostot tietokantaan
 * Luo puuttuvat tietokannan rivit Storage-tiedostoille
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import logger from '../../../lib/logger'

export default async function handler(req, res) {
  const syncLogger = logger.withPrefix('sync-storage');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  syncLogger.info('==========================================');
  syncLogger.info('Aloitetaan Storage-synkronointi');

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

    syncLogger.info('✅ Käyttäjä tunnistettu');

    // Hae kaikki tiedostot Storage bucketista
    syncLogger.info(' Haetaan tiedostot Storagesta...')
    const { data: storageFiles, error: storageError } = await supabaseAdmin.storage
      .from('brand-guidelines')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (storageError) {
      syncLogger.error(' ❌ Storage-listaus epäonnistui:', storageError)
      return res.status(500).json({
        success: false,
        error: 'Storage-listaus epäonnistui',
        details: storageError.message
      })
    }

    syncLogger.info(`✅ Storage-tiedostoja: ${storageFiles?.length || 0}`);

    // Hae kaikki rivit tietokannasta
    syncLogger.info(' Haetaan rivit tietokannasta...')
    const { data: dbRows, error: dbError } = await supabaseAdmin
      .from('brand_guidelines')
      .select('file_path, file_name')

    if (dbError) {
      syncLogger.error(' ❌ Tietokantahaku epäonnistui:', dbError)
      return res.status(500).json({
        success: false,
        error: 'Tietokantahaku epäonnistui',
        details: dbError.message
      })
    }

    syncLogger.info(`✅ Tietokannan rivejä: ${dbRows?.length || 0}`);

    // Luo Map tietokannan tiedostopoluista
    const dbFilePaths = new Set((dbRows || []).map(row => row.file_path))

    // Etsi tiedostot jotka ovat Storagessa mutta EIVÄT tietokannassa
    const missingFiles = storageFiles.filter(file => !dbFilePaths.has(file.name))

    syncLogger.info(`Puuttuvia tiedostoja: ${missingFiles.length}`);

    if (missingFiles.length === 0) {
      syncLogger.info(' ✅ Kaikki tiedostot ovat jo synkronoitu!')
      syncLogger.info(' ==========================================')
      return res.status(200).json({
        success: true,
        message: 'Kaikki tiedostot ovat jo synkronoitu',
        results: {
          storageFilesCount: storageFiles.length,
          dbRowsCount: dbRows.length,
          missingCount: 0,
          created: []
        }
      })
    }

    // Luo puuttuvat tietokannan rivit
    syncLogger.info(' Luodaan puuttuvat rivit...')
    const createdRows = []

    for (const file of missingFiles) {
      // Hae public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('brand-guidelines')
        .getPublicUrl(file.name)

      // Luo rivi tietokantaan
      const insertData = {
        title: `Synkronoitu: ${file.name}`,
        file_name: file.name,
        file_url: urlData?.publicUrl || '',
        file_path: file.name,
        uploaded_by_id: user.id,
        uploaded_by_email: user.email,
        is_active: true,
        status: 'uploaded' // Aluksi vain ladattu, prosessointi erikseen
      }

      syncLogger.info(`Luodaan rivi tiedostolle: ${file.name}`);

      const { data: newRow, error: insertError } = await supabaseAdmin
        .from('brand_guidelines')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        syncLogger.error(`❌ Virhe luotaessa riviä tiedostolle ${file.name}:`, insertError);
        // Jatka silti muiden tiedostojen kanssa
        continue
      }

      syncLogger.info(`✅ Rivi luotu: ${newRow.id}`);
      createdRows.push({
        id: newRow.id,
        title: newRow.title,
        file_name: file.name
      })
    }

    syncLogger.info(`✅ Luotiin ${createdRows.length} uutta riviä`);
    syncLogger.info(' ==========================================')

    return res.status(200).json({
      success: true,
      message: `Synkronointi valmis! Luotiin ${createdRows.length} uutta riviä.`,
      results: {
        storageFilesCount: storageFiles.length,
        dbRowsCount: dbRows.length,
        missingCount: missingFiles.length,
        created: createdRows
      }
    })

  } catch (error) {
    syncLogger.error(' ❌❌❌ Kriittinen virhe:', error)
    syncLogger.info(' ==========================================')
    return res.status(500).json({
      success: false,
      error: 'Synkronointi epäonnistui',
      details: error.message,
      stack: error.stack
    })
  }
}

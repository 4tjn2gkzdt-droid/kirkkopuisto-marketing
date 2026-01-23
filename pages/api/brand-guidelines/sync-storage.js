/**
 * API endpoint: Synkronoi Storage bucket tiedostot tietokantaan
 * Luo puuttuvat tietokannan rivit Storage-tiedostoille
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('[sync-storage] ==========================================')
  console.log('[sync-storage] Aloitetaan Storage-synkronointi')

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

    console.log(`[sync-storage] ✅ Käyttäjä: ${user.email}`)

    // Hae kaikki tiedostot Storage bucketista
    console.log('[sync-storage] Haetaan tiedostot Storagesta...')
    const { data: storageFiles, error: storageError } = await supabaseAdmin.storage
      .from('brand-guidelines')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (storageError) {
      console.error('[sync-storage] ❌ Storage-listaus epäonnistui:', storageError)
      return res.status(500).json({
        success: false,
        error: 'Storage-listaus epäonnistui',
        details: storageError.message
      })
    }

    console.log(`[sync-storage] ✅ Storage-tiedostoja: ${storageFiles?.length || 0}`)

    // Hae kaikki rivit tietokannasta
    console.log('[sync-storage] Haetaan rivit tietokannasta...')
    const { data: dbRows, error: dbError } = await supabaseAdmin
      .from('brand_guidelines')
      .select('file_path, file_name')

    if (dbError) {
      console.error('[sync-storage] ❌ Tietokantahaku epäonnistui:', dbError)
      return res.status(500).json({
        success: false,
        error: 'Tietokantahaku epäonnistui',
        details: dbError.message
      })
    }

    console.log(`[sync-storage] ✅ Tietokannan rivejä: ${dbRows?.length || 0}`)

    // Luo Map tietokannan tiedostopoluista
    const dbFilePaths = new Set((dbRows || []).map(row => row.file_path))

    // Etsi tiedostot jotka ovat Storagessa mutta EIVÄT tietokannassa
    const missingFiles = storageFiles.filter(file => !dbFilePaths.has(file.name))

    console.log(`[sync-storage] Puuttuvia tiedostoja: ${missingFiles.length}`)

    if (missingFiles.length === 0) {
      console.log('[sync-storage] ✅ Kaikki tiedostot ovat jo synkronoitu!')
      console.log('[sync-storage] ==========================================')
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
    console.log('[sync-storage] Luodaan puuttuvat rivit...')
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

      console.log(`[sync-storage] Luodaan rivi tiedostolle: ${file.name}`)

      const { data: newRow, error: insertError } = await supabaseAdmin
        .from('brand_guidelines')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error(`[sync-storage] ❌ Virhe luotaessa riviä tiedostolle ${file.name}:`, insertError)
        // Jatka silti muiden tiedostojen kanssa
        continue
      }

      console.log(`[sync-storage] ✅ Rivi luotu: ${newRow.id}`)
      createdRows.push({
        id: newRow.id,
        title: newRow.title,
        file_name: file.name
      })
    }

    console.log(`[sync-storage] ✅ Luotiin ${createdRows.length} uutta riviä`)
    console.log('[sync-storage] ==========================================')

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
    console.error('[sync-storage] ❌❌❌ Kriittinen virhe:', error)
    console.log('[sync-storage] ==========================================')
    return res.status(500).json({
      success: false,
      error: 'Synkronointi epäonnistui',
      details: error.message,
      stack: error.stack
    })
  }
}

/**
 * API endpoint: Testaa Storage bucket -yhteyttä
 * Listaa kaikki tiedostot brand-guidelines bucketista
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('[storage-test] ==========================================')
  console.log('[storage-test] Aloitetaan Storage bucket -testi')

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

    console.log(`[storage-test] ✅ Käyttäjä: ${user.email}`)

    // Testi 1: Listaa kaikki bucketit
    console.log('[storage-test] Testi 1: Listaa kaikki bucketit')
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()

    if (bucketsError) {
      console.error('[storage-test] ❌ Bucket-listaus epäonnistui:', bucketsError)
      return res.status(500).json({
        success: false,
        error: 'Bucket-listaus epäonnistui',
        details: bucketsError.message
      })
    }

    console.log('[storage-test] ✅ Buckets löytyi:', buckets?.length)

    const hasBrandGuidelines = buckets?.some(b => b.name === 'brand-guidelines')
    console.log('[storage-test] brand-guidelines bucket:', hasBrandGuidelines ? 'LÖYTYI' : 'PUUTTUU')

    // Testi 2: Listaa tiedostot brand-guidelines bucketista
    console.log('[storage-test] Testi 2: Listaa tiedostot brand-guidelines bucketista')
    const { data: files, error: filesError } = await supabaseAdmin.storage
      .from('brand-guidelines')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (filesError) {
      console.error('[storage-test] ❌ Tiedostojen listaus epäonnistui:', filesError)
      return res.status(500).json({
        success: false,
        error: 'Tiedostojen listaus epäonnistui',
        details: filesError.message,
        buckets: buckets?.map(b => b.name)
      })
    }

    console.log('[storage-test] ✅ Tiedostoja löytyi:', files?.length)
    files?.forEach((file, i) => {
      console.log(`[storage-test]   ${i + 1}. ${file.name} (${(file.metadata?.size / 1024).toFixed(2)} KB, ${file.created_at})`)
    })

    // Testi 3: Hae public URL:t tiedostoille
    console.log('[storage-test] Testi 3: Generoi public URL:t')
    const filesWithUrls = files?.map(file => {
      const { data: urlData } = supabaseAdmin.storage
        .from('brand-guidelines')
        .getPublicUrl(file.name)

      return {
        name: file.name,
        size: file.metadata?.size,
        sizeKB: (file.metadata?.size / 1024).toFixed(2),
        created_at: file.created_at,
        publicUrl: urlData?.publicUrl,
        id: file.id
      }
    })

    console.log('[storage-test] ==========================================')

    return res.status(200).json({
      success: true,
      message: 'Storage bucket -testi onnistui',
      results: {
        bucketsCount: buckets?.length,
        buckets: buckets?.map(b => b.name),
        hasBrandGuidelinesBucket: hasBrandGuidelines,
        filesCount: files?.length,
        files: filesWithUrls
      }
    })

  } catch (error) {
    console.error('[storage-test] ❌❌❌ Kriittinen virhe:', error)
    console.log('[storage-test] ==========================================')
    return res.status(500).json({
      success: false,
      error: 'Storage-testi epäonnistui',
      details: error.message,
      stack: error.stack
    })
  }
}

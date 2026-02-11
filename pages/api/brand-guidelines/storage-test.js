/**
 * API endpoint: Testaa Storage bucket -yhteyttä
 * Listaa kaikki tiedostot brand-guidelines bucketista
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import logger from '../../../lib/logger'

export default async function handler(req, res) {
  const storageLogger = logger.withPrefix('storage-test');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  storageLogger.info('==========================================');
  storageLogger.info('Aloitetaan Storage bucket -testi');

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

    storageLogger.info('✅ Käyttäjä tunnistettu');

    // Testi 1: Listaa kaikki bucketit
    storageLogger.info('Testi 1: Listaa kaikki bucketit');
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()

    if (bucketsError) {
      storageLogger.error('❌ Bucket-listaus epäonnistui:', bucketsError);
      return res.status(500).json({
        success: false,
        error: 'Bucket-listaus epäonnistui',
        details: bucketsError.message
      })
    }

    storageLogger.info('✅ Buckets löytyi:', buckets?.length);

    const hasBrandGuidelines = buckets?.some(b => b.name === 'brand-guidelines')
    storageLogger.info('brand-guidelines bucket:', hasBrandGuidelines ? 'LÖYTYI' : 'PUUTTUU');

    // Testi 2: Listaa tiedostot brand-guidelines bucketista
    storageLogger.info('Testi 2: Listaa tiedostot brand-guidelines bucketista');
    const { data: files, error: filesError } = await supabaseAdmin.storage
      .from('brand-guidelines')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (filesError) {
      storageLogger.error('❌ Tiedostojen listaus epäonnistui:', filesError);
      return res.status(500).json({
        success: false,
        error: 'Tiedostojen listaus epäonnistui',
        details: filesError.message,
        buckets: buckets?.map(b => b.name)
      })
    }

    storageLogger.info('✅ Tiedostoja löytyi:', files?.length);
    files?.forEach((file, i) => {
      storageLogger.debug(`  ${i + 1}. ${file.name} (${(file.metadata?.size / 1024).toFixed(2)} KB, ${file.created_at})`);
    })

    // Testi 3: Hae public URL:t tiedostoille
    storageLogger.info('Testi 3: Generoi public URL:t');
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

    storageLogger.info('==========================================');

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
    storageLogger.error('❌❌❌ Kriittinen virhe:', error);
    storageLogger.info('==========================================');
    return res.status(500).json({
      success: false,
      error: 'Storage-testi epäonnistui',
      details: error.message,
      stack: error.stack
    })
  }
}

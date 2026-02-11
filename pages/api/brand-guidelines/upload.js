/**
 * API endpoint: Lataa brändiohjedokumentti
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import {
  createBrandGuideline
} from '../../../lib/api/brandGuidelineService'
import logger from '../../../lib/logger'

// Huom: Tiedosto ladataan suoraan Supabase Storageen frontend-puolella,
// joten API vastaanottaa vain metatiedot. Tämä ohittaa Vercel payload-rajoitukset.

export default async function handler(req, res) {
  const uploadLogger = logger.withPrefix('upload');

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Vain POST-pyynnöt sallittuja'
    })
  }

  uploadLogger.info('==========================================');
  uploadLogger.info('Aloitetaan dokumentin lataus...');
  uploadLogger.debug('Request body:', JSON.stringify(req.body, null, 2));
  uploadLogger.debug('Headers:', {
    hasAuth: !!req.headers.authorization,
    contentType: req.headers['content-type']
  });

  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      uploadLogger.error('❌ Virhe: Puuttuva Authorization header');
      return res.status(401).json({
        success: false,
        error: 'Kirjautuminen vaaditaan',
        details: 'Authorization header puuttuu',
        debug: 'AUTH_HEADER_MISSING'
      })
    }

    uploadLogger.info('✅ Authorization header löytyi');

    const token = authHeader.replace('Bearer ', '')
    uploadLogger.debug('Token extracted, length:', token.length);

    // Tarkista että supabaseAdmin on olemassa
    if (!supabaseAdmin) {
      uploadLogger.error('❌ KRIITTINEN: supabaseAdmin on null!');
      return res.status(500).json({
        success: false,
        error: 'Palvelimen konfigurointivirhe',
        details: 'Supabase admin client puuttuu - tarkista ympäristömuuttujat',
        debug: 'SUPABASE_ADMIN_NULL'
      })
    }

    uploadLogger.info('✅ supabaseAdmin client OK');

    // Tarkista käyttäjä Supabasesta
    uploadLogger.info('Tarkistetaan käyttäjä tokenilla...');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      uploadLogger.error('❌ Virhe: Autentikointi epäonnistui', {
        error: authError?.message,
        hasUser: !!user
      });
      return res.status(401).json({
        success: false,
        error: 'Kirjautuminen epäonnistui',
        details: authError?.message || 'Token ei kelpaa',
        debug: 'AUTH_USER_FAILED'
      })
    }

    uploadLogger.info('✅ Käyttäjä tunnistettu');

    // Tarkista että käyttäjä on admin
    uploadLogger.info('Haetaan käyttäjäprofiilia...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError) {
      uploadLogger.error('❌ Virhe: Käyttäjäprofiilin haku epäonnistui', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details
      });
      return res.status(500).json({
        success: false,
        error: 'Käyttäjäprofiilin haku epäonnistui',
        details: profileError.message,
        debug: 'PROFILE_FETCH_FAILED'
      })
    }

    uploadLogger.info('✅ Profiili haettu:', {
      hasProfile: !!profile,
      isAdmin: profile?.is_admin
    });

    if (!profile || !profile.is_admin) {
      uploadLogger.error('❌ Virhe: Käyttäjällä ei ole admin-oikeuksia', {
        hasProfile: !!profile,
        isAdmin: profile?.is_admin
      });
      return res.status(403).json({
        success: false,
        error: 'Ei käyttöoikeutta',
        details: 'Vain admin-käyttäjät voivat ladata dokumentteja',
        debug: 'NOT_ADMIN'
      })
    }

    uploadLogger.info('✅ Admin-oikeudet vahvistettu');

    // Frontend lähettää tiedoston metatiedot (tiedosto on jo Supabase Storagessa)
    const { title, fileName, filePath, fileUrl } = req.body

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Puuttuva tieto: Otsikko',
        details: 'Anna dokumentille otsikko'
      })
    }

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: 'Puuttuva tieto: Tiedostonimi',
        details: 'Tiedostonimi puuttuu'
      })
    }

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'Puuttuva tieto: Tiedostopolku',
        details: 'Tiedostopolku puuttuu'
      })
    }

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        error: 'Puuttuva tieto: Tiedoston URL',
        details: 'Tiedoston URL puuttuu'
      })
    }

    uploadLogger.info(`Rekisteröidään dokumentti: "${title}" (${fileName})`);
    uploadLogger.debug(`Tiedostopolku: ${filePath}`);

    // Luo tietokantaan entry (status = 'uploaded' by default)
    uploadLogger.info('Luodaan tietokantaan merkintä...');
    uploadLogger.debug('Data:', {
      title,
      fileName,
      filePath,
      fileUrlLength: fileUrl?.length,
      userId: user.id
    });

    const guideline = await createBrandGuideline({
      title,
      fileName,
      fileUrl,
      filePath,
      userId: user.id,
      userEmail: user.email
    })

    uploadLogger.info(`✅ Dokumentti luotu ID:llä: ${guideline.id}`);
    uploadLogger.info('==========================================')

    // EI prosessoida automaattisesti - käyttäjä prosessoi manuaalisesti

    return res.status(200).json({
      success: true,
      guideline,
      message: 'Dokumentti ladattu onnistuneesti! Prosessoi se nyt AI:lla.'
    })

  } catch (error) {
    uploadLogger.error('❌❌❌ Kriittinen virhe dokumentin latauksessa:', error);
    uploadLogger.error('Error name:', error.name);
    uploadLogger.error('Error message:', error.message);
    uploadLogger.error('Error stack:', error.stack);
    uploadLogger.error('Error details:', error.details);
    uploadLogger.info('==========================================')

    // Palauta tarkka virheviesti
    return res.status(500).json({
      success: false,
      error: error.message || 'Dokumentin lataus epäonnistui',
      details: error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : 'Ei lisätietoja',
      debug: 'EXCEPTION_CAUGHT',
      errorName: error.name,
      errorCode: error.code
    })
  }
}

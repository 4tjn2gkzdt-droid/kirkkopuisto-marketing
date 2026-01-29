/**
 * API endpoint: Lataa brändiohjedokumentti
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import {
  createBrandGuideline
} from '../../../lib/api/brandGuidelineService'

// Huom: Tiedosto ladataan suoraan Supabase Storageen frontend-puolella,
// joten API vastaanottaa vain metatiedot. Tämä ohittaa Vercel payload-rajoitukset.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Vain POST-pyynnöt sallittuja'
    })
  }

  console.log('[upload] ==========================================')
  console.log('[upload] Aloitetaan dokumentin lataus...')
  console.log('[upload] Request body:', JSON.stringify(req.body, null, 2))
  console.log('[upload] Headers:', {
    hasAuth: !!req.headers.authorization,
    contentType: req.headers['content-type']
  })

  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      console.log('[upload] ❌ Virhe: Puuttuva Authorization header')
      return res.status(401).json({
        success: false,
        error: 'Kirjautuminen vaaditaan',
        details: 'Authorization header puuttuu',
        debug: 'AUTH_HEADER_MISSING'
      })
    }

    console.log('[upload] ✅ Authorization header löytyi')

    const token = authHeader.replace('Bearer ', '')
    console.log('[upload] Token extracted, length:', token.length)

    // Tarkista että supabaseAdmin on olemassa
    if (!supabaseAdmin) {
      console.log('[upload] ❌ KRIITTINEN: supabaseAdmin on null!')
      return res.status(500).json({
        success: false,
        error: 'Palvelimen konfigurointivirhe',
        details: 'Supabase admin client puuttuu - tarkista ympäristömuuttujat',
        debug: 'SUPABASE_ADMIN_NULL'
      })
    }

    console.log('[upload] ✅ supabaseAdmin client OK')

    // Tarkista käyttäjä Supabasesta
    console.log('[upload] Tarkistetaan käyttäjä tokenilla...')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.log('[upload] ❌ Virhe: Autentikointi epäonnistui', {
        error: authError?.message,
        hasUser: !!user
      })
      return res.status(401).json({
        success: false,
        error: 'Kirjautuminen epäonnistui',
        details: authError?.message || 'Token ei kelpaa',
        debug: 'AUTH_USER_FAILED'
      })
    }

    console.log(`[upload] ✅ Käyttäjä tunnistettu: ${user.email} (ID: ${user.id})`)

    // Tarkista että käyttäjä on admin
    console.log('[upload] Haetaan käyttäjäprofiilia...')
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.log('[upload] ❌ Virhe: Käyttäjäprofiilin haku epäonnistui', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details
      })
      return res.status(500).json({
        success: false,
        error: 'Käyttäjäprofiilin haku epäonnistui',
        details: profileError.message,
        debug: 'PROFILE_FETCH_FAILED'
      })
    }

    console.log('[upload] ✅ Profiili haettu:', {
      hasProfile: !!profile,
      isAdmin: profile?.is_admin
    })

    if (!profile || !profile.is_admin) {
      console.log('[upload] ❌ Virhe: Käyttäjällä ei ole admin-oikeuksia', {
        hasProfile: !!profile,
        isAdmin: profile?.is_admin
      })
      return res.status(403).json({
        success: false,
        error: 'Ei käyttöoikeutta',
        details: 'Vain admin-käyttäjät voivat ladata dokumentteja',
        debug: 'NOT_ADMIN'
      })
    }

    console.log('[upload] ✅ Admin-oikeudet vahvistettu')

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

    console.log(`[upload] Rekisteröidään dokumentti: "${title}" (${fileName})`)
    console.log(`[upload] Tiedostopolku: ${filePath}`)

    // Luo tietokantaan entry (status = 'uploaded' by default)
    console.log('[upload] Luodaan tietokantaan merkintä...')
    console.log('[upload] Data:', {
      title,
      fileName,
      filePath,
      fileUrlLength: fileUrl?.length,
      userId: user.id,
      userEmail: user.email
    })

    const guideline = await createBrandGuideline({
      title,
      fileName,
      fileUrl,
      filePath,
      userId: user.id,
      userEmail: user.email
    })

    console.log(`[upload] ✅ Dokumentti luotu ID:llä: ${guideline.id}`)
    console.log('[upload] ==========================================')

    // EI prosessoida automaattisesti - käyttäjä prosessoi manuaalisesti

    return res.status(200).json({
      success: true,
      guideline,
      message: 'Dokumentti ladattu onnistuneesti! Prosessoi se nyt AI:lla.'
    })

  } catch (error) {
    console.error('[upload] ❌❌❌ Kriittinen virhe dokumentin latauksessa:', error)
    console.error('[upload] Error name:', error.name)
    console.error('[upload] Error message:', error.message)
    console.error('[upload] Error stack:', error.stack)
    console.error('[upload] Error details:', error.details)
    console.log('[upload] ==========================================')

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

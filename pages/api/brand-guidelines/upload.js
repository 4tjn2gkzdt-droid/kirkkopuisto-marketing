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

  console.log('[upload] Aloitetaan dokumentin lataus...')

  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      console.log('[upload] Virhe: Puuttuva Authorization header')
      return res.status(401).json({
        success: false,
        error: 'Kirjautuminen vaaditaan',
        details: 'Authorization header puuttuu'
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // Tarkista käyttäjä Supabasesta
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.log('[upload] Virhe: Autentikointi epäonnistui', authError)
      return res.status(401).json({
        success: false,
        error: 'Kirjautuminen epäonnistui',
        details: authError?.message || 'Token ei kelpaa'
      })
    }

    console.log(`[upload] Käyttäjä tunnistettu: ${user.email}`)

    // Tarkista että käyttäjä on admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.log('[upload] Virhe: Käyttäjäprofiilin haku epäonnistui', profileError)
      return res.status(500).json({
        success: false,
        error: 'Käyttäjäprofiilin haku epäonnistui',
        details: profileError.message
      })
    }

    if (!profile || !profile.is_admin) {
      console.log('[upload] Virhe: Käyttäjällä ei ole admin-oikeuksia')
      return res.status(403).json({
        success: false,
        error: 'Ei käyttöoikeutta',
        details: 'Vain admin-käyttäjät voivat ladata dokumentteja'
      })
    }

    console.log('[upload] Admin-oikeudet vahvistettu')

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
    const guideline = await createBrandGuideline({
      title,
      fileName,
      fileUrl,
      filePath,
      userId: user.id,
      userEmail: user.email
    })

    console.log(`[upload] Dokumentti luotu ID:llä: ${guideline.id}`)

    // EI prosessoida automaattisesti - käyttäjä prosessoi manuaalisesti

    return res.status(200).json({
      success: true,
      guideline,
      message: 'Dokumentti ladattu onnistuneesti! Prosessoi se nyt AI:lla.'
    })

  } catch (error) {
    console.error('[upload] Virhe dokumentin latauksessa:', error)
    console.error('[upload] Error stack:', error.stack)

    // Palauta tarkka virheviesti
    return res.status(500).json({
      success: false,
      error: error.message || 'Dokumentin lataus epäonnistui',
      details: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'Ei lisätietoja'
    })
  }
}

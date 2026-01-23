/**
 * Brand Guideline Service
 * Hallinnoi brändiohjedokumenttien lataamista, lukemista ja integrointia AI-kutsuihin
 */

import { supabaseAdmin } from '../supabase-admin'
import { createClaudeClient } from './claudeService'
import pdfParse from 'pdf-parse'

/**
 * Lataa kaikki brändiohjedokumentit tietokannasta
 */
export async function loadBrandGuidelines() {
  if (!supabaseAdmin) {
    console.error('[brandGuidelineService] Supabase admin client missing')
    return []
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('brand_guidelines')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[brandGuidelineService] Error loading guidelines:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[brandGuidelineService] Exception loading guidelines:', error)
    return []
  }
}

/**
 * Lataa yksittäisen dokumentin tiedot
 */
export async function loadBrandGuideline(id) {
  if (!supabaseAdmin) {
    console.error('[brandGuidelineService] Supabase admin client missing')
    return null
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('brand_guidelines')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[brandGuidelineService] Error loading guideline:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('[brandGuidelineService] Exception loading guideline:', error)
    return null
  }
}

/**
 * Luo uusi brändiohjedokumentti
 */
export async function createBrandGuideline({ title, fileName, fileUrl, filePath, userId, userEmail }) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client missing')
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('brand_guidelines')
      .insert({
        title,
        file_name: fileName,
        file_url: fileUrl,
        file_path: filePath,
        uploaded_by_id: userId,
        uploaded_by_email: userEmail,
        is_active: true,
        status: 'uploaded' // Aluksi vain ladattu, prosessointi erikseen
      })
      .select()
      .single()

    if (error) {
      console.error('[brandGuidelineService] Error creating guideline:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('[brandGuidelineService] Exception creating guideline:', error)
    throw error
  }
}

/**
 * Poistaa brändiohjedokumentin (soft delete)
 */
export async function deleteBrandGuideline(id) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client missing')
  }

  try {
    const { error } = await supabaseAdmin
      .from('brand_guidelines')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('[brandGuidelineService] Error deleting guideline:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('[brandGuidelineService] Exception deleting guideline:', error)
    throw error
  }
}

/**
 * Lukee PDF-tiedoston sisällön
 */
export async function readPDFContent(fileBuffer) {
  try {
    const data = await pdfParse(fileBuffer)
    return data.text
  } catch (error) {
    console.error('[brandGuidelineService] Error parsing PDF:', error)
    throw new Error('PDF:n lukeminen epäonnistui')
  }
}

/**
 * Lukee Markdown-tiedoston sisällön
 */
export async function readMarkdownContent(fileBuffer) {
  try {
    return fileBuffer.toString('utf-8')
  } catch (error) {
    console.error('[brandGuidelineService] Error parsing Markdown:', error)
    throw new Error('Markdown-tiedoston lukeminen epäonnistui')
  }
}

/**
 * Lukee JSON-tiedoston sisällön ja muuntaa sen tekstiksi
 */
export async function readJSONContent(fileBuffer) {
  try {
    const jsonString = fileBuffer.toString('utf-8')
    const jsonData = JSON.parse(jsonString)
    // Muunna JSON selkeäksi tekstiksi
    return JSON.stringify(jsonData, null, 2)
  } catch (error) {
    console.error('[brandGuidelineService] Error parsing JSON:', error)
    throw new Error('JSON-tiedoston lukeminen epäonnistui')
  }
}

/**
 * Tunnistaa tiedostotyypin tiedostonimen perusteella
 */
function getFileType(fileName) {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  switch (extension) {
    case '.pdf':
      return 'pdf'
    case '.md':
      return 'markdown'
    case '.json':
      return 'json'
    default:
      return 'unknown'
  }
}

/**
 * Lataa tiedosto Supabase Storagesta ja lue sen sisältö
 * Tukee PDF, Markdown (.md) ja JSON (.json) tiedostoja
 */
export async function downloadAndReadFile(filePath) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client missing')
  }

  try {
    const { data, error } = await supabaseAdmin
      .storage
      .from('brand-guidelines')
      .download(filePath)

    if (error) {
      console.error('[brandGuidelineService] Error downloading file:', error)
      throw error
    }

    // Muunna Blob -> Buffer
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Tunnista tiedostotyyppi ja lue sen mukaan
    const fileType = getFileType(filePath)
    console.log(`[brandGuidelineService] Reading file type: ${fileType}`)

    let content
    switch (fileType) {
      case 'pdf':
        content = await readPDFContent(buffer)
        break
      case 'markdown':
        content = await readMarkdownContent(buffer)
        break
      case 'json':
        content = await readJSONContent(buffer)
        break
      default:
        throw new Error(`Tiedostotyyppi ei tuettu: ${fileType}`)
    }

    return content
  } catch (error) {
    console.error('[brandGuidelineService] Exception downloading/reading file:', error)
    throw error
  }
}

/**
 * Lataa PDF Supabase Storagesta ja lue sen sisältö
 * @deprecated Käytä downloadAndReadFile() joka tukee useita tiedostomuotoja
 */
export async function downloadAndReadPDF(filePath) {
  return downloadAndReadFile(filePath)
}

/**
 * Luo tiivistelmä brändiohjedokumentista AI:lla
 */
export async function summarizeBrandGuideline(documentContent, documentTitle) {
  const client = createClaudeClient()

  const prompt = `Luo tiivis yhteenveto tästä brändiohjedokumentista.
Keskity TÄRKEIMPIIN asioihin jotka markkinointisisällön kirjoittajan pitää tietää:

- Brändin ääni ja sävy
- Avainsanat ja fraasit joita tulisi käyttää
- Avainsanat ja fraasit joita VÄLTETÄÄN
- Visuaalinen identiteetti (värit, fontit, tyyli)
- Arvot ja missio
- Kohdeyleisö
- Muut tärkeät ohjeet

Dokumentin otsikko: ${documentTitle}

Dokumentin sisältö:
${documentContent}

Anna tiivistelmä napakasti, maksimissaan 300 sanaa. Käytä luettelomerkkejä.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      temperature: 0.3, // Matala lämpötila tarkkuuden vuoksi
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const textContent = response.content.find(block => block.type === 'text')
    return textContent?.text || 'Tiivistelmän luonti epäonnistui.'
  } catch (error) {
    console.error('[brandGuidelineService] Error creating summary:', error)
    throw new Error('Tiivistelmän luonti epäonnistui')
  }
}

/**
 * Käsittelee kaikki brändiohjedokumentit ja luo niistä yhteenvedon
 * Tätä käytetään system prompteissa
 */
export async function getBrandGuidelinesContext() {
  const guidelines = await loadBrandGuidelines()

  if (!guidelines || guidelines.length === 0) {
    return null
  }

  // Jos summary on jo olemassa, käytä sitä
  const summaries = guidelines.map(g => {
    if (g.summary) {
      return `\n## ${g.title}\n${g.summary}`
    }
    return `\n## ${g.title}\n(Tiivistelmä puuttuu)`
  })

  const context = `
BRÄNDIOHJEDOKUMENTIT:
${summaries.join('\n')}

Noudata näitä ohjeita kaikessa sisällöntuotannossa.
`

  return context
}

/**
 * Prosessoi dokumentti: lue tiedosto, luo tiivistelmä, tallenna tietokantaan
 * Tukee PDF, Markdown ja JSON tiedostoja
 */
export async function processBrandGuideline(guidelineId) {
  const guideline = await loadBrandGuideline(guidelineId)

  if (!guideline) {
    throw new Error('Dokumenttia ei löydy')
  }

  console.log(`[brandGuidelineService] Processing guideline: ${guideline.title}`)

  try {
    // Aseta status 'processing'
    await supabaseAdmin
      .from('brand_guidelines')
      .update({
        status: 'processing',
        error_message: null
      })
      .eq('id', guidelineId)

    // Lataa ja lue tiedosto (PDF, Markdown tai JSON)
    const content = await downloadAndReadFile(guideline.file_path)

    // Luo tiivistelmä
    const summary = await summarizeBrandGuideline(content, guideline.title)

    // Tallenna tiivistelmä ja sisältö tietokantaan
    const { error } = await supabaseAdmin
      .from('brand_guidelines')
      .update({
        content: content.substring(0, 50000), // Rajoita 50k merkkiin
        summary: summary,
        processed_at: new Date().toISOString(),
        status: 'processed',
        error_message: null
      })
      .eq('id', guidelineId)

    if (error) {
      console.error('[brandGuidelineService] Error saving summary:', error)
      throw error
    }

    console.log(`[brandGuidelineService] Successfully processed: ${guideline.title}`)
    return { content, summary }
  } catch (error) {
    console.error('[brandGuidelineService] Error processing guideline:', error)

    // Tallenna virhe tietokantaan
    await supabaseAdmin
      .from('brand_guidelines')
      .update({
        status: 'error',
        error_message: error.message || 'Tuntematon virhe prosessoinnissa'
      })
      .eq('id', guidelineId)
      .catch(err => {
        console.error('[brandGuidelineService] Error saving error status:', err)
      })

    throw error
  }
}

/**
 * Lataa tiedosto Supabase Storageen
 * @deprecated Ei enää käytössä - frontend lataa tiedostot suoraan Supabaseen
 */
export async function uploadToStorage(fileBuffer, fileName, contentType = 'application/pdf') {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client puuttuu - tarkista ympäristömuuttujat')
  }

  // Validoi tiedosto
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Tiedosto on tyhjä tai ei ole luettavissa')
  }

  // Validoi tiedostotyyppi
  if (contentType !== 'application/pdf') {
    throw new Error(`Vain PDF-tiedostot sallittuja. Annettu tyyppi: ${contentType}`)
  }

  const filePath = `${Date.now()}-${fileName}`

  console.log(`[uploadToStorage] Ladataan tiedostoa: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`)

  try {
    // Tarkista että storage bucket on olemassa
    const { data: buckets, error: bucketError } = await supabaseAdmin
      .storage
      .listBuckets()

    if (bucketError) {
      console.error('[uploadToStorage] Virhe tarkistettaessa bucketteja:', bucketError)
      throw new Error(`Storage-yhteysvirhe: ${bucketError.message}`)
    }

    const brandGuidelinesBucket = buckets?.find(b => b.name === 'brand-guidelines')
    if (!brandGuidelinesBucket) {
      throw new Error('Storage bucket "brand-guidelines" puuttuu! Luo se Supabase Dashboardissa.')
    }

    // Lataa tiedosto
    const { data, error } = await supabaseAdmin
      .storage
      .from('brand-guidelines')
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: false
      })

    if (error) {
      console.error('[uploadToStorage] Storage upload virhe:', error)

      // Tarkenna virheviestit
      if (error.message.includes('The resource already exists')) {
        throw new Error('Tiedosto on jo olemassa. Yritä uudelleen.')
      } else if (error.message.includes('new row violates row-level security')) {
        throw new Error('RLS-virhe: Tarkista Storage bucket oikeudet (Row Level Security policies)')
      } else if (error.message.includes('Payload too large') || error.message.includes('413')) {
        throw new Error('Tiedosto on liian suuri. Maksimi koko on 50 MB.')
      } else {
        throw new Error(`Storage upload epäonnistui: ${error.message}`)
      }
    }

    if (!data || !data.path) {
      throw new Error('Tiedoston lataus epäonnistui - ei palautettu tiedostopolkua')
    }

    console.log(`[uploadToStorage] Tiedosto ladattu onnistuneesti: ${data.path}`)

    // Hae public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('brand-guidelines')
      .getPublicUrl(filePath)

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Public URL:n hakeminen epäonnistui')
    }

    console.log(`[uploadToStorage] Public URL luotu: ${urlData.publicUrl}`)

    return {
      filePath: data.path,
      fileUrl: urlData.publicUrl
    }
  } catch (error) {
    console.error('[uploadToStorage] Virhe:', error)

    // Jos virhe on jo heitetty ylhäältä, käytä sitä
    if (error.message.includes('Storage') ||
        error.message.includes('bucket') ||
        error.message.includes('RLS') ||
        error.message.includes('liian suuri') ||
        error.message.includes('tyhjä') ||
        error.message.includes('sallittuja')) {
      throw error
    }

    // Muuten wrap geneeriseen virheilmoitukseen
    throw new Error(`Tiedoston lataus epäonnistui: ${error.message || 'Tuntematon virhe'}`)
  }
}

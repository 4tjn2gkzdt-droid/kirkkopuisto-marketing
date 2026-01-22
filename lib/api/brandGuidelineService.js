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
        is_active: true
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
 * Lataa PDF Supabase Storagesta ja lue sen sisältö
 */
export async function downloadAndReadPDF(filePath) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client missing')
  }

  try {
    const { data, error } = await supabaseAdmin
      .storage
      .from('brand-guidelines')
      .download(filePath)

    if (error) {
      console.error('[brandGuidelineService] Error downloading PDF:', error)
      throw error
    }

    // Muunna Blob -> Buffer
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Lue PDF:n sisältö
    const content = await readPDFContent(buffer)
    return content
  } catch (error) {
    console.error('[brandGuidelineService] Exception downloading/reading PDF:', error)
    throw error
  }
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
 * Prosessoi dokumentti: lue PDF, luo tiivistelmä, tallenna tietokantaan
 */
export async function processBrandGuideline(guidelineId) {
  const guideline = await loadBrandGuideline(guidelineId)

  if (!guideline) {
    throw new Error('Dokumenttia ei löydy')
  }

  console.log(`[brandGuidelineService] Processing guideline: ${guideline.title}`)

  try {
    // Lataa ja lue PDF
    const content = await downloadAndReadPDF(guideline.file_path)

    // Luo tiivistelmä
    const summary = await summarizeBrandGuideline(content, guideline.title)

    // Tallenna tiivistelmä ja sisältö tietokantaan
    const { error } = await supabaseAdmin
      .from('brand_guidelines')
      .update({
        content: content.substring(0, 50000), // Rajoita 50k merkkiin
        summary: summary,
        processed_at: new Date().toISOString()
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
    throw error
  }
}

/**
 * Lataa tiedosto Supabase Storageen
 */
export async function uploadToStorage(fileBuffer, fileName, contentType = 'application/pdf') {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client missing')
  }

  const filePath = `${Date.now()}-${fileName}`

  try {
    const { data, error } = await supabaseAdmin
      .storage
      .from('brand-guidelines')
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: false
      })

    if (error) {
      console.error('[brandGuidelineService] Error uploading file:', error)
      throw error
    }

    // Hae public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('brand-guidelines')
      .getPublicUrl(filePath)

    return {
      filePath: data.path,
      fileUrl: urlData.publicUrl
    }
  } catch (error) {
    console.error('[brandGuidelineService] Exception uploading file:', error)
    throw error
  }
}

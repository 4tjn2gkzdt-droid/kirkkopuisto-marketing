/**
 * Apufunktio media_type-kentän varmistamiseen Claude API:n kuva-sisältöblokeissa.
 *
 * Claude API vaatii media_type-kentän base64-kuvissa:
 * { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "..." } }
 */

/**
 * Tunnistaa media_type base64-datan alusta tai tiedostopäätteestä.
 */
function detectMediaType(base64Data, filename) {
  // Tarkista base64 data URI prefix (esim. "data:image/jpeg;base64,...")
  if (base64Data && base64Data.startsWith('data:')) {
    const match = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,/)
    if (match) {
      return match[1]
    }
  }

  // Tarkista tiedostopääte
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    }
    if (mimeTypes[ext]) {
      return mimeTypes[ext]
    }
  }

  // Tunnista magic bytes base64-datasta
  if (base64Data) {
    const cleanData = base64Data.replace(/^data:[^;]+;base64,/, '')
    if (cleanData.startsWith('/9j/')) return 'image/jpeg'
    if (cleanData.startsWith('iVBOR')) return 'image/png'
    if (cleanData.startsWith('R0lGOD')) return 'image/gif'
    if (cleanData.startsWith('UklGR')) return 'image/webp'
  }

  // Oletus: image/jpeg
  return 'image/jpeg'
}

/**
 * Varmistaa, että yksittäinen sisältöblokki sisältää media_type-kentän jos se on base64-kuva.
 */
function ensureImageMediaType(contentBlock) {
  if (!contentBlock || contentBlock.type !== 'image' || !contentBlock.source) {
    return contentBlock
  }

  if (contentBlock.source.type === 'base64' && !contentBlock.source.media_type) {
    return {
      ...contentBlock,
      source: {
        ...contentBlock.source,
        media_type: detectMediaType(contentBlock.source.data),
        // Poista data URI prefix jos se on mukana
        data: contentBlock.source.data?.replace(/^data:[^;]+;base64,/, '') || contentBlock.source.data
      }
    }
  }

  // Jos data on data URI mutta type ei ole asetettu, korjaa sekin
  if (contentBlock.source.type === 'base64' && contentBlock.source.data?.startsWith('data:')) {
    const mediaType = contentBlock.source.media_type || detectMediaType(contentBlock.source.data)
    return {
      ...contentBlock,
      source: {
        ...contentBlock.source,
        media_type: mediaType,
        data: contentBlock.source.data.replace(/^data:[^;]+;base64,/, '')
      }
    }
  }

  return contentBlock
}

/**
 * Käy läpi kaikki viestit ja varmistaa, että kuvablokit sisältävät media_type-kentän.
 */
function ensureMessagesImageMediaTypes(messages) {
  if (!Array.isArray(messages)) return messages

  return messages.map(msg => {
    if (!msg || !msg.content) return msg

    // Jos content on array (multimodal viesti)
    if (Array.isArray(msg.content)) {
      return {
        ...msg,
        content: msg.content.map(ensureImageMediaType)
      }
    }

    return msg
  })
}

module.exports = {
  detectMediaType,
  ensureImageMediaType,
  ensureMessagesImageMediaTypes
}

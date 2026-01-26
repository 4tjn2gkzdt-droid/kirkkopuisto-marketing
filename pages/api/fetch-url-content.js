import * as cheerio from 'cheerio';

/**
 * Hakee sisällön URL:sta ja parsii sen
 * @param {string} url - URL josta sisältö haetaan
 * @returns {Promise<Object>} Parsittu sisältö
 */
async function fetchAndParseUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Poista script ja style tagit
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();

    // Hae otsikko
    let title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text() ||
                $('h1').first().text() ||
                '';
    title = title.trim();

    // Hae kuvaus/tiivistelmä
    let summary = $('meta[property="og:description"]').attr('content') ||
                  $('meta[name="description"]').attr('content') ||
                  $('meta[name="twitter:description"]').attr('content') ||
                  '';
    summary = summary.trim();

    // Hae päivämäärä
    let publishDate = $('meta[property="article:published_time"]').attr('content') ||
                      $('meta[name="publish-date"]').attr('content') ||
                      $('time').attr('datetime') ||
                      null;

    // Hae pääsisältö
    // Kokeile yleisiä sisältö-selektoreita
    let content = '';
    const contentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.content',
      '.post-content',
      '.article-content',
      '#content',
      '.entry-content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // Jos ei löytynyt, ota kaikki p-tagit
    if (!content || content.trim().length < 100) {
      content = $('p').map((i, el) => $(el).text()).get().join('\n\n');
    }

    // Siivoa sisältö
    content = content
      .replace(/\s+/g, ' ')  // Poista ylimääräiset välilyönnit
      .replace(/\n\s*\n/g, '\n\n')  // Poista tyhjät rivit
      .trim();

    // Päättele tyyppi URL:sta tai sisällöstä
    let type = 'article';
    if (url.includes('newsletter') || url.includes('uutiskirje') || title.toLowerCase().includes('newsletter')) {
      type = 'newsletter';
    } else if (url.includes('news') || url.includes('uutis')) {
      type = 'news';
    }

    // Päättele vuosi
    let year = null;
    if (publishDate) {
      year = new Date(publishDate).getFullYear();
    } else {
      // Yritä löytää vuosi URL:sta
      const yearMatch = url.match(/\/(20\d{2})\//);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      }
    }

    return {
      success: true,
      data: {
        title,
        content,
        summary: summary || (content.substring(0, 200) + '...'),
        url,
        type,
        publish_date: publishDate,
        year,
        metadata: {
          fetched_at: new Date().toISOString(),
          content_length: content.length
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      url,
      error: error.message
    };
  }
}

/**
 * API-reitti joka hakee sisällön URL:ista ja tallentaa ne tietokantaan
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { urls, saveToDatabase = false } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    // Rajoita max 10 URL:a kerralla
    if (urls.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 URLs allowed at once' });
    }

    // Hae kaikki URL:t rinnakkain
    const results = await Promise.all(
      urls.map(url => fetchAndParseUrl(url))
    );

    // Jos tallennetaan tietokantaan
    if (saveToDatabase) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const successfulResults = results.filter(r => r.success);

      if (successfulResults.length > 0) {
        const dataToInsert = successfulResults.map(r => ({
          type: r.data.type,
          title: r.data.title,
          content: r.data.content,
          summary: r.data.summary,
          url: r.data.url,
          publish_date: r.data.publish_date,
          year: r.data.year,
          metadata: r.data.metadata,
          is_active: true
        }));

        const { data, error } = await supabase
          .from('historical_content')
          .insert(dataToInsert)
          .select();

        if (error) {
          console.error('Database insert error:', error);
          return res.status(500).json({
            error: 'Failed to save to database',
            details: error.message,
            fetchedResults: results
          });
        }

        return res.status(200).json({
          success: true,
          message: `Successfully fetched and saved ${successfulResults.length} items`,
          saved: data,
          failed: results.filter(r => !r.success),
          total: urls.length
        });
      }
    }

    // Palauta vain haetut tulokset ilman tallennusta
    return res.status(200).json({
      success: true,
      results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total: urls.length
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

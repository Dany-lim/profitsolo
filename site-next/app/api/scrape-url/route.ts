import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // Fetch the page with optional cookie authentication
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
    };

    // Support cookie-based authentication via env variable
    if (process.env.STARTERSTORY_COOKIE) {
      headers['Cookie'] = process.env.STARTERSTORY_COOKIE;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      return NextResponse.json(
        { error: `페이지를 가져올 수 없습니다 (${response.status})` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unnecessary elements
    $('script, style, nav, footer, header, .sidebar, .ad, .advertisement, .social-share').remove();

    // Try to extract the main story content
    let content = '';
    let title = '';

    // Extract title
    title = $('h1').first().text().trim();

    // Starter Story specific selectors
    const storySelectors = [
      '.story-content',
      '.article-content',
      'article',
      '.post-content',
      '.entry-content',
      'main',
      '[role="main"]',
    ];

    for (const selector of storySelectors) {
      const el = $(selector);
      if (el.length > 0) {
        // Convert HTML to readable text preserving structure
        content = extractStructuredText($, el);
        if (content.length > 500) break;
      }
    }

    // Fallback: extract from body
    if (content.length < 500) {
      content = extractStructuredText($, $('body'));
    }

    if (!content || content.length < 100) {
      return NextResponse.json(
        { error: '페이지에서 콘텐츠를 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      title,
      content: content.trim(),
      contentLength: content.length,
      sourceUrl: url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '스크래핑 실패', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function extractStructuredText($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string {
  const lines: string[] = [];

  el.find('h1, h2, h3, h4, h5, h6, p, li, blockquote, td, th').each((_, element) => {
    const tag = (element as any).tagName?.toLowerCase();
    const text = $(element).text().trim();
    if (!text) return;

    if (tag?.startsWith('h')) {
      const level = parseInt(tag[1]);
      lines.push('');
      lines.push('#'.repeat(level) + ' ' + text);
      lines.push('');
    } else if (tag === 'blockquote') {
      lines.push('> ' + text);
    } else if (tag === 'li') {
      lines.push('- ' + text);
    } else {
      lines.push(text);
    }
  });

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

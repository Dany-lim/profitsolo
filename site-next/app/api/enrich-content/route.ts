import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { rawContent, companyUrl } = await request.json();

    if (!rawContent || rawContent.trim().length < 100) {
      return NextResponse.json(
        { error: 'Raw content가 너무 짧습니다.' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

    async function generateWithRetry(prompt: string) {
      for (const modelName of MODEL_PRIORITY) {
        try {
          const m = genAI.getGenerativeModel({ model: modelName });
          const result = await m.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });
          console.log(`[enrich-content] Used model: ${modelName}`);
          return result;
        } catch (err: any) {
          const status = err?.status || err?.message?.match(/\[(\d{3})/)?.[1];
          if ((status == 503 || status == 429 || status == 404) && modelName !== MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) {
            console.warn(`[enrich-content] ${modelName} unavailable (${status}), trying next model...`);
            continue;
          }
          throw err;
        }
      }
      throw new Error('All models unavailable');
    }

    // Step 1: Extract entities from raw content
    const extractPrompt = `아래 인터뷰/기사에서 핵심 정보를 추출해주세요.
반드시 순수 JSON만 출력하세요 (마크다운 코드 블록 제외):

{
  "companyName": "회사/서비스 이름 (영문)",
  "companyNameKr": "회사/서비스 이름 (한글 또는 영문 그대로)",
  "websiteUrl": "공식 웹사이트 URL (없으면 빈 문자열)",
  "founderName": "창업자 이름",
  "coFounders": ["공동 창업자 이름들"],
  "founderBackground": "창업자 배경 (직업, 전공 등)",
  "foundedYear": "시작 연도",
  "headquarters": "본사 위치",
  "monthlyRevenue": "월 수익 (원문 그대로)",
  "employeeCount": "직원 수",
  "industry": "산업 분야",
  "businessModel": "비즈니스 모델 요약",
  "socialUrls": ["소셜미디어/LinkedIn 등 URL이 언급되었다면"],
  "keyProducts": ["주요 제품/서비스"],
  "keyMilestones": ["주요 성과/이정표"],
  "toolsUsed": ["사용 도구/기술"],
  "revenueHistory": ["수익 변화 이력"],
  "startupCost": "초기 투자 비용",
  "trafficSource": "주요 트래픽/고객 확보 채널"
}

[원본 콘텐츠]
${rawContent.substring(0, 15000)}`;

    const extractResult = await generateWithRetry(extractPrompt);

    let extractText = extractResult.response.text().trim();
    if (extractText.startsWith('```json')) extractText = extractText.substring(7);
    if (extractText.startsWith('```')) extractText = extractText.substring(3);
    if (extractText.endsWith('```')) extractText = extractText.substring(0, extractText.length - 3);
    extractText = extractText.trim();

    let entities;
    try {
      entities = JSON.parse(extractText);
    } catch {
      return NextResponse.json(
        { error: '엔티티 추출 실패', preview: extractText.substring(0, 300) },
        { status: 500 }
      );
    }

    // Step 2: Scrape company website if available
    // 우선순위: 사용자 입력 companyUrl > Gemini 추출 websiteUrl
    const targetUrl = companyUrl || entities.websiteUrl;
    if (targetUrl && !entities.websiteUrl) {
      entities.websiteUrl = targetUrl;
    }
    let websiteInfo = '';
    let scrapeError = '';
    if (targetUrl) {
      const isValidUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');
      if (!isValidUrl) {
        scrapeError = `잘못된 URL 형식: ${targetUrl}`;
        console.warn(`[enrich-content] Invalid URL format: ${targetUrl}`);
      } else {
        try {
          console.log(`[enrich-content] Scraping: ${targetUrl}`);
          const siteRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml',
            },
            signal: AbortSignal.timeout(10000),
            redirect: 'follow',
          });

          if (siteRes.ok) {
            const html = await siteRes.text();
            const $ = cheerio.load(html);
            $('script, style, nav, footer, iframe').remove();

            const metaDesc = $('meta[name="description"]').attr('content') || '';
            const metaTitle = $('title').text().trim();
            const ogDesc = $('meta[property="og:description"]').attr('content') || '';
            const h1 = $('h1').first().text().trim();

            let mainText = '';
            $('main, [role="main"], .hero, .about, #about, .features').each((_, el) => {
              mainText += $(el).text().trim() + '\n';
            });
            if (!mainText) {
              mainText = $('body').text().trim().substring(0, 2000);
            }

            websiteInfo = [
              metaTitle && `사이트 제목: ${metaTitle}`,
              metaDesc && `메타 설명: ${metaDesc}`,
              ogDesc && ogDesc !== metaDesc && `OG 설명: ${ogDesc}`,
              h1 && `메인 헤딩: ${h1}`,
              mainText && `본문 요약:\n${mainText.substring(0, 1500)}`,
            ].filter(Boolean).join('\n');
            console.log(`[enrich-content] Scrape OK (${websiteInfo.length} chars)`);
          } else {
            scrapeError = `HTTP ${siteRes.status}`;
            console.warn(`[enrich-content] HTTP ${siteRes.status}: ${targetUrl}`);
          }
        } catch (err: any) {
          scrapeError = err?.cause?.code || err?.message || 'network error';
          console.warn(`[enrich-content] Scrape failed: ${targetUrl} — ${scrapeError}`);
        }
      }
    }

    // Step 3: Compile enriched "추가 온라인 자료" section using Gemini
    const compilePrompt = `아래 정보를 바탕으로 "추가 온라인 자료" 섹션을 한국어로 작성해주세요.
이 섹션은 스타트업 케이스 스터디의 부록으로, 독자가 추가 리서치를 할 때 참고할 수 있는 구조화된 정보입니다.

[추출된 엔티티 정보]
${JSON.stringify(entities, null, 2)}

${websiteInfo ? `[공식 웹사이트 스크래핑 결과]\n${websiteInfo}` : '[공식 웹사이트: 접근 불가]'}

아래 형식으로 마크다운 텍스트를 출력하세요. 확인된 정보만 포함하고, 없는 정보는 생략하세요.
파이프 기호(|)와 마크다운 표는 절대 사용하지 마세요.

## 추가 온라인 자료

### 공식 웹사이트 & 온라인 프레즌스
- **공식 웹사이트**: URL
- **소셜 미디어**: 있다면 나열

### 배경 정보
- **창업자**: 이름 (배경)
- **시작 연도**: 연도
- **본사**: 위치
- **월 수익**: 금액
- **직원**: 수

### 주요 성과
- 성과 나열

### 비즈니스 모델
- **수익 구조**: 설명
- **트래픽 소스**: 설명

### 제품 & 서비스
- 서비스 나열

### 사용 도구
- 도구 나열

### 창업 과정
- 과정 요약

### 성공 요인
- 요인 나열

확인되지 않은 섹션은 통째로 생략하세요. 마크다운 코드 블록 없이 순수 텍스트만 출력하세요.`;

    const compileResult = await generateWithRetry(compilePrompt);

    let enrichedSection = compileResult.response.text().trim();
    if (enrichedSection.startsWith('```markdown')) enrichedSection = enrichedSection.substring(11);
    if (enrichedSection.startsWith('```')) enrichedSection = enrichedSection.substring(3);
    if (enrichedSection.endsWith('```')) enrichedSection = enrichedSection.substring(0, enrichedSection.length - 3);
    enrichedSection = enrichedSection.trim();

    // Remove any pipe characters
    enrichedSection = enrichedSection.replace(/\|/g, '');

    return NextResponse.json({
      success: true,
      entities,
      enrichedSection,
      websiteScraped: !!websiteInfo,
      scrapeError: scrapeError || undefined,
      attemptedUrl: targetUrl || undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '추가 정보 조사 실패', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

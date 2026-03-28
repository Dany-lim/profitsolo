/**
 * EarningBull 채널 영상 → 아이디어모음 포스트 배치 변환 스크립트
 *
 * 사용법: npx tsx scripts/batch-ideas.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// .env.local 로드
const envPath = resolve(import.meta.dirname || __dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.substring(0, eqIdx);
  const value = trimmed.substring(eqIdx + 1);
  process.env[key] = value;
}

// ── 설정 ──
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY = process.env.GEMINI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const APPROVED_TAGS = [
  "AI", "Automation", "B2B SaaS", "Community", "Discord", "Fintech",
  "Marketing", "SEO", "SaaS", "Service", "Upwork",
  "마케팅", "블로그", "서비스", "소프트웨어", "숙박",
  "제휴 마케팅", "콘텐츠", "콘텐츠 크리에이터",
  "이커머스", "드롭쉬핑", "디지털 제품", "사이드허슬",
  "YouTube", "TikTok", "Pinterest", "Etsy", "Gumroad",
  "Print on Demand", "수익화", "자동화",
];

// 80개 영상 ID
const VIDEO_IDS = [
  '-n-pdkpzkWg', 'b98NmySeN2E', 'nQg6FNcYcyo', 'eGCM70ZCuVI', 'Y5mepr3Pkpc',
  'AVsGaCEtQR4', 'v_pf4VuaiAQ', '-Sc0UoZX9XU', '6_KDwaAjZOs', 'yCv8qkYdu1Q',
  'lin8KbvyOvE', '4T04FbxOYp0', 'Olz60oJy-zU', 'jjayY1HuuXU', 'EQKGEjXHH3E',
  'Jwy73oZjK5c', '89oeHmhPd7o', 'KlRhFefXpVQ', 'VCBY2uiDjNk', '6P-R0KN8Np8',
  'z4SgyzEbPwc', 'KhbCoB8ePMU', '0Y0SjfBduB4', '47XGLF-26Jc', 'RvT0m3bjT-E',
  '_tJcw0jt4ek', '6pbeV0wnG6g', '3vBTo_rsDwM', 'WeNYWfB0YFw', 'W7YVMS7QNHk',
  'c1UgozhJg3c', 'PC2Vljn0IDw', 'NBCe3i7-Ics', 'Z9ZEw8--Yqs', '09BQhwgEf0w',
  'MnhqcNsOBMs', 'N6hsTx7b1Pk', 'nLDH4F4Mtrk', 'rhbSVnQqM94', 'YU_V0w1Af0g',
  'kerdYD6dTZc', 'yQB1rCgC_a8', '62tYiYYJ62Y', '0sW-FPt3tZE', '2KXKJMDWOUs',
  'DmvqqBRhO-I', 'CS13ZXM0wEY', 'k334Uy_jios', 'ltPTWqcdbm0', 'Xs0h513JFK0',
  'kfgZiGMfRY8', 'uERfkjkGFzs', '6qF-TfAYlfk', '83zNSeFsOuY', 'MXq11FMO5vs',
  'azqNoMpyOTE', 'tOIKfTofOJY', '2_KwIpWcKKc', 'iGO-F7h9wFs', '4iNSVnnQ3a4',
  '6-QulKj6YTc', 'CwRXqy4_ZGM', 'Xd9jmJSsBAY', '7eqYBqtxx8o', 'fn65ZISaVi0',
  'UvE5haa5kmw', 'xuCc2jv61Lg', 'iXtlfn8vtUE', 'rQdyaB7-6j4', '3nhT5uQk2pE',
  'qxLNAx1nihI', 'LW2MmRP_IQU', 'at__lIQkcrA', 'z1E3M5r6ohM', 'oCV03H-YP28',
  '7rk4i4lqQr8', 'WCgX4RVP0cE', '6yPvgT_vBsw', 'ir85KGHKegQ', 'mFRnEZRXwIE',
];

// ── 자막 추출 ──
async function getTranscript(videoId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    if (transcript && transcript.length > 0) {
      return transcript.map(t => t.text).join(' ');
    }
    const fallback = await YoutubeTranscript.fetchTranscript(videoId);
    if (fallback && fallback.length > 0) {
      return fallback.map(t => t.text).join(' ');
    }
    return null;
  } catch {
    return null;
  }
}

// ── 영상 제목 가져오기 ──
async function getVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();
    return data.title || videoId;
  } catch {
    return videoId;
  }
}

// ── Gemini 호출 (재시도 포함) ──
const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

async function generateWithRetry(prompt: string, jsonMode = false) {
  for (const modelName of MODEL_PRIORITY) {
    try {
      const config = jsonMode
        ? { model: modelName, generationConfig: { responseMimeType: 'application/json' as const } }
        : { model: modelName };
      const m = genAI.getGenerativeModel(config);
      const result = await m.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      return result;
    } catch (err: any) {
      const status = err?.status || err?.message?.match(/\[(\d{3})/)?.[1];
      if ((status == 503 || status == 429 || status == 404) && modelName !== MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) {
        console.warn(`  ${modelName} 사용 불가 (${status}), 다음 모델 시도...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error('All models unavailable');
}

function cleanJson(text: string): string {
  let c = text.trim();
  c = c.replace(/^\uFEFF/, '');
  c = c.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  if (!c.startsWith('{')) {
    const s = c.indexOf('{');
    const e = c.lastIndexOf('}');
    if (s !== -1 && e > s) c = c.substring(s, e + 1);
  }
  return c;
}

// ── 아이디어 포스트 생성 ──
async function generateIdeaPost(transcript: string, title: string, videoId: string) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Step 1: 블로그 콘텐츠 생성 (마크다운)
  const contentPrompt = `당신은 온라인으로 돈 버는 다양한 방법을 직접 리서치하고 테스트하는 블로거입니다. 아래 YouTube 영상 자막을 바탕으로, 마치 본인이 직접 조사하고 발견한 내용을 공유하는 것처럼 한국어 블로그 포스트를 작성하세요.

[영상 제목]: ${title}
[영상 URL]: ${videoUrl}

[문체 & 톤]
- 1인칭 시점. "제가 찾아본 결과", "직접 확인해보니", "이 방법을 분석해봤는데" 같은 표현을 자연스럽게 사용하라.
- 친근하되 전문적인 톤. 친구에게 수익화 팁을 알려주는 느낌.
- "~합니다", "~됩니다", "~입니다" 같은 존댓말 기반.
- 구체적인 숫자, 도구명, 플랫폼명, 수익 구조를 명확히 전달해라.
- 문장은 짧고 명료하게. 군더더기 없이.

[구조]
1. 도입 (2~3줄): 이 주제를 왜 조사하게 됐는지, 어떤 점이 흥미로웠는지로 시작
2. 본문: 핵심 전략/방법을 단계별로 설명
   - 각 단계마다 ### 소제목
   - 구체적인 도구, 사이트, 방법 포함
   - 실제 수치/예시가 있으면 반드시 포함
3. 마무리: 본인의 생각이나 소감을 한두 줄로. 장황한 요약 금지.

[외부 링크]
- 본문에서 언급하는 도구/플랫폼/사이트 중 가장 핵심적인 것 1개만 마크다운 링크로 넣어라.
- 형식: [도구명](https://실제URL)
- 실제 존재하는 URL만 사용. 모르면 링크 넣지 마라.

[줄간격 규칙 - 매우 중요]
- 문단과 문단 사이에 빈 줄을 하나씩 넣어서 읽기 쉽게 만들어라.
- 소제목(###) 위에는 빈 줄 2개, 아래에는 빈 줄 1개를 넣어라.
- 한 문단은 3~5문장. 너무 길게 한 덩어리로 쓰지 마라.
- 핵심 수치나 도구명이 나오는 문장은 별도 짧은 문단으로 분리해도 좋다.

[분량 - 반드시 지켜라]
- 절대 1,500자를 넘기지 마라. 목표는 1,000~1,500자.
- 소제목(###)은 최대 3개까지만.
- 각 소제목 아래 문단은 2~3문장이면 충분하다.

[절대 금지]
- 이모지/유니코드 특수문자 완전 금지. 단 하나도 쓰지 마라.
- 마크다운 표(파이프) 금지
- 소제목은 ##, ###만 사용
- 볼드(**) 사용 완전 금지. 강조 없이 평문으로만 작성해라.
- "~이다", "~것이다", "~점이다", "~된다", "~한다" 같은 문어체/반말 어미 금지. 반드시 "~합니다", "~됩니다", "~입니다"체로 작성. 예: "중요한 점이다" (X) → "중요한 점입니다" (O)
- AI가 쓴 티 나는 표현 완전 금지: "혁신", "시사점", "교훈", "주목할 만한", "눈여겨볼", "강력한 도구", "게임 체인저", "놀라운 잠재력", "핵심 포인트", "다양한 방법", "결론적으로", "요약하자면", "마무리하며"
- "지금 바로 시작해보세요!" 같은 뻔한 CTA 금지
- JSON, 코드 블록 금지. 순수 마크다운 본문만 출력
- 글머리 번호(1. 2. 3.)를 남발하지 마라. 문단으로 풀어써라.
- HTML 태그 금지 (br, div, span 등). 줄간격은 빈 줄(엔터 두 번)로만 조절해라.

[자막 내용]
${transcript.substring(0, 4000)}

위 내용을 바탕으로 실전 가이드 블로그 포스트를 작성해라. 본문만 출력.`;

  const contentResult = await generateWithRetry(contentPrompt);
  let content = contentResult.response.text().trim();

  // 테이블/파이프/HTML태그 제거
  content = content.split('\n')
    .filter(line => !(line.trim().startsWith('|') && line.trim().includes('|')))
    .join('\n')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<\/?(?:div|span|p|br)[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\|/g, '');

  // Step 2: 메타데이터 생성 (JSON)
  const metaPrompt = `아래 블로그 포스트의 메타데이터를 JSON으로 생성하세요.

[블로그 본문 (앞부분)]
${content.substring(0, 2000)}

[원본 영상 제목]: ${title}

[승인된 태그 목록] - 이 목록에서 2~3개 선택:
${JSON.stringify(APPROVED_TAGS)}

아래 JSON 형식으로 출력:
{
  "id": "kebab-case-영문-id (예: etsy-digital-product-guide)",
  "title": "한글 제목 (구체적 수치 + 방법, 클릭하고 싶은 제목, 30자 이내)",
  "tags": ["승인된 태그만 2~3개"],
  "seo": {
    "metaTitle": "SEO 제목 (60자 이내)",
    "metaDescription": "SEO 설명 (70~160자)",
    "focusKeyword": "핵심 검색 키워드 (한국어, 1~3단어)"
  }
}`;

  const metaResult = await generateWithRetry(metaPrompt, true);
  const metaText = cleanJson(metaResult.response.text());
  const metadata = JSON.parse(metaText);

  return {
    id: metadata.id || `idea-${videoId}`,
    title: metadata.title || title,
    tags: Array.isArray(metadata.tags)
      ? metadata.tags.filter((t: string) => APPROVED_TAGS.includes(t)).slice(0, 3)
      : ['수익화'],
    content,
    seo: metadata.seo || {},
    sourceUrl: videoUrl,
  };
}

// ── 메인 실행 ──
async function main() {
  console.log(`\n=== EarningBull 배치 변환 시작 ===`);
  console.log(`총 ${VIDEO_IDS.length}개 영상 처리 예정\n`);

  // 이미 처리된 영상 확인
  const { data: existing } = await supabase
    .from('case_studies')
    .select('source_url')
    .eq('category', 'idea');

  const processedVideoIds = new Set<string>();
  if (existing) {
    for (const row of existing) {
      if (row.source_url) {
        const match = row.source_url.match(/v=([^&]+)/);
        if (match) processedVideoIds.add(match[1]);
      }
    }
  }
  console.log(`이미 처리된 영상: ${processedVideoIds.size}개\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < VIDEO_IDS.length; i++) {
    const videoId = VIDEO_IDS[i];
    console.log(`[${i + 1}/${VIDEO_IDS.length}] ${videoId}`);

    // 이미 처리된 영상 스킵
    if (processedVideoIds.has(videoId)) {
      console.log(`  → 이미 처리됨, 스킵\n`);
      skipped++;
      continue;
    }

    try {
      // 1. 제목 가져오기
      const title = await getVideoTitle(videoId);
      console.log(`  제목: ${title}`);

      // 2. 자막 추출
      const transcript = await getTranscript(videoId);
      if (!transcript || transcript.length < 200) {
        console.log(`  → 자막 없음 또는 너무 짧음, 스킵\n`);
        failed++;
        continue;
      }
      console.log(`  자막: ${transcript.length}자`);

      // 3. 아이디어 포스트 생성
      const post = await generateIdeaPost(transcript, title, videoId);
      console.log(`  생성 완료: ${post.title} (${post.content.length}자)`);

      // 4. ID 유니크 확인
      const { data: idCheck } = await supabase
        .from('case_studies')
        .select('id')
        .ilike('id', `${post.id}%`);

      let finalId = post.id;
      if (idCheck && idCheck.length > 0) {
        finalId = `${post.id}-${idCheck.length + 1}`;
      }

      // 5. Supabase 저장
      const { error: dbError } = await supabase
        .from('case_studies')
        .insert({
          id: finalId,
          title: post.title,
          korean_title: '',
          byline: 'By EarningBull',
          url: '',
          mrr: '',
          launch_date: '',
          thumbnail_image: '',
          tags: post.tags,
          metrics: [],
          executive_summary: [],
          product_preview: null,
          k_market_strategy: null,
          enriched_content: null,
          published: false,
          seo: post.seo,
          content: post.content,
          category: 'idea',
          source_url: post.sourceUrl,
        });

      if (dbError) {
        console.log(`  → DB 저장 실패: ${dbError.message}\n`);
        failed++;
        continue;
      }

      console.log(`  → 저장 완료: ${finalId}\n`);
      success++;

      // Rate limiting: Gemini API 부하 방지 (3초 대기)
      await new Promise(r => setTimeout(r, 3000));

    } catch (err: any) {
      console.log(`  → 에러: ${err.message}\n`);
      failed++;

      // Rate limit 에러면 30초 대기 후 재시도
      if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        console.log('  Rate limit 감지, 30초 대기...');
        await new Promise(r => setTimeout(r, 30000));
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`성공: ${success} | 스킵: ${skipped} | 실패: ${failed}`);
  console.log(`총: ${success + skipped + failed}/${VIDEO_IDS.length}`);
}

main().catch(console.error);

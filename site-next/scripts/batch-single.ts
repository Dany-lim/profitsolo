/**
 * 단일 영상 처리 스크립트
 * 사용법: npx tsx scripts/batch-single.ts <videoId>
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const envPath = resolve(import.meta.dirname || __dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  process.env[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const APPROVED_TAGS = [
  "AI", "Automation", "B2B SaaS", "Community", "Discord", "Fintech",
  "Marketing", "SEO", "SaaS", "Service", "Upwork",
  "마케팅", "블로그", "서비스", "소프트웨어", "숙박",
  "제휴 마케팅", "콘텐츠", "콘텐츠 크리에이터",
  "이커머스", "드롭쉬핑", "디지털 제품", "사이드허슬",
  "YouTube", "TikTok", "Pinterest", "Etsy", "Gumroad",
  "Print on Demand", "수익화", "자동화",
];

const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

async function generateWithRetry(prompt: string, jsonMode = false) {
  for (const modelName of MODEL_PRIORITY) {
    try {
      const config = jsonMode
        ? { model: modelName, generationConfig: { responseMimeType: 'application/json' as const } }
        : { model: modelName };
      const m = genAI.getGenerativeModel(config);
      return await m.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    } catch (err: any) {
      const status = err?.status || err?.message?.match(/\[(\d{3})/)?.[1];
      if ((status == 503 || status == 429 || status == 404) && modelName !== MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) continue;
      throw err;
    }
  }
  throw new Error('All models unavailable');
}

function cleanJson(text: string): string {
  let c = text.trim().replace(/^\uFEFF/, '');
  c = c.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  if (!c.startsWith('{')) { const s = c.indexOf('{'); const e = c.lastIndexOf('}'); if (s !== -1 && e > s) c = c.substring(s, e + 1); }
  return c;
}

async function main() {
  const videoId = process.argv[2];
  if (!videoId) { console.error('Usage: npx tsx scripts/batch-single.ts <videoId>'); process.exit(1); }

  console.log(`영상 처리: ${videoId}`);

  // 제목
  const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
  const data = await res.json();
  const title = data.title || videoId;
  console.log(`제목: ${title}`);

  // 자막
  let transcript: string | null = null;
  try {
    const t = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    if (t && t.length > 0) transcript = t.map(x => x.text).join(' ');
    if (!transcript) {
      const f = await YoutubeTranscript.fetchTranscript(videoId);
      if (f && f.length > 0) transcript = f.map(x => x.text).join(' ');
    }
  } catch {}

  if (!transcript || transcript.length < 200) { console.error('자막 없음 또는 너무 짧음'); process.exit(1); }
  console.log(`자막: ${transcript.length}자`);

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // 콘텐츠 생성
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
- 핵심 키워드, 도구명, 수치는 볼드(**)로 강조해라. 문단당 1~2개 정도.
- "~다", "~된다" 같은 반말체 금지. 반드시 "~합니다", "~됩니다"체로 작성
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
  content = content.split('\n')
    .filter(line => !(line.trim().startsWith('|') && line.trim().includes('|')))
    .join('\n')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<\/?(?:div|span|p|br)[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\|/g, '');

  console.log(`콘텐츠 생성 완료: ${content.length}자`);

  // 메타데이터
  const metaPrompt = `아래 블로그 포스트의 메타데이터를 JSON으로 생성하세요.

[블로그 본문 (앞부분)]
${content.substring(0, 2000)}

[원본 영상 제목]: ${title}

[승인된 태그 목록] - 이 목록에서 2~3개 선택:
${JSON.stringify(APPROVED_TAGS)}

아래 JSON 형식으로 출력:
{
  "id": "kebab-case-영문-id",
  "title": "한글 제목 (구체적 수치 + 방법, 30자 이내)",
  "tags": ["승인된 태그만 2~3개"],
  "seo": {
    "metaTitle": "SEO 제목 (60자 이내)",
    "metaDescription": "SEO 설명 (70~160자)",
    "focusKeyword": "핵심 검색 키워드 (한국어, 1~3단어)"
  }
}`;

  const metaResult = await generateWithRetry(metaPrompt, true);
  const metadata = JSON.parse(cleanJson(metaResult.response.text()));

  const postId = metadata.id || `idea-${videoId}`;
  const tags = Array.isArray(metadata.tags)
    ? metadata.tags.filter((t: string) => APPROVED_TAGS.includes(t)).slice(0, 3)
    : ['수익화'];

  // 저장
  const { error } = await supabase.from('case_studies').insert({
    id: postId,
    title: metadata.title || title,
    korean_title: '',
    byline: 'By EarningBull',
    url: '',
    mrr: '',
    launch_date: '',
    thumbnail_image: '',
    tags,
    metrics: [],
    executive_summary: [],
    product_preview: null,
    k_market_strategy: null,
    enriched_content: null,
    published: false,
    seo: metadata.seo || {},
    content,
    category: 'idea',
    source_url: videoUrl,
  });

  if (error) { console.error('저장 실패:', error.message); process.exit(1); }
  console.log(`저장 완료: ${postId} - ${metadata.title}`);
}

main().catch(console.error);

/**
 * YouTube 영상에서 스토리형 블로그 생성
 * Usage: npx tsx scripts/generate-from-youtube.ts <videoId> [--url <homepage>]
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { YoutubeTranscript } from 'youtube-transcript';

// ── 환경변수 로드 ──
const envPath = resolve(import.meta.dirname || __dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  process.env[t.substring(0, eq)] = t.substring(eq + 1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

const APPROVED_TAGS = [
  'AI 자동화', 'AI 에이전트', 'AI 앱', 'AI 도구', '노코드', '1인 창업',
  '사이드 프로젝트', '마이크로 SaaS', 'SaaS', '구독 모델', '틈새시장',
  '프리랜서', '콘텐츠 비즈니스', '디지털 노마드', '부트스트래핑',
  '커뮤니티 비즈니스', '이커머스', '제휴 마케팅', 'SEO', '유튜브 자동화',
  '자동 수익화', '패시브 인컴', '뉴스레터', '온라인 교육',
  '프롬프트 엔지니어링', '챗봇', '웹 스크래핑', 'API 연동',
  'MVP', '린 스타트업', '고객 확보', '성장 전략',
];

function cleanJson(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  }
  return s.trim();
}

async function generateWithRetry(prompt: string, jsonMode = false, temp = 0.7): Promise<string> {
  for (const modelName of MODEL_PRIORITY) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: temp,
          ...(jsonMode && { responseMimeType: 'application/json' }),
        },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log(`  [모델: ${modelName}]`);
      return text;
    } catch (e: any) {
      console.error(`  [${modelName}] 실패:`, e.message);
    }
  }
  throw new Error('모든 모델 실패');
}

async function main() {
  const args = process.argv.slice(2);
  const videoId = args.find(a => !a.startsWith('--'));
  const urlIdx = args.indexOf('--url');
  const homepageUrl = urlIdx !== -1 && args[urlIdx + 1] ? args[urlIdx + 1] : '';

  if (!videoId) {
    console.log('Usage: npx tsx scripts/generate-from-youtube.ts <videoId> [--url <homepage>]');
    return;
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`\n영상: ${videoUrl}`);
  if (homepageUrl) console.log(`서비스 URL: ${homepageUrl}`);

  // 1. 자막 추출
  console.log('\n════ STEP 1: 자막 추출 ════');
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  const fullText = transcript.map(t => t.text).join(' ').substring(0, 4000);
  console.log(`자막: ${fullText.length}자`);

  // 2. 스토리형 블로그 생성
  console.log('\n════ STEP 2: 스토리형 블로그 생성 ════');
  const generatePrompt = `아래 유튜브 영상 자막을 바탕으로 **정보 요약형 스토리텔링** 스타일의 블로그 글을 작성하세요.

## 분량 — 최우선 규칙
- 마크다운 기호 포함 총 1,500자 이내. 이것은 절대 규칙이다.
- 1,500자를 초과하면 불합격이다. 정보를 과감히 생략하고 핵심만 남겨라.
- 소제목(###)은 최대 3개.
- 각 소제목 아래 본문은 3~5문장으로 제한.
- 마무리 불릿은 3개 이내.

## 스타일 규칙
- 1인칭 블로그 운영자 시점으로 서술. "이런 서비스를 발견했습니다", "살펴봤더니 이런 구조입니다", "한번 정리해봤습니다" 같은 큐레이터/리서처 톤.
- 체험 후기("직접 써봤는데", "제가 해보니")가 아니라, 정보를 조사하고 정리해서 전달하는 느낌.
- "~합니다", "~됩니다" 존댓말체

## 절대 금지
- 이모지 사용 금지
- 볼드(**) 사용 금지
- "혁신적인", "놀라운", "게임체인저" 등 과장 표현 금지
- 같은 서비스에 링크를 2번 이상 거는 것 금지 (첫 등장만)

## 외부 링크
${homepageUrl ? `- 이 서비스의 공식 URL: ${homepageUrl} — 본문에서 서비스명이 처음 등장할 때 [서비스명](${homepageUrl}) 형태로 마크다운 링크를 넣어라.` : '- 공식 URL 정보 없음. 확실히 아는 URL(예: amazon.com, tiktok.com)만 링크로 넣고, 모르면 텍스트만 남겨라.'}

## 유튜브 자막
${fullText}

---
위 내용을 바탕으로 정보 요약형 스토리텔링 블로그 글을 작성하세요. 마크다운 형식으로, 소제목은 ###를 사용하세요.`;

  let content = await generateWithRetry(generatePrompt);
  console.log(`생성 완료: ${content.length}자`);
  console.log('--- 생성 결과 ---');
  console.log(content);
  console.log('-----------------\n');

  // 3. 스토리형 개선
  console.log('════ STEP 3: 스토리형 개선 ════');
  const improvePrompt = `당신은 온라인 수익화 블로그 편집자입니다. 아래 스토리형 블로그 포스트의 문장을 더 매끄럽고 읽기 쉽게 다듬으세요.

[핵심 원칙]
- 원문의 구조(### 소제목, 문단 순서, 마무리 불릿)를 그대로 유지하라.
- 원문의 분량을 유지하라. 원문 대비 ±10% 이내. 절대 크게 늘리지 마라.
- 새로운 섹션이나 문단을 추가하지 마라.
- 원문의 숫자, 도구명, 플랫폼명은 절대 바꾸지 마라.

[문체 & 톤]
- 1인칭 블로그 운영자 시점을 유지하라. "이런 서비스를 발견했습니다", "살펴보니", "정리해봤습니다" 같은 큐레이터 톤.
- 체험 후기("직접 써봤는데", "제가 해보니")로 바꾸지 마라. 조사·정리·전달하는 느낌 유지.
- 반드시 "~합니다", "~됩니다", "~입니다" 존댓말체로 작성하라.
- 문장은 짧고 명료하게.
- 볼드(**) 사용 완전 금지.

[외부 링크]
${homepageUrl ? `- 이 서비스의 공식 URL: ${homepageUrl}` : '- 확실히 아는 URL만 넣고, 모르면 링크 없이 텍스트만 남겨라.'}

[절대 금지]
- 이모지/유니코드 특수문자 금지
- 마크다운 표(파이프) 금지
- AI 냄새 나는 표현 금지: 혁신, 시사점, 교훈, 주목할 만한, 눈여겨볼, 게임 체인저

[현재 콘텐츠]
${content}

위 콘텐츠를 다듬어서 개선된 마크다운 본문만 출력하라.`;

  content = await generateWithRetry(improvePrompt, false, 0);
  console.log(`개선 완료: ${content.length}자`);
  console.log('--- 개선 결과 ---');
  console.log(content);
  console.log('-----------------\n');

  // 4. 바론 검증
  console.log('════ STEP 4: 바론 검증 ════');
  const baronPrompt = `당신은 "바론"이라는 콘텐츠 검증 에이전트입니다.

아래 블로그 포스트를 검증하고 JSON으로 결과를 반환하세요.

## 이 글의 스타일 규칙 (바론은 이 규칙 위반만 잡는다)
- 볼드(**) 사용 금지. 볼드가 있으면 fail. 볼드가 없으면 정상.
- 마크다운 표(파이프) 사용 금지. 표가 있으면 fail. 표가 없으면 정상.
- 이모지 사용 금지.
- "~합니다/~됩니다" 존댓말체 유지. 반말 혼용 시 fail.
- 1인칭 블로그 운영자 시점 유지. "이런 서비스를 발견했습니다", "살펴보니" 같은 큐레이터 톤이어야 한다. 체험 후기("직접 써봤는데", "제가 해보니")가 아니다.
- 바론은 볼드, 표, 이모지 추가를 절대 권장하지 않는다. 이것들은 금지 항목이다.

## 검증 기준
1. 사실 오류가 없는가 (숫자, 이름, 서비스명)
2. AI 냄새 나는 표현이 있는가 (혁신, 시사점, 교훈, 비결, 여정, 놀라운, 획기적인, 매력적인, 눈여겨볼, 주목할 만한, 게임 체인저, 독창적인)
3. 위 금지 항목(볼드, 표, 이모지)이 사용되었는가
4. 문체가 일관된가 (존댓말체 유지, 반말 혼용 없음, 1인칭 큐레이터 톤 유지)
5. 문장이 너무 길거나 읽기 어렵지 않은가
6. 외부 링크가 최소 1개 포함되어 있는가 (본문에 언급된 실제 서비스/프로덕트의 공식 웹사이트 URL을 마크다운 링크로 넣어야 한다. 단, 공식 URL을 확실히 아는 경우만 넣고, 모르면 링크 없이 텍스트만 남겨라)

## JSON 형식
{
  "verdict": "pass" | "fail",
  "baronComment": "전체 평가 코멘트",
  "fixes": ["수정 지시1", "수정 지시2"],
  "redFlags": ["문제 표현1"],
  "bannedWords": ["금지어1"]
}

## 규칙
- verdict가 "pass"면 fixes, redFlags, bannedWords는 빈 배열.
- 작은 문제라도 있으면 "fail"로 판정.
- fixes에 "볼드를 추가하라", "표를 추가하라" 같은 지시를 절대 넣지 마라. 이것들은 금지 항목이다.

[콘텐츠]
${content}

JSON만 출력하라.`;

  const baronRaw = await generateWithRetry(baronPrompt, true, 0);
  const baronResult = JSON.parse(cleanJson(baronRaw));
  console.log('바론 판정:', baronResult.verdict);
  console.log('코멘트:', baronResult.baronComment);
  if (baronResult.fixes?.length) console.log('수정 지시:', baronResult.fixes);
  if (baronResult.redFlags?.length) console.log('Red Flags:', baronResult.redFlags);
  console.log('');

  // 5. 바론 교정
  if (baronResult.verdict === 'fail') {
    console.log('════ STEP 5: 바론 교정 ════');
    const correctionPrompt = `당신은 편집 교정자입니다. 아래 콘텐츠에서 검증 에이전트 "바론"이 지적한 부분만 정확히 수정하세요.

[핵심 원칙 — 반드시 준수]
- 바론이 지적한 부분만 고쳐라. 나머지 문장, 단락, 구조, 표현은 한 글자도 바꾸지 마라.
- 원문의 순서, 제목(##), 단락 구조를 그대로 유지하라.
- 새로운 섹션, 새로운 문단, 새로운 문장을 추가하지 마라.
- 전체를 다시 쓰는 것은 절대 금지. 부분 수정만 허용.
- 수정 후 전체 글자 수가 원문 대비 ±10% 이내여야 한다.
- 바론이 외부 링크 부재를 지적한 경우, 본문에 언급된 서비스/도구의 공식 URL을 [서비스명](URL) 형식으로 첫 등장 시 추가하라.
${homepageUrl ? `- 이 서비스의 공식 URL: ${homepageUrl}` : '- 확실히 아는 URL만 넣고, 모르면 링크 없이 텍스트만 남겨라.'}

[수정할 때 반드시 지킬 문체 규칙]
- 원문의 1인칭 블로그 운영자 톤을 그대로 유지하라. 큐레이터/리서처 느낌.
- 체험 후기("직접 써봤는데", "제가 해보니")로 바꾸지 마라.
- 반드시 "~합니다", "~됩니다", "~입니다" 존댓말체로 작성하라.
- 짧은 문장 위주. 리듬감 유지.
- AI 냄새 나는 표현 절대 금지: 여정, 혁신, 시사점, 교훈, 비결, 매력적인, 획기적인, 놀라운, 흥미로운
- 이모지 금지.
- 마크다운 표(파이프 기호) 금지.

[바론 판정]: ${baronResult.verdict}
[바론 코멘트]: ${baronResult.baronComment || '없음'}

${baronResult.fixes?.length ? `[수정 지시]\n${baronResult.fixes.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}` : ''}

${baronResult.redFlags?.length ? `[Red Flags]\n${baronResult.redFlags.map((f: string) => `- ${f}`).join('\n')}` : ''}

${baronResult.bannedWords?.length ? `[금지어]\n${baronResult.bannedWords.map((w: string) => `- "${w}"`).join('\n')}` : ''}

[원문 글자 수]: ${content.length}자
[현재 콘텐츠 — 지적된 부분만 수정하고 나머지는 원문 그대로 출력하라]
${content}

수정된 마크다운 본문만 출력하라. 설명이나 메타 코멘트 없이 본문만.`;

    content = await generateWithRetry(correctionPrompt, false, 0);
    console.log(`교정 완료: ${content.length}자`);
    console.log('--- 교정 결과 ---');
    console.log(content);
    console.log('-----------------\n');
  }

  // 6. 메타데이터 생성 + 저장
  console.log('════ STEP 6: 메타데이터 생성 + 저장 ════');
  const metaPrompt = `아래 블로그 포스트의 메타데이터를 생성하세요.

[콘텐츠]
${content}

JSON 형식:
{
  "id": "kebab-case-영문-슬러그 (3~6단어)",
  "title": "한국어 제목 (30자 이내, 숫자+핵심 포함)",
  "tags": ["태그1", "태그2", "태그3"],
  "seo": {
    "title": "SEO 제목 (50자 이내)",
    "description": "SEO 설명 (120자 이내)"
  },
  "productPreview": {
    "title": "서비스명 + 체험하기 (예: 아마존 제휴 마케팅 체험하기)",
    "steps": [
      {"label": "핵심 기능 1 (4~8자)", "desc": "한줄 설명 (30자 이내)"},
      {"label": "핵심 기능 2 (4~8자)", "desc": "한줄 설명 (30자 이내)"},
      {"label": "핵심 기능 3 (4~8자)", "desc": "한줄 설명 (30자 이내)"}
    ]
  }
}

사용 가능한 태그 목록 (이 중에서만 선택):
${APPROVED_TAGS.join(', ')}

규칙:
- tags는 2~4개
- title은 클릭을 유도하되 과장하지 않기
- productPreview.steps는 본문에 등장하는 서비스/도구의 핵심 기능 3가지를 요약`;

  const metaRaw = await generateWithRetry(metaPrompt, true);
  const meta = JSON.parse(cleanJson(metaRaw));
  console.log('메타데이터:', JSON.stringify(meta, null, 2));

  // ID 중복 체크
  const { data: existing } = await supabase
    .from('case_studies')
    .select('id')
    .eq('id', meta.id)
    .single();
  if (existing) {
    meta.id = meta.id + '-v2';
    console.log('ID 중복으로 변경:', meta.id);
  }

  // 저장
  const { error } = await supabase.from('case_studies').insert({
    id: meta.id,
    title: meta.title,
    korean_title: '',
    byline: 'By ProfitSolo',
    url: '',
    mrr: '',
    launch_date: '',
    thumbnail_image: '',
    content,
    tags: meta.tags,
    metrics: [],
    executive_summary: [],
    product_preview: meta.productPreview ? {
      title: meta.productPreview.title || '제품 체험하기',
      localImage: '',
      steps: Array.isArray(meta.productPreview.steps)
        ? meta.productPreview.steps.slice(0, 3).map((s: any) => ({ label: s.label || '', desc: s.desc || '' }))
        : [],
    } : null,
    k_market_strategy: null,
    enriched_content: null,
    seo: meta.seo || {},
    category: 'idea',
    published: false,
    source_url: videoUrl,
  });

  if (error) {
    console.error('저장 실패:', error);
    return;
  }

  console.log('\n════ 완료 ════');
  console.log(`ID: ${meta.id}`);
  console.log(`제목: ${meta.title}`);
  console.log(`분량: ${content.length}자`);
  console.log(`카테고리: idea | published: false`);
}

main().catch(console.error);

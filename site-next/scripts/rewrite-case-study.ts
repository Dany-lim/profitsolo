import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  'AI 자동화', 'AI 에이전트', 'AI 앱', 'AI 도구', '노코드', '1인 창업',
  '사이드 프로젝트', '마이크로 SaaS', 'SaaS', '구독 모델', '틈새시장',
  '프리랜서', '콘텐츠 비즈니스', '디지털 노마드', '부트스트래핑',
  '커뮤니티 비즈니스', '이커머스', '제휴 마케팅', 'SEO', '유튜브 자동화',
  '자동 수익화', '패시브 인컴', '뉴스레터', '온라인 교육',
  '프롬프트 엔지니어링', '챗봇', '웹 스크래핑', 'API 연동',
  'MVP', '린 스타트업', '고객 확보', '성장 전략',
];

const TARGET_ID = 'steven-crada-puff-count';

function cleanJson(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  }
  return s.trim();
}

async function generateWithRetry(prompt: string, jsonMode = false): Promise<string> {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        ...(jsonMode && { generationConfig: { responseMimeType: 'application/json' } }),
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e: any) {
      console.error(`[${modelName}] 실패:`, e.message);
    }
  }
  throw new Error('모든 모델 실패');
}

async function main() {
  // 1. 원본 케이스 스터디 가져오기
  const { data: original } = await supabase
    .from('case_studies')
    .select('*')
    .eq('id', TARGET_ID)
    .single();

  if (!original) {
    console.error('케이스 스터디를 찾을 수 없습니다:', TARGET_ID);
    return;
  }

  console.log('원본 제목:', original.title);
  console.log('원본 분량:', original.content?.length, '자');
  console.log('---');

  // 2. 정보 요약형 스토리텔링으로 리라이팅
  const contentPrompt = `아래 케이스 스터디를 **정보 요약형 스토리텔링** 스타일로 다시 작성하세요.

## 분량 — 최우선 규칙
- 마크다운 기호 포함 총 1,500자 이내. 이것은 절대 규칙이다.
- 1,500자를 초과하면 불합격이다. 정보를 과감히 생략하고 핵심만 남겨라.
- 소제목(###)은 최대 3개.
- 각 소제목 아래 본문은 3~5문장으로 제한.
- 마무리 불릿은 3개 이내.

## 스타일 규칙
- 3인칭 서술 (1인칭 "제가", "직접 해보니" 금지)
- 뉴스-블로그 중간 톤, 담백하게
- "~합니다", "~됩니다" 존댓말체

## 절대 금지
- 이모지 사용 금지
- 볼드(**) 사용 금지
- "혁신적인", "놀라운", "게임체인저" 등 과장 표현 금지
- "AI가 대신 해준다" 식의 과도한 AI 만능론 금지
- 같은 서비스에 링크를 2번 이상 거는 것 금지 (첫 등장만)

## 원본 케이스 스터디
제목: ${original.title}

${original.content}

---
위 내용을 바탕으로 정보 요약형 스토리텔링 블로그 글을 작성하세요. 마크다운 형식으로, 소제목은 ###를 사용하세요.`;

  console.log('블로그 콘텐츠 생성 중...');
  const newContent = await generateWithRetry(contentPrompt);
  console.log('생성 완료. 분량:', newContent.length, '자');
  console.log('---');
  console.log(newContent);
  console.log('---');

  // 3. 메타데이터 생성
  const metaPrompt = `다음 블로그 글의 메타데이터를 JSON으로 생성하세요.

블로그 내용:
${newContent}

JSON 형식:
{
  "id": "kebab-case-영문-슬러그 (3~6단어)",
  "title": "한국어 제목 (30자 이내, 숫자+핵심 포함)",
  "tags": ["태그1", "태그2", "태그3"],
  "seo": {
    "title": "SEO 제목 (50자 이내)",
    "description": "SEO 설명 (120자 이내)"
  }
}

사용 가능한 태그 목록 (이 중에서만 선택):
${APPROVED_TAGS.join(', ')}

규칙:
- id는 기존 "${TARGET_ID}"과 다르게 생성
- tags는 2~4개
- title은 클릭을 유도하되 과장하지 않기`;

  console.log('메타데이터 생성 중...');
  const metaRaw = await generateWithRetry(metaPrompt, true);
  const meta = JSON.parse(cleanJson(metaRaw));
  console.log('메타데이터:', JSON.stringify(meta, null, 2));

  // 4. ID 중복 체크
  const { data: existing } = await supabase
    .from('case_studies')
    .select('id')
    .eq('id', meta.id)
    .single();

  if (existing) {
    meta.id = meta.id + '-v2';
    console.log('ID 중복으로 변경:', meta.id);
  }

  // 5. Supabase에 저장
  const insertData: Record<string, any> = {
    id: meta.id,
    title: meta.title,
    korean_title: '',
    byline: 'By ProfitSolo',
    url: '',
    mrr: '',
    launch_date: '',
    thumbnail_image: '',
    content: newContent,
    tags: meta.tags,
    metrics: [],
    executive_summary: [],
    product_preview: null,
    k_market_strategy: null,
    enriched_content: null,
    seo: meta.seo || {},
    category: 'idea',
    published: false,
  };
  if (original.source_url) insertData.source_url = original.source_url;

  const { error } = await supabase.from('case_studies').insert(insertData);

  if (error) {
    console.error('저장 실패:', error);
    return;
  }

  console.log('---');
  console.log('저장 완료!');
  console.log('ID:', meta.id);
  console.log('제목:', meta.title);
  console.log('카테고리: idea');
  console.log('published: false');
}

main();

/**
 * 스토리형 블로그 전체 파이프라인 테스트
 *
 * 1. 케이스 스터디 → 스토리형 생성
 * 2. 스토리형 개선 프롬프트 적용
 * 3. 바론 검증
 * 4. 바론 교정 (지적사항 있을 시)
 * 5. Supabase 저장
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── 환경변수 로드 ──
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

const TARGET_ID = 'amazon-affiliate-no-website-ai-video';

function cleanJson(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  }
  return s.trim();
}

async function generateWithRetry(prompt: string, jsonMode = false, temperature = 0.7): Promise<string> {
  for (const modelName of MODEL_PRIORITY) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature,
          ...(jsonMode && { responseMimeType: 'application/json' }),
        },
      });
      const result = await model.generateContent(prompt);
      console.log(`  [모델: ${modelName}]`);
      return result.response.text();
    } catch (e: any) {
      console.error(`  [${modelName}] 실패:`, e.message);
    }
  }
  throw new Error('모든 모델 실패');
}

async function main() {
  // CLI 인자 파싱
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf('--url');
  const homepageUrl = urlIdx !== -1 && args[urlIdx + 1] ? args[urlIdx + 1] : '';

  if (homepageUrl) {
    console.log(`서비스 URL: ${homepageUrl}`);
  }

  // ════════════════════════════════════════
  // STEP 1: 원본 케이스 스터디 가져오기
  // ════════════════════════════════════════
  console.log('\n════ STEP 1: 원본 케이스 스터디 로드 ════');
  const { data: original } = await supabase
    .from('case_studies')
    .select('*')
    .eq('id', TARGET_ID)
    .single();

  if (!original) {
    console.error('케이스 스터디를 찾을 수 없습니다:', TARGET_ID);
    return;
  }
  console.log(`제목: ${original.title}`);
  console.log(`분량: ${original.content?.length}자\n`);

  // ════════════════════════════════════════
  // STEP 2: 스토리형 블로그 생성 (--with-blog 프롬프트)
  // ════════════════════════════════════════
  console.log('════ STEP 2: 스토리형 블로그 생성 ════');
  const generatePrompt = `아래 케이스 스터디를 **정보 요약형 스토리텔링** 스타일로 다시 작성하세요.

## 분량 — 최우선 규칙
- 마크다운 기호 포함 총 1,500자 이내. 이것은 절대 규칙이다.
- 1,500자를 초과하면 불합격이다. 정보를 과감히 생략하고 핵심만 남겨라.
- 소제목(###)은 최대 3개.
- 각 소제목 아래 본문은 3~5문장으로 제한.
- 마무리 불릿은 3개 이내.

## 가독성 규칙 — 문단과 줄간격
- 소제목(###) 위에는 반드시 빈 줄 2개를 넣어라.
- 하나의 문단은 2~3문장으로 구성하라. 4문장 이상 줄바꿈 없이 이어지면 안 된다.
- 문단과 문단 사이에 빈 줄 1개를 넣어라.
- 마무리 불릿(-) 블록 위에도 빈 줄 1개를 넣어라.
- 문장을 빽빽하게 몰아쓰지 마라. 여백이 가독성이다.

## 스타일 규칙
- 1인칭 블로그 운영자 시점. 정보를 조사하고 정리해서 전달하는 큐레이터 톤.
- 생동감 있는 서술: 운영자의 솔직한 반응을 자연스럽게 섞어라. 예) "이 숫자를 보고 좀 놀랐습니다", "솔직히 반신반의했는데 데이터를 보니 납득이 됩니다", "이건 꽤 괜찮은 구조입니다"
- 독자에게 말 거는 문장을 1~2번 넣어라. 예) "혹시 이런 생각 해보신 적 있나요?", "여기서 포인트는 이겁니다", "결론부터 말하면, 됩니다"
- 체험 후기("직접 써봤는데", "제가 해보니")가 아니라, 조사·발견·정리의 느낌.
- "~합니다", "~됩니다" 존댓말체. 단, 짧은 구어체 문장("됩니다", "있습니다" 대신 "있더라고요", "되더라고요")을 섞어도 좋다.

## 절대 금지
- 이모지 사용 금지
- 볼드(**) 사용 금지
- "혁신적인", "놀라운", "게임체인저" 등 과장 표현 금지
- "AI가 대신 해준다" 식의 과도한 AI 만능론 금지
- 같은 서비스에 링크를 2번 이상 거는 것 금지 (첫 등장만)

## 외부 링크
${homepageUrl ? `- 이 서비스의 공식 URL: ${homepageUrl} — 본문에서 서비스명이 처음 등장할 때 [서비스명](${homepageUrl}) 형태로 마크다운 링크를 넣어라.` : '- 공식 URL 정보 없음. 확실히 아는 URL(예: upwork.com, linkedin.com)만 링크로 넣고, 모르면 텍스트만 남겨라.'}

## 원본 케이스 스터디
제목: ${original.title}

${original.content}

---
위 내용을 바탕으로 정보 요약형 스토리텔링 블로그 글을 작성하세요. 마크다운 형식으로, 소제목은 ###를 사용하세요.`;

  let content = await generateWithRetry(generatePrompt);
  console.log(`생성 완료: ${content.length}자`);
  console.log('--- 생성 결과 ---');
  console.log(content);
  console.log('-----------------\n');

  // ════════════════════════════════════════
  // STEP 3: 스토리형 개선 프롬프트 적용
  // ════════════════════════════════════════
  console.log('════ STEP 3: 스토리형 개선 ════');
  const improvePrompt = `당신은 온라인 수익화 블로그 편집자입니다. 아래 스토리형 블로그 포스트의 문장을 더 매끄럽고 읽기 쉽게 다듬으세요.

[핵심 원칙]
- 원문의 구조(### 소제목, 문단 순서, 마무리 불릿)를 그대로 유지하라.
- 원문의 분량을 유지하라. 원문 대비 ±10% 이내. 절대 크게 늘리지 마라.
- 새로운 섹션이나 문단을 추가하지 마라.
- 원문의 숫자, 도구명, 플랫폼명은 절대 바꾸지 마라.

[가독성 — 문단과 줄간격]
- 소제목(###) 위에 빈 줄 2개가 없으면 추가하라.
- 4문장 이상 줄바꿈 없이 이어진 문단이 있으면 2~3문장 단위로 빈 줄을 넣어 쪼개라.
- 문단과 문단 사이에 빈 줄 1개가 있어야 한다.
- 마무리 불릿(-) 블록 위에 빈 줄 1개가 있어야 한다.

[문체 & 톤]
- 1인칭 블로그 운영자 시점을 유지하라. 큐레이터 톤.
- 운영자의 솔직한 반응("이건 좀 놀랍더라고요", "꽤 괜찮은 구조입니다")과 독자에게 말 거는 문장("여기서 포인트는 이겁니다")이 있으면 살려라. 없으면 자연스럽게 1~2개 추가해도 된다.
- 체험 후기("직접 써봤는데", "제가 해보니")로 바꾸지 마라.
- 존댓말체 기본. "~더라고요", "~거든요" 같은 구어체 어미도 허용. "~이다", "~한다" 반말은 금지.
- 문장은 짧고 명료하게. 군더더기 없이.
- 볼드(**) 사용 완전 금지. 강조 없이 평문으로만 작성해라.

[외부 링크]
- 본문에서 언급하는 도구/플랫폼 중 핵심적인 것 1~2개만 마크다운 링크로 넣어라.
- 실제 존재하는 URL만 사용. 모르면 링크 넣지 마라.

[절대 금지]
- 이모지/유니코드 특수문자 금지
- 마크다운 표(파이프) 금지
- AI 냄새 나는 표현 금지: 혁신, 시사점, 교훈, 주목할 만한, 눈여겨볼, 게임 체인저, 놀라운 잠재력
- HTML 태그 금지

[제목]: ${original.title}
[현재 콘텐츠]
${content}

위 콘텐츠를 다듬어서 개선된 마크다운 본문만 출력하라.`;

  content = await generateWithRetry(improvePrompt);
  console.log(`개선 완료: ${content.length}자`);
  console.log('--- 개선 결과 ---');
  console.log(content);
  console.log('-----------------\n');

  // ════════════════════════════════════════
  // STEP 4: 바론 검증
  // ════════════════════════════════════════
  console.log('════ STEP 4: 바론 검증 ════');
  const baronPrompt = `당신은 "바론"이라는 콘텐츠 검증 에이전트입니다.

아래 블로그 포스트를 검증하고 JSON으로 결과를 반환하세요.

## 이 글의 스타일 규칙 (바론은 이 규칙 위반만 잡는다)
- 볼드(**) 사용 금지. 볼드가 있으면 fail. 볼드가 없으면 정상.
- 마크다운 표(파이프) 사용 금지. 표가 있으면 fail. 표가 없으면 정상.
- 이모지 사용 금지.
- 존댓말체 유지. "~합니다/~됩니다" 기본, "~더라고요/~거든요" 같은 구어체 어미도 허용. 반말("~이다", "~한다") 혼용 시 fail.
- 1인칭 블로그 운영자 시점 유지. 큐레이터 톤 + 솔직한 반응("이건 좀 놀랍더라고요")과 독자에게 말 거는 문장("여기서 포인트는 이겁니다")이 자연스러우면 정상. 체험 후기("직접 써봤는데", "제가 해보니")는 금지.
- 바론은 볼드, 표, 이모지 추가를 절대 권장하지 않는다. 이것들은 금지 항목이다.

## 검증 기준
1. 사실 오류가 없는가 (숫자, 이름, 서비스명)
2. AI 냄새 나는 표현이 있는가 (혁신, 시사점, 교훈, 비결, 여정, 놀라운, 획기적인, 매력적인, 눈여겨볼, 주목할 만한, 게임 체인저, 독창적인)
3. 위 금지 항목(볼드, 표, 이모지)이 사용되었는가
4. 문체가 일관된가 (존댓말체 유지, 반말 혼용 없음, 1인칭 큐레이터 톤 유지)
5. 문장이 너무 길거나 읽기 어렵지 않은가
6. 외부 링크가 최소 1개 포함되어 있는가 (본문에 언급된 실제 서비스/프로덕트의 공식 웹사이트 URL을 마크다운 링크로 넣어야 한다. 단, 공식 URL을 확실히 아는 경우만 넣고, 모르면 링크 없이 텍스트만 남겨라)
7. 문단 구조가 적절한가: 4문장 이상 줄바꿈 없이 이어진 문단이 있으면 fail. 소제목(###) 위에 빈 줄이 충분한가. 문단 사이에 빈 줄이 있는가.

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
  if (baronResult.bannedWords?.length) console.log('금지어:', baronResult.bannedWords);
  console.log('');

  // ════════════════════════════════════════
  // STEP 5: 바론 교정 (fail일 때만)
  // ════════════════════════════════════════
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
- 원문의 1인칭 블로그 운영자 톤을 그대로 유지하라. 큐레이터 느낌 + 솔직한 반응 + 독자 참여 문장.
- 체험 후기("직접 써봤는데", "제가 해보니")로 바꾸지 마라.
- 존댓말체 기본. "~더라고요", "~거든요" 같은 구어체 어미도 허용.
- 짧은 문장 위주. 리듬감 유지.
- AI 냄새 나는 표현 절대 금지: 여정, 혁신, 시사점, 교훈, 비결, 매력적인, 획기적인, 놀라운, 흥미로운
- 이모지 금지.
- 마크다운 표(파이프 기호) 금지.

[가독성 교정 규칙]
- 바론이 문단 구조를 지적한 경우: 4문장 이상 이어진 문단을 2~3문장 단위로 빈 줄을 넣어 쪼개라.
- 소제목(###) 위에 빈 줄 2개가 없으면 추가하라.
- 문단과 문단 사이에 빈 줄 1개가 없으면 추가하라.

[바론 판정]: ${baronResult.verdict}
[바론 코멘트]: ${baronResult.baronComment || '없음'}

${baronResult.fixes?.length ? `[수정 지시]
${baronResult.fixes.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}` : ''}

${baronResult.redFlags?.length ? `[Red Flags]
${baronResult.redFlags.map((f: string) => `- ${f}`).join('\n')}` : ''}

${baronResult.bannedWords?.length ? `[금지어]
${baronResult.bannedWords.map((w: string) => `- "${w}"`).join('\n')}` : ''}

[원문 글자 수]: ${content.length}자
[현재 콘텐츠 — 지적된 부분만 수정하고 나머지는 원문 그대로 출력하라]
${content}

수정된 마크다운 본문만 출력하라. 설명이나 메타 코멘트 없이 본문만.`;

    content = await generateWithRetry(correctionPrompt, false, 0);
    console.log(`교정 완료: ${content.length}자`);
    console.log('--- 교정 결과 ---');
    console.log(content);
    console.log('-----------------\n');
  } else {
    console.log('바론 통과 — 교정 스킵\n');
  }

  // ════════════════════════════════════════
  // STEP 6: 메타데이터 생성 + Supabase 저장
  // ════════════════════════════════════════
  console.log('════ STEP 6: 메타데이터 생성 + 저장 ════');
  const metaPrompt = `다음 블로그 글의 메타데이터를 JSON으로 생성하세요.

블로그 내용:
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
    "title": "서비스명 + 체험하기 (예: Lancer AI 체험하기)",
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
- id는 기존 "${TARGET_ID}"과 다르게 생성
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
    meta.id = meta.id + '-story';
    console.log('ID 중복으로 변경:', meta.id);
  }

  // Supabase 저장
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
    source_url: original.source_url || null,
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

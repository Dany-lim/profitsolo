import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';


const APPROVED_TAGS = [
  "AI", "Automation", "B2B SaaS", "Community", "Discord", "Fintech",
  "Marketing", "SEO", "SaaS", "Service", "Upwork",
  "마케팅", "블로그", "서비스", "소프트웨어", "숙박",
  "제휴 마케팅", "콘텐츠", "콘텐츠 크리에이터"
];

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^\uFEFF/, '');
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  if (!cleaned.startsWith('{')) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }
  }
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const { rawContent, enrichedContent, sourceUrl, companyUrl } = await request.json();

    if (!rawContent || rawContent.trim().length < 100) {
      return NextResponse.json(
        { error: 'Raw content가 너무 짧습니다. 최소 100자 이상 필요합니다.' },
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

    async function generateWithRetry(
      prompt: string,
      options?: { jsonMode?: boolean }
    ) {
      for (const modelName of MODEL_PRIORITY) {
        try {
          const config = options?.jsonMode
            ? { model: modelName, generationConfig: { responseMimeType: 'application/json' as const } }
            : { model: modelName };
          const m = genAI.getGenerativeModel(config);
          const result = await m.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });
          console.log(`[generate-case-study] Used model: ${modelName}`);
          return result;
        } catch (err: any) {
          const status = err?.status || err?.message?.match(/\[(\d{3})/)?.[1];
          if ((status == 503 || status == 429 || status == 404) && modelName !== MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) {
            console.warn(`[generate-case-study] ${modelName} unavailable (${status}), trying next model...`);
            continue;
          }
          throw err;
        }
      }
      throw new Error('All models unavailable');
    }

    const companyUrlNote = companyUrl ? `\n[회사 공식 웹사이트]: ${companyUrl}\n- 본문에서 이 회사/서비스의 웹사이트를 언급할 때 반드시 이 URL을 사용하라.` : '';

    const enrichSection = enrichedContent ? `
[추가 조사 자료 - 반드시 참고하여 본문에 녹여내세요]
아래는 원본 콘텐츠를 기반으로 추가 수집한 정보입니다.
이 자료에 포함된 정보(창업자 배경, 회사 정보, 주요 성과, 비즈니스 모델, 사용 도구, 성공 요인, 수익 구조, 트래픽 소스 등)를 본문에 자연스럽게 녹여내라.
특히 구체적인 수치(수익, 직원 수, 트래픽 등)와 창업 과정의 디테일을 적극 활용하라.
원본 콘텐츠에 없는 정보라도 이 추가 자료에 있으면 반드시 활용하라.
${companyUrlNote}

${enrichedContent}` : companyUrlNote;

    // === Step 1: Generate content (plain markdown) ===
    const contentPrompt = `당신은 논픽션 스토리텔러입니다. 실제 창업 이야기를 영화처럼 몰입감 있게 풀어내는 작가입니다.
아래 원본 인터뷰/기사를 바탕으로 창업 스토리를 작성하세요.

[문체 & 톤]
- 소설처럼 써라. 장면 묘사로 시작하라. "2016년 4월, 브라티슬라바의 어느 아파트." 이런 식으로.
- 짧은 문장 위주. 한 문장이 40자를 넘지 않도록. 리듬감 있게.
- 숫자는 그대로 살려라. "월 $500K", "직원 87명", "첫 수익 13센트" — 숫자가 스토리의 힘이다.
- 창업자의 실제 발언이나 인사이트는 인용문(> )으로 강조하라.
- 독자에게 설교하지 마라. 사실과 장면만 보여주면 독자가 알아서 느낀다.
- "~습니다"체 금지. "~다", "~였다", "~했다"의 문어체 또는 "~거야", "~했어"의 구어체를 섞어 써라.

[구조]
1. **오프닝 (장면으로 시작)**
   - 숫자 하나로 독자를 낚아라. "월 7억. 카지노 사이트로." 이런 식.
   - 또는 특정 순간/장면으로 시작. 시간, 장소, 상황.
   - 3줄 안에 "이 사람이 뭘 만들었는지" 이해시켜라.

2. **창업자의 여정 (본문)**
   - 시간순으로 풀되, 지루한 부분은 과감히 건너뛰어라.
   - 핵심 전환점만 깊게 파라: 첫 아이디어, 가장 힘든 순간, 터닝포인트, 첫 수익.
   - 구체적 숫자와 에피소드를 최대한 활용하라.
   - 중간중간 짧은 문장으로 긴장감을 만들어라. "그런데 문제가 있었다." "돈이 떨어지고 있었다."

3. **성장과 전략**
   - 어떻게 성장했는지 구체적으로. 막연한 "노력" 말고 실제 전략과 수치.
   - 사용한 도구, 채널, 의사결정의 이유를 밀도 있게.

4. **마무리 (주인장의 시선)**
   - "스타트업 레이더 주인장"이 술자리에서 친구에게 이 이야기를 해주는 톤으로.
   - 번호 리스트 금지. 볼드 키워드 정리 금지. 그냥 자연스러운 문단으로.
   - "이 케이스의 핵심은 결국 ~다" 식의 한줄 정리가 아니라, "나라면 여기서 뭘 훔칠까?"라는 관점으로 써라.
   - 예시 톤: "솔직히 이 사람 대단한 건 기술이 아니라 속도였다. 검색해서 없으면 바로 만든다. 이게 전부다."

[분량]
- 5,000~8,000자.

[절대 금지]
- 마크다운 표 금지. 파이프 기호 금지.
- 이모지 금지.
- 사이트 명칭은 반드시 "스타트업 레이더"만 사용.
- "가상 회고록", "재구성" 같은 메타 설명 금지. 그냥 이야기를 들려줘라.
- "~의 여정을 시작했습니다", "혁신을 만들어가는" 같은 AI 냄새 나는 표현 금지.
- "~를 보여준다", "~를 시사한다", "~에서 배울 수 있다" 같은 분석 보고서 톤 금지.
- "첫째/둘째/셋째", "1. 2. 3." 번호 매기기 정리 금지 (주인장 시선 섹션).
- "핵심 인사이트", "중요한 시사점", "의미 있는 교훈" 같은 메타 표현 금지.
- "~의 성공 비결은", "~의 핵심 전략은" 같은 요약 패턴 금지.
- 볼드(**) 완전 금지. 소제목은 ##, ###만 사용. 본문에서 **단어** 강조 절대 사용하지 마라.
- JSON, 코드 블록 금지. 순수 마크다운 본문만 출력.

[원본 콘텐츠]
${rawContent}
${enrichSection}

위 원본을 바탕으로, 읽는 사람이 중간에 멈출 수 없는 창업 스토리를 써라. 본문만 출력.`;

    const contentResult = await generateWithRetry(contentPrompt);

    let generatedContent = contentResult.response.text().trim();
    // Remove any pipe characters and markdown tables
    const contentLines = generatedContent.split('\n');
    const filteredLines = contentLines.filter((line: string) => {
      const trimmed = line.trim();
      if (trimmed.includes('|') && trimmed.startsWith('|')) return false;
      if (/^[\s\-:|]+$/.test(trimmed) && trimmed.includes('-') && trimmed.includes('|')) return false;
      return true;
    });
    generatedContent = filteredLines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\|/g, '');

    // === Step 2: Generate metadata (JSON only, no long strings) ===
    const enrichedRef = enrichedContent
      ? `\n[추가 조사 자료 — 반드시 참고하여 정확한 수치와 정보를 추출하세요]\n${enrichedContent.substring(0, 2000)}`
      : '';

    const metaPrompt = `아래 케이스 스터디 본문과 추가 조사 자료를 모두 읽고 메타데이터를 JSON으로 생성하세요.

[중요 원칙]
- 본문과 추가 조사 자료에 나온 실제 수치(매출, 직원 수, 트래픽 등)를 정확히 반영하라.
- 추측하지 마라. 자료에 없는 수치는 넣지 마라.
- MRR은 반드시 한화(만원/억원)로 표기. 달러 금액이면 환율 1,300원을 적용하여 변환.
- metrics의 value에도 한화를 사용하라.

[회사 홈페이지 URL 원칙 — 최우선]
- companyUrl 필드에는 반드시 해당 회사/서비스의 실제 공식 홈페이지 URL을 넣어라.
- 추가 조사 자료에 회사 웹사이트 URL이 있으면 그것을 그대로 사용하라.
- 절대로 기사 출처 URL(starterstory.com, indiehackers.com 등)을 회사 URL로 넣지 마라.
- 추가 조사 자료에서 찾을 수 없으면 본문에서 언급된 서비스명으로 "서비스명.com" 형태를 추론하라.
- 그래도 모르겠으면 빈 문자열("")로 남겨라. 잘못된 URL을 넣는 것보다 비워두는 게 낫다.

[제목 작성 원칙]
- 제목은 클릭하고 싶게 만들어라. 구체적 숫자 + 의외성 조합이 핵심.
- 좋은 예: "13센트에서 시작해 월 6억, 슬로바키아 개발자의 카지노 제국", "육아 불안을 지운 AI 앱, 월 4억의 비밀"
- 나쁜 예: "성공적인 스타트업 이야기", "AI로 비즈니스 혁신하기" (너무 뻔하고 추상적)
- 공식: [구체적 숫자/상황] + [반전/의외성] + [핵심 키워드]
- 부제목(koreanTitle)은 창업자의 상황이나 감정을 담아라. 예: "퇴사 후 6개월의 기록", "빈털터리 개발자의 반격"

[본문]
${generatedContent.substring(0, 3000)}
${enrichedRef}

[원본 소스 URL]: ${sourceUrl || '없음'}
[회사 공식 웹사이트]: ${companyUrl || '없음'}

[승인된 태그 목록] - 이 목록에서만 2~3개 선택:
${JSON.stringify(APPROVED_TAGS)}

아래 JSON 형식으로 출력하세요:
{
  "id": "kebab-case-영문-id (예: casino-guru-story)",
  "title": "한글 제목 (숫자+반전+키워드 조합, 클릭하고 싶은 제목, 30자 이내)",
  "koreanTitle": "한글 부제목 (창업자 상황/감정, 20자 이내)",
  "byline": "By 창업자이름 (본문/자료에서 실제 이름 확인)",
  "companyUrl": "회사 공식 홈페이지 URL (예: https://www.example.com). 추가 조사 자료에서 반드시 확인. 기사 URL 절대 금지.",
  "mrr": "월 XXX만원 형식 (반드시 한화)",
  "launchDate": "YYYY년 형식",
  "tags": ["승인된 태그만 2~3개"],
  "metrics": [
    {"label": "월 매출", "value": "월 X억원 또는 월 X만원 (한화)", "insight": "한줄 설명 (15자 이내)"},
    {"label": "핵심 지표명", "value": "실제 수치", "insight": "한줄 설명"},
    {"label": "핵심 지표명", "value": "실제 수치", "insight": "한줄 설명"}
  ],
  "executiveSummary": [
    "이 비즈니스가 무엇인지 한 문장 (50자 이내)",
    "어떻게 성장했는지 한 문장 (50자 이내)",
    "핵심 성공 요인 한 문장 (50자 이내)"
  ],
  "productPreview": {
    "title": "제품/서비스명 + 체험하기 (예: Polsia 제품 체험하기)",
    "steps": [
      {"label": "핵심 기능 1 (4~8자)", "desc": "한줄 설명 (30자 이내)"},
      {"label": "핵심 기능 2 (4~8자)", "desc": "한줄 설명 (30자 이내)"},
      {"label": "핵심 기능 3 (4~8자)", "desc": "한줄 설명 (30자 이내)"}
    ]
  },
  "kMarketStrategy": {
    "why": "이 비즈니스 모델이 한국에서 왜 통하는지 (한국 시장의 특수성, 수요, 문화적 맥락을 구체적으로. 150~300자)",
    "willItWork": "실제로 한국에서 실행 가능한지 현실적 분석 (필요한 현지화, 마케팅 채널, 가격 전략, 규제 고려사항 등 구체적 액션 아이템. 200~350자)"
  },
  "seo": {
    "metaTitle": "구글 검색에 최적화된 제목 (60자 이내, 핵심 키워드 포함, 클릭 유도)",
    "metaDescription": "검색 결과에 표시될 설명 (70~160자, 핵심 키워드 포함, 구체적 수치 활용, 클릭 유도)",
    "focusKeyword": "이 포스트의 핵심 검색 키워드 (한국어, 1~3단어)"
  }
}`;

    const metaResult = await generateWithRetry(metaPrompt, { jsonMode: true });

    const metaText = cleanJsonResponse(metaResult.response.text());

    let metadata;
    try {
      metadata = JSON.parse(metaText);
    } catch {
      return NextResponse.json(
        { error: '메타데이터 JSON 파싱 실패', preview: metaText.substring(0, 300) },
        { status: 500 }
      );
    }

    // === Step 3: Combine and validate ===
    const caseStudy = {
      id: metadata.id || 'untitled-case',
      title: metadata.title || '제목 없음',
      koreanTitle: metadata.koreanTitle || '',
      byline: metadata.byline || 'By Unknown',
      url: (() => {
        // 우선순위: 1) AI가 추출한 companyUrl 2) 사용자 입력 companyUrl 3) 빈 문자열 (sourceUrl은 기사 URL이므로 사용 안 함)
        const raw = metadata.companyUrl || companyUrl || '';
        if (!raw) return '';
        return raw.startsWith('http') ? raw : `https://${raw}`;
      })(),
      mrr: metadata.mrr || '',
      launchDate: metadata.launchDate || '',
      thumbnailImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800',
      tags: Array.isArray(metadata.tags)
        ? metadata.tags.filter((tag: string) => APPROVED_TAGS.includes(tag)).slice(0, 3)
        : ['콘텐츠'],
      metrics: Array.isArray(metadata.metrics)
        ? metadata.metrics.slice(0, 3).map((m: any) => ({
            label: m.label || '',
            value: m.value || '',
            insight: m.insight || '',
          }))
        : [],
      executiveSummary: Array.isArray(metadata.executiveSummary)
        ? metadata.executiveSummary.slice(0, 3)
        : [],
      productPreview: metadata.productPreview ? {
        title: metadata.productPreview.title || '제품 체험하기',
        localImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800',
        steps: Array.isArray(metadata.productPreview.steps)
          ? metadata.productPreview.steps.slice(0, 3).map((s: any) => ({
              label: s.label || '',
              desc: s.desc || '',
            }))
          : [],
      } : undefined,
      kMarketStrategy: metadata.kMarketStrategy ? {
        why: metadata.kMarketStrategy.why || '',
        willItWork: metadata.kMarketStrategy.willItWork || '',
      } : null,
      enrichedContent: enrichedContent?.trim() || undefined,
      published: false,
      seo: metadata.seo ? {
        metaTitle: metadata.seo.metaTitle || undefined,
        metaDescription: metadata.seo.metaDescription || undefined,
        focusKeyword: metadata.seo.focusKeyword || undefined,
      } : undefined,
      content: generatedContent,
    };

    if (caseStudy.tags.length === 0) {
      caseStudy.tags = ['콘텐츠'];
    }

    // Save to database
    // Ensure unique ID
    const { data: existing } = await supabase
      .from('case_studies')
      .select('id')
      .ilike('id', `${caseStudy.id}%`);

    let finalId = caseStudy.id;
    if (existing && existing.length > 0) {
      finalId = `${caseStudy.id}-${existing.length + 1}`;
    }
    caseStudy.id = finalId;

    const supabaseData = {
      id: caseStudy.id,
      title: caseStudy.title,
      korean_title: caseStudy.koreanTitle,
      byline: caseStudy.byline,
      url: caseStudy.url,
      mrr: caseStudy.mrr,
      launch_date: caseStudy.launchDate,
      thumbnail_image: caseStudy.thumbnailImage,
      tags: caseStudy.tags,
      metrics: caseStudy.metrics,
      executive_summary: caseStudy.executiveSummary,
      product_preview: caseStudy.productPreview,
      k_market_strategy: caseStudy.kMarketStrategy,
      enriched_content: caseStudy.enrichedContent,
      published: false,
      seo: caseStudy.seo,
      content: caseStudy.content,
    };

    const { error: dbError } = await supabase
      .from('case_studies')
      .insert(supabaseData);

    if (dbError) throw dbError;


    return NextResponse.json({
      success: true,
      caseStudy,
      stats: {
        contentLength: caseStudy.content.length,
        tags: caseStudy.tags,
        id: caseStudy.id,
      }
    });
  } catch (error) {
    console.error('[generate-case-study] Error:', error);
    return NextResponse.json(
      { error: '케이스 스터디 생성 실패', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

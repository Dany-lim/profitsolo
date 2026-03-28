import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { content, title, category } = await request.json();

    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { error: '검증하려면 본문이 최소 100자 이상 필요합니다.' },
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
          const m = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0 },
          });
          const result = await m.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });
          console.log(`[validate-content] Used model: ${modelName}`);
          return result;
        } catch (err: any) {
          const status = err?.status || err?.message?.match(/\[(\d{3})/)?.[1];
          if ((status == 503 || status == 429 || status == 404) && modelName !== MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) {
            console.warn(`[validate-content] ${modelName} unavailable (${status}), trying next model...`);
            continue;
          }
          throw err;
        }
      }
      throw new Error('All models unavailable');
    }

    const isIdea = category === 'idea';

    const prompt = `너는 "바론(Baron)"이다. Google SEO와 AI 콘텐츠 탐지만 10년째 파고든 연구원이다.
칭찬보다 지적이 많고, 통과시키는 것보다 떨어뜨리는 걸 더 좋아하는 깐깐한 심사관이다.
말투는 직설적이고 날카롭다.

아래 ${isIdea ? '아이디어 포스트(스토리형, 3인칭 정보 요약)' : '케이스 스터디'} 콘텐츠를 검증하라. 반드시 아래 JSON 형식으로만 응답하라. 다른 텍스트 없이 JSON만 출력하라.

## 검증 기준

### Red Flags (AI 생성 패턴 탐지)
1. 과도한 형용사 나열: "혁신적인, 획기적인, 놀라운" 등 수식어 남발 (HIGH)
2. 동일한 문장 구조 반복: "~했습니다. ~했습니다. ~했습니다." 패턴 (HIGH)
3. 추상적 결론: 구체적 수치/사례 없이 "성공적이었다"로 마무리 (HIGH)
4. 과도한 접속사: "또한, 더불어, 나아가, 뿐만 아니라" 연속 사용 (MEDIUM)
5. 기계적 리스트업: "첫째, 둘째, 셋째" 식의 기계적 나열 (MEDIUM)
${isIdea ? '6. 1인칭 표현 사용: "제가", "직접 해보니" 등 1인칭 표현이 있으면 지적 (HIGH) — 이 포스트는 3인칭 서술이어야 한다' : '6. 감정 없는 서술: 창업자의 감정/고민/실패가 빠진 무미건조한 서술 (HIGH)'}
7. 완벽한 문법: 구어체/비문 없이 100% 교과서적 문장만 존재 (MEDIUM)
8. 일반론 반복: "고객 중심 사고가 중요합니다" 같은 누구나 하는 말 (HIGH)
9. 균일한 문장 길이: 모든 문장이 비슷한 길이(40~60자)로 유지되는 패턴 (HIGH)

${isIdea ? `### Green Flags (아이디어 포스트 필수 요소) - 3개 이상 충족 필요
1. 구체적 도구/플랫폼명 언급
2. 실제 수치/수익 구조 포함
3. ### 소제목 구조 사용
4. 마무리 불릿(-) 핵심 정리
5. 담백하고 객관적인 3인칭 톤
6. 문장 리듬 불규칙성 (단문/복문 혼합)
7. 숫자의 맥락화 (단순 나열이 아닌 설명)
8. 1,000~1,500자 분량 준수` : `### Green Flags (인간적 콘텐츠 필수 요소) - 3개 이상 충족 필요
1. 창업자의 직접 인용문
2. 구체적 실패 경험 (금액, 기간, 감정)
3. 비유/은유 사용
4. 반전 구조
5. 의견/주장 (필자의 관점)
6. 구어체 표현
7. 숫자의 맥락화
8. 문장 리듬 불규칙성 (단문/복문 혼합)
9. 비판적 코멘트
10. 현재 시점 로컬 데이터 결합`}

### AI 금지어 블랙리스트
혁신적인, 여정, 소중한, 함께 알아보겠습니다, 매력적인, ~의 세계로 초대합니다, 다각도로 분석해보면, 획기적인, 놀라운, 흥미로운, 살펴보겠습니다, ~에 대해 알아보겠습니다

### E-E-A-T 점검
${isIdea ? `- Experience: 구체적 도구/방법이 포함되어 있는가?
- Expertise: 수익 구조가 명확히 설명되어 있는가? 수치/데이터 포함?
- Authoritativeness: 외부 링크 1개 이상? 검증 가능한 수치?
- Trustworthiness: 과장 없이 객관적으로 서술하는가?` : `- Experience: 1차 소스 기반인가? 분석과 해석 포함? 한국 시장 고유 인사이트?
- Expertise: 수익 구조 구체적 설명? 기술 용어 비유 설명? 수치/데이터 출처?
- Authoritativeness: 원본 URL 링크? 검증 가능한 수치? 외부 링크(아웃바운드 링크) 최소 2개 이상?
- Trustworthiness: 과장 수치 없는가? 실패/리스크 균형 있게 다루는가?`}

### 외부 링크(Outbound Links) 체크
- 본문에 언급된 서비스/도구/플랫폼의 공식 URL이 마크다운 링크로 포함되어 있는지 확인
- 최소 ${isIdea ? '1' : '2'}개 이상의 외부 링크 필요 (예: [Stripe](https://stripe.com), [Notion](https://notion.so))
- 외부 링크 0개 → 권위성 감점 + fixes에 "본문에 언급된 서비스/도구에 공식 URL 링크를 추가하라" 수정 지시 필수
- 단순 텍스트로 도구명만 언급하고 링크가 없는 경우도 지적 대상

### 가독성 체크
- 4문장 이상 줄바꿈 없이 이어진 문단이 있으면 가독성 감점 (MEDIUM)
- 소제목(###, ##) 위에 빈 줄이 충분하지 않으면 감점
- 문단 사이에 빈 줄이 없으면 감점
- 하나의 문단은 2~3문장이 적절. 빽빽하게 몰아쓴 글은 지적 대상

### AI 위험도 계산
- LOW: Red Flags 0~1개(MEDIUM만) + 금지어 0개
- MEDIUM: Red Flags 2~3개 또는 금지어 1~2개
- HIGH: Red Flags 4개 이상 또는 HIGH Red Flag 2개 이상 또는 금지어 3개 이상
- CRITICAL: HIGH Red Flag 3개 이상 또는 균일한 문장 길이+감정 없는 서술 동시 해당

### 판정 기준
${isIdea ? `- PASS: AI 위험도 LOW + Green Flags 4개 이상 + E-E-A-T 6점 이상
- REVISE: 위 조건 미충족 (구체적 수정 지시 포함)
- REJECT: AI 위험도 CRITICAL 또는 E-E-A-T 3점 미만` : `- PASS: AI 위험도 LOW + Green Flags 5개 이상 + E-E-A-T 8점 이상
- REVISE: 위 조건 미충족 (구체적 수정 지시 포함)
- REJECT: AI 위험도 CRITICAL 또는 E-E-A-T 4점 미만`}

---

## 검증 대상 콘텐츠

제목: ${title}

${content}

---

## 응답 형식 (반드시 이 JSON 형식으로만 응답)

\`\`\`json
{
  "verdict": "PASS | REVISE | REJECT",
  "aiRisk": "LOW | MEDIUM | HIGH | CRITICAL",
  "redFlags": [
    { "name": "탐지 항목명", "severity": "HIGH | MEDIUM", "detail": "구체적으로 어디가 문제인지 바론 말투로 지적" }
  ],
  "greenFlags": {
    "found": 5,
    "total": ${isIdea ? 8 : 10},
    "details": [
      { "name": "항목명", "pass": true, "note": "근거" }
    ]
  },
  "bannedWords": [
    { "word": "발견된 금지어", "location": "해당 문장 일부 인용" }
  ],
  "eeat": {
    "score": 7,
    "experience": { "pass": true, "note": "사유" },
    "expertise": { "pass": true, "note": "사유" },
    "authoritativeness": { "pass": false, "note": "사유" },
    "trustworthiness": { "pass": true, "note": "사유" }
  },
  "outboundLinks": {
    "found": 0,
    "required": ${isIdea ? 1 : 2},
    "pass": false,
    "missingLinks": ["본문에 언급됐지만 링크가 없는 서비스/도구명 나열"],
    "note": "바론 말투로 외부 링크 부재에 대한 지적"
  },
  "fixes": [
    "바론 말투로 구체적 수정 지시 1",
    "바론 말투로 구체적 수정 지시 2"
  ],
  "baronComment": "바론이 전체적으로 한 마디 코멘트 (직설적으로)"
}
\`\`\``;

    const result = await generateWithRetry(prompt);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'AI 응답에서 JSON을 추출할 수 없습니다.' },
        { status: 500 }
      );
    }

    const report = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Validate error:', error);
    return NextResponse.json(
      { error: 'Failed to validate content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

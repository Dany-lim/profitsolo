import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { content, title, context } = await request.json();

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
          console.log(`[improve-content] Used model: ${modelName}`);
          return result;
        } catch (err: any) {
          const status = err?.status || err?.message?.match(/\[(\d{3})/)?.[1];
          if ((status == 503 || status == 429 || status == 404) && modelName !== MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) {
            console.warn(`[improve-content] ${modelName} unavailable (${status}), trying next model...`);
            continue;
          }
          throw err;
        }
      }
      throw new Error('All models unavailable');
    }

    const prompt = `당신은 논픽션 스토리텔러입니다. 아래 콘텐츠를 영화처럼 몰입감 있는 창업 스토리로 개선하세요.

[문체 & 톤]
- 소설처럼 써라. 장면 묘사로 시작하라. "2016년 4월, 브라티슬라바의 어느 아파트." 이런 식으로.
- 짧은 문장 위주. 한 문장이 40자를 넘지 않도록. 리듬감 있게.
- 숫자는 그대로 살려라. "월 $500K", "직원 87명", "첫 수익 13센트" — 숫자가 스토리의 힘이다.
- 창업자의 실제 발언이나 인사이트는 인용문(> )으로 강조하라.
- 독자에게 설교하지 마라. 사실과 장면만 보여주면 독자가 알아서 느낀다.
- "~습니다"체 금지. "~다", "~였다", "~했다"의 문어체 또는 "~거야", "~했어"의 구어체를 섞어 써라.

[구조]
1. **오프닝 (장면으로 시작)** — 숫자 하나로 독자를 낚거나, 특정 순간/장면으로 시작. 3줄 안에 "이 사람이 뭘 만들었는지" 이해시켜라.
2. **창업자의 여정 (본문)** — 시간순으로 풀되, 지루한 부분은 과감히 건너뛰어라. 핵심 전환점만 깊게.
3. **성장과 전략** — 어떻게 성장했는지 구체적으로. 실제 전략과 수치.
4. **마무리 (주인장의 시선)** — "스타트업 레이더 주인장" 시점으로 핵심 인사이트 2~3가지.
5. **한국 시장 적용 전략** — 반드시 "## 한국 시장 적용 전략" 섹션 포함. 구체적 시나리오, 한국 특수성 고려.

[분량] 5,000~8,000자.

[절대 금지]
- 마크다운 표 금지. 파이프 기호 금지.
- 이모지 금지.
- 사이트 명칭은 반드시 "스타트업 레이더"만 사용.
- "가상 회고록", "재구성" 같은 메타 설명 금지. 그냥 이야기를 들려줘라.
- "~의 여정을 시작했습니다", "혁신을 만들어가는" 같은 AI 냄새 나는 표현 금지.

[제목]: ${title}
${context ? `[추가 정보]: ${context}` : ''}

[현재 콘텐츠]
${content}

위 콘텐츠의 정보를 모두 유지하면서, 위 문체 원칙에 따라 개선하라. 개선된 마크다운 본문만 출력.`;

    const result = await generateWithRetry(prompt);
    let improvedContent = result.response.text();

    // 표(table) 제거: 파이프 기호가 포함된 라인을 모두 제거
    const lines = improvedContent.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed.includes('|')) return false;
      if (/^[\s\-:]+$/.test(trimmed) && trimmed.includes('-')) return false;
      return true;
    });

    improvedContent = filteredLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\|/g, '');

    // 본문 시작 부분에 제목이 중복으로 나오는 경우 제거
    const titleVariations = [
      `# ${title}`,
      `## ${title}`,
      `### ${title}`,
      title,
    ];

    for (const titleVar of titleVariations) {
      if (improvedContent.trimStart().startsWith(titleVar)) {
        improvedContent = improvedContent.trimStart().substring(titleVar.length).trimStart();
        break;
      }
    }

    return NextResponse.json({
      success: true,
      improvedContent
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to improve content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

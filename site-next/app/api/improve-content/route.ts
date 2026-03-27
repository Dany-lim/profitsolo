import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { content, title, context, customInstruction, baronFeedback } = await request.json();

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
- 소설처럼 써라. 원문에 장소와 시기가 있으면 장면 묘사로 시작하라. 없으면 억지로 지어내지 마라.
- 짧은 문장 위주. 한 문장이 40자를 넘지 않도록. 리듬감 있게.
- 원문의 숫자(매출, 직원 수, 수익 등)는 절대 바꾸지 말고 그대로 살려라.
- 창업자의 실제 발언이나 인사이트는 인용문(> )으로 강조하라.
- 독자에게 설교하지 마라. 사실과 장면만 보여주면 독자가 알아서 느낀다.
- "~습니다"체 금지. "~다", "~였다", "~했다"의 문어체 또는 "~거야", "~했어"의 구어체를 섞어 써라.

[구조]
1. **오프닝** — 원문에서 가장 임팩트 있는 숫자나 순간으로 시작. 3줄 안에 이 사람이 뭘 만들었는지 이해시켜라.
2. **창업자의 여정** — 시간순으로 풀되, 지루한 부분은 과감히 건너뛰어라. 핵심 전환점만 깊게.
3. **성장과 전략** — 어떻게 성장했는지 구체적으로. 실제 전략과 수치.
4. **마무리 (주인장의 시선)** — 스타트업 레이더 주인장 관점으로 이 케이스에서 뭘 가져갈 수 있는지 써라.
5. **한국 시장 적용 전략** — 반드시 ## 한국 시장 적용 전략 섹션 포함. 구체적 시나리오, 한국 특수성 고려.

[분량] 5,000~8,000자.

[외부 링크 삽입 규칙]
- 본문에 언급되는 서비스, 도구, 플랫폼이 있으면 반드시 첫 등장 시 [텍스트](URL) 마크다운 링크로 삽입하라.
- URL이 본문에 텍스트로 노출되면 안 된다. 반드시 마크다운 링크 형식만 사용.
- 최소 2개 이상의 외부 링크를 포함하라.
- 같은 서비스가 여러 번 등장하면 첫 번째만 링크 걸고 이후는 텍스트만.
- URL을 모르는 서비스는 링크 없이 텍스트로만 표기하라. 절대 가짜 URL을 만들지 마라.

[절대 금지]
- 마크다운 표 금지. 파이프 기호 금지.
- 이모지 금지.
- 사이트 명칭은 반드시 "스타트업 레이더"만 사용.
- 메타 설명 금지. 그냥 이야기를 들려줘라.
- AI 냄새 나는 정형화된 표현 금지 (여정, 혁신, 시사점, 교훈, 비결 등).
- 같은 서비스/도구에 링크를 두 번 이상 거는 것 금지.

[제목]: ${title}
${context ? `[추가 정보]: ${context}` : ''}
${baronFeedback ? `
[바론(SEO/AI 검증 에이전트) 피드백 — 반드시 반영할 것]
바론 판정: ${baronFeedback.verdict}
바론 코멘트: ${baronFeedback.baronComment || '없음'}

${baronFeedback.fixes?.length ? `[구체적 수정 지시]
${baronFeedback.fixes.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}` : ''}

${baronFeedback.redFlags?.length ? `[적발된 Red Flags — 해결 필수]
${baronFeedback.redFlags.map((f: string) => `- ${f}`).join('\n')}` : ''}

${baronFeedback.bannedWords?.length ? `[금지어 발견 — 반드시 대체하거나 제거]
${baronFeedback.bannedWords.map((w: string) => `- "${w}"`).join('\n')}` : ''}
` : ''}
${customInstruction ? `[편집자 추가 지시 — 반드시 반영할 것]
${customInstruction}
` : ''}[현재 콘텐츠]
${content}

위 콘텐츠의 정보를 모두 유지하면서, 위 문체 원칙에 따라 개선하라.${customInstruction ? ` 특히 편집자의 추가 지시를 최우선으로 반영하라.` : ''}${baronFeedback ? `

[중요: 수정 원칙]
1. 바론이 지적한 모든 항목(Red Flags, 금지어, 수정 지시)을 빠짐없이 확실하게 고쳐라. 살짝 바꾸는 게 아니라 바론이 다시 검증해도 통과할 수준으로 근본적으로 수정하라.
2. 바론이 문제 삼지 않은 문장, 단락, 구조는 절대 건드리지 마라. 원문 그대로 유지.
3. 금지어는 반드시 삭제하거나 자연스러운 다른 표현으로 대체하라.
4. Red Flag가 "감정 없는 서술"이면 해당 단락에 창업자의 감정/고민/실패를 추가하라.
5. Red Flag가 "추상적 결론"이면 구체적 수치와 사례로 보강하라.
6. Red Flag가 "동일한 문장 구조 반복"이면 문장 길이와 구조를 다양하게 바꿔라.
7. fixes에 있는 수정 지시는 하나도 빠뜨리지 말고 모두 반영하라.` : ''} 개선된 마크다운 본문만 출력.`;

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

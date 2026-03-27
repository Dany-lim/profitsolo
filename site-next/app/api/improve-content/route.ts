import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { content, title, context, customInstruction, baronFeedback, sourceUrl, homepageUrl } = await request.json();

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
            generationConfig: { temperature: baronFeedback ? 0 : 0.7 },
          });
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

    let prompt: string;

    if (baronFeedback) {
      // 바론 피드백 기반 수정 — 지적사항만 고치고 나머지는 보존
      prompt = `당신은 편집 교정자입니다. 아래 콘텐츠에서 검증 에이전트 "바론"이 지적한 부분만 정확히 수정하세요.

[핵심 원칙 — 반드시 준수]
- 바론이 지적한 부분만 고쳐라. 나머지 문장, 단락, 구조, 표현은 한 글자도 바꾸지 마라.
- 원문의 순서, 제목(##), 단락 구조를 그대로 유지하라.
- 새로운 섹션, 새로운 문단, 새로운 문장을 추가하지 마라.
- 전체를 다시 쓰는 것은 절대 금지. 부분 수정만 허용.
- 수정 후 전체 글자 수가 원문 대비 ±10% 이내여야 한다. 절대 크게 늘리지 마라.
- 외부 링크([텍스트](URL))는 추가하지 마라. 링크는 이 단계의 역할이 아니다.

[수정할 때 반드시 지킬 문체 규칙]
- 원문의 톤과 문체를 그대로 유지하라. 수정하는 부분도 주변 문장과 자연스럽게 어울려야 한다.
- "~습니다"체 금지. "~다", "~였다", "~했다"의 문어체 또는 "~거야", "~했어"의 구어체를 유지하라.
- 짧은 문장 위주. 리듬감 유지.
- 원문의 숫자(매출, 직원 수, 수익 등)는 절대 바꾸지 마라.
- AI 냄새 나는 표현 절대 금지: 여정, 혁신, 시사점, 교훈, 비결, 매력적인, 획기적인, 놀라운, 흥미로운, 살펴보겠습니다
- 이모지 금지.
- 마크다운 표(파이프 기호) 금지.

[바론 판정]: ${baronFeedback.verdict}
[바론 코멘트]: ${baronFeedback.baronComment || '없음'}

${(() => {
        const linkFilter = (s: string) => !/링크|link|URL|url|아웃바운드|outbound/i.test(s);
        const filteredFixes = baronFeedback.fixes?.filter(linkFilter) || [];
        return filteredFixes.length ? `[수정 지시 — 모두 반영할 것]\n${filteredFixes.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}` : '';
      })()}

${(() => {
        const linkFilter = (s: string) => !/링크|link|URL|url|아웃바운드|outbound/i.test(s);
        const filteredFlags = baronFeedback.redFlags?.filter(linkFilter) || [];
        return filteredFlags.length ? `[Red Flags — 해당 부분만 수정]\n${filteredFlags.map((f: string) => `- ${f}`).join('\n')}` : '';
      })()}

${baronFeedback.bannedWords?.length ? `[금지어 — 삭제하거나 자연스러운 표현으로 대체]
${baronFeedback.bannedWords.map((w: string) => `- "${w}"`).join('\n')}` : ''}

[수정 방법]
- "감정 없는 서술" 지적 → 해당 단락에서 1~2문장만 수정하여 감정을 추가. 새 문장을 넣지 마라.
- "추상적 결론" 지적 → 해당 문장만 구체적 수치/사례로 교체
- "동일한 문장 구조 반복" 지적 → 해당 구간의 문장 길이와 구조만 다양하게 변경
- "과도한 형용사" 지적 → 해당 형용사만 삭제하거나 구체적 표현으로 대체
- 금지어 → 해당 단어만 삭제하거나 자연스러운 다른 표현으로 대체
- 외부 링크 관련 지적은 무시하라. 링크 추가는 이 단계에서 하지 않는다.

${customInstruction ? `[편집자 추가 지시]
${customInstruction}` : ''}

[원문 글자 수]: ${content.length}자
[현재 콘텐츠 — 지적된 부분만 수정하고 나머지는 원문 그대로 출력하라]
${content}

수정된 마크다운 본문만 출력하라. 설명이나 메타 코멘트 없이 본문만.`;

    } else {
      // 일반 개선 — 전체 리라이팅
      prompt = `당신은 논픽션 스토리텔러입니다. 아래 콘텐츠를 영화처럼 몰입감 있는 창업 스토리로 개선하세요.

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

[외부 링크 삽입 규칙 — 필수]
- 아래 [참조 URL]에 제공된 URL은 반드시 본문 첫 등장 시 [서비스명](URL) 형태로 삽입하라. 이것은 필수다.
- 그 외에 본문에 언급되는 유명 서비스/도구(Stripe, Notion, Shopify, WordPress, Google 등)도 공식 URL을 알면 링크를 걸어라.
- 최소 2개 이상의 외부 링크를 반드시 포함하라. 링크가 0개인 결과물은 불합격이다.
- 같은 서비스가 여러 번 등장하면 첫 번째만 링크 걸고 이후는 텍스트만.
- URL을 확실히 모르는 서비스만 링크 없이 텍스트로 표기. 가짜 URL 금지.
- 예시: [Stripe](https://stripe.com), [Notion](https://notion.so)

[절대 금지]
- 마크다운 표 금지. 파이프 기호 금지.
- 이모지 금지.
- 사이트 명칭은 반드시 "스타트업 레이더"만 사용.
- 메타 설명 금지. 그냥 이야기를 들려줘라.
- AI 냄새 나는 정형화된 표현 금지 (여정, 혁신, 시사점, 교훈, 비결 등).
- 같은 서비스/도구에 링크를 두 번 이상 거는 것 금지.

[제목]: ${title}
${context ? `[추가 정보]: ${context}` : ''}
${homepageUrl || sourceUrl ? `[참조 URL — 본문에 반드시 마크다운 링크로 삽입할 것]
${homepageUrl ? `- 서비스 공식: ${homepageUrl}` : ''}
${sourceUrl ? `- 출처 기사: ${sourceUrl}` : ''}` : ''}
${customInstruction ? `[편집자 추가 지시 — 반드시 반영할 것]
${customInstruction}
` : ''}[현재 콘텐츠]
${content}

위 콘텐츠의 정보를 모두 유지하면서, 위 문체 원칙에 따라 개선하라.${customInstruction ? ` 특히 편집자의 추가 지시를 최우선으로 반영하라.` : ''} 개선된 마크다운 본문만 출력.`;
    }

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

    // 바론 교정 모드에서 원본 대비 20% 이상 길어지면 로그 경고
    if (baronFeedback) {
      const ratio = improvedContent.length / content.length;
      console.log(`[improve-content] Length: ${content.length} → ${improvedContent.length} (${Math.round(ratio * 100)}%)`);
      if (ratio > 1.2) {
        console.warn(`[improve-content] WARNING: Baron correction expanded content by ${Math.round((ratio - 1) * 100)}%`);
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

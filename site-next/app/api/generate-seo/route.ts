import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    const { title, content, tags, mrr, byline } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: '제목과 본문이 필요합니다.' },
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

    let result;
    for (const modelName of MODEL_PRIORITY) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' as const },
        });
        result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `아래 케이스 스터디의 Google SEO 메타데이터를 생성하세요.

[포스트 정보]
- 제목: ${title}
- 태그: ${tags || '없음'}
- MRR: ${mrr || '없음'}
- 작성자: ${byline || '없음'}
- 본문 (앞부분): ${content.substring(0, 2000)}

[작성 원칙]
1. metaTitle: 구글 검색에서 클릭하고 싶은 제목. 60자 이내. 핵심 키워드를 앞쪽에 배치. 숫자와 구체적 결과 포함.
2. metaDescription: 검색 결과 설명. 70~160자. 핵심 키워드 포함. 구체적 수치 활용. "~알아보세요", "~확인하세요" 같은 CTA 포함.
3. focusKeyword: 이 포스트를 검색할 때 사용할 핵심 한국어 키워드. 1~3단어.

JSON으로 출력:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "focusKeyword": "..."
}` }] }],
        });
        console.log(`[generate-seo] Used model: ${modelName}`);
        break;
      } catch (err: any) {
        const status = err?.status || err?.message?.match(/\[(\d{3})/)?.[1];
        if ((status == 503 || status == 429 || status == 404) && modelName !== MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) {
          console.warn(`[generate-seo] ${modelName} unavailable (${status}), trying next...`);
          continue;
        }
        throw err;
      }
    }

    if (!result) {
      throw new Error('All models unavailable');
    }

    const text = cleanJsonResponse(result.response.text());
    const seo = JSON.parse(text);

    return NextResponse.json({
      success: true,
      seo: {
        metaTitle: seo.metaTitle || '',
        metaDescription: seo.metaDescription || '',
        focusKeyword: seo.focusKeyword || '',
      },
    });
  } catch (error) {
    console.error('[generate-seo] Error:', error);
    return NextResponse.json(
      { error: 'SEO 생성 실패', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

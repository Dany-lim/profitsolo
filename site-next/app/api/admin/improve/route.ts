import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

// Gemini API 클라이언트 초기화 (싱글톤)
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
    }

    genAI = new GoogleGenerativeAI(apiKey);
  }

  return genAI;
}

const STABLE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
] as const;

// 재시도 로직을 포함한 Gemini 호출
async function callGeminiWithRetry(
  model: GenerativeModel,
  prompt: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Gemini가 빈 응답을 반환했습니다.');
      }

      return text;

    } catch (error: any) {
      lastError = error;

      if (error.message?.includes('404') || error.message?.includes('not found')) {
        throw new Error(`Gemini 모델에 접근할 수 없습니다: ${error.message}`);
      }

      if (error.message?.includes('429') || error.message?.includes('quota')) {
        const waitTime = attempt * 2000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // 네트워크 에러면 잠시 대기
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw new Error(`Gemini API 호출 ${maxRetries}회 모두 실패: ${lastError?.message}`);
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // 1. 요청 파싱
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'id 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 2. 데이터베이스 읽기 (Supabase)
    const { data: study, error: fetchError } = await supabase
      .from('case_studies')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !study) {
      return NextResponse.json(
        { error: `케이스 스터디를 찾을 수 없습니다: ${id}` },
        { status: 404 }
      );
    }

    // 3. Gemini API 클라이언트 초기화
    let client: GoogleGenerativeAI;
    try {
      client = getGeminiClient();
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // 4. 프롬프트 생성
    const prompt = `
당신은 '스타트업 레이더(Startup Radar)'의 **주인장**입니다.
당신의 임무는 제공된 사례 연구 데이터를 바탕으로, 독보적인 매력과 통찰력을 가진 **'1인칭 가상 회고록'**을 집필하는 것입니다.

[필수 집필 가이드라인]
1. **서두 (주인장의 마중물)**:
   - 스타트업 레이더 주인장으로서 독자에게 반갑게 인사하며 시작하세요.
   - "이 리포트는 실제 데이터를 바탕으로 제가 재구성한 '가상 회고록'입니다"라는 취지를 밝히세요.

2. **본문 (창업자의 1인칭 고백)**:
   - 본문 맨 처음에 **"이 서비스/프로덕트가 무엇인가?"**를 독자가 3초 안에 이해할 수 있도록 쉽고 명확하게 설명하세요. (예: "간단히 말해, ○○는 □□를 위한 △△ 서비스입니다.")
   - 이후 창업자 '${study.byline}'의 시점으로 빙의하여 **"나(I)"**를 주어로 삼아 이야기를 풀어나가세요.
   - **5,000~8,000자** 범위로 핵심만 밀도 높게 작성하세요. 불필요한 반복이나 장황한 묘사는 생략합니다.
   - 창업 당시의 두려움, 첫 수익의 전율, 위기의 순간 등을 간결하면서도 생생하게 묘사하세요.

3. **마무리 (주인장의 통찰 & 한국 시장 전략)**:
   - 다시 주인장의 시점으로 돌아와 이 사례의 핵심 성공 법칙을 요약하세요.
   - **[한국 시장 적용 전략]** 섹션을 반드시 포함하세요.
   - 네이버 블로그/카페, 크몽, 브랜드 검색 등 한국 특유의 플랫폼과 환경을 활용한 실전 팁을 제안하세요.

4. **절대 금기 사항**:
   - 마크다운 표(|---|)를 절대 사용하지 마세요. 모든 정보는 상세한 리스트나 서술형 단락으로 작성하세요.
   - 사이트 명칭은 반드시 '스타트업 레이더'만 사용하세요.

[사례 데이터]
제목: ${study.title}
데이터: ${JSON.stringify(study, null, 2)}

지금 바로 주인장의 영혼을 담아 집필을 시작하세요.
`;

    // 모델 선택 + AI 콘텐츠 생성 (fallback 지원)
    let newContent = '';
    let selectedModelName = '';
    let lastError: Error | null = null;

    for (const modelName of STABLE_MODELS) {
      try {
        const model = client.getGenerativeModel({ model: modelName });
        newContent = await callGeminiWithRetry(model, prompt, 2);
        selectedModelName = modelName;
        console.log(`[admin/improve] Used model: ${modelName}`);
        break;

      } catch (error: any) {
        lastError = error;
        console.warn(`[admin/improve] ${modelName} failed: ${error.message}`);

        if (error.message?.includes('404') || error.message?.includes('not found') ||
            error.message?.includes('503') || error.message?.includes('429')) {
          continue;
        }

        throw error;
      }
    }

    // 모든 모델 실패
    if (!newContent || !selectedModelName) {
      return NextResponse.json(
        {
          error: '모든 Gemini 모델이 실패했습니다.',
          details: lastError?.message,
          triedModels: STABLE_MODELS
        },
        { status: 500 }
      );
    }

    // Supabase 업데이트
    const { error: updateError } = await supabase
      .from('case_studies')
      .update({
        content: newContent,
        last_improved: new Date().toISOString(),
        improved_by: 'Startup Radar AI',
        model_used: selectedModelName
      })
      .eq('id', id);

    if (updateError) throw updateError;

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: '주인장 에디션으로 개선 완료',
      stats: {
        contentLength: newContent.length,
        modelUsed: selectedModelName,
        duration: `${(duration / 1000).toFixed(2)}초`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    return NextResponse.json({
      error: error.message || '알 수 없는 오류가 발생했습니다.',
      details: {
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        duration: `${(duration / 1000).toFixed(2)}초`
      }
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      status: 'healthy',
      geminiApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}


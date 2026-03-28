import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchChannelVideos, getTranscript } from '@/lib/youtube';

export const maxDuration = 60;

/**
 * 아이디어 포스트 자동 생성 Cron
 * - 아이디어 채널의 새 영상 → 자막 추출 → 아이디어 포스트 생성 → 바론 검증 → 게시
 * - 1회 실행에 1개 영상만 처리 (타임아웃 방지)
 */

const IDEA_CHANNELS = [
  { id: 'UCBuxtfDuvZIlk0nwWSbr3Kw', name: 'Rockstar Academy' },
  { id: 'UCwyOrGxXb8dJnjqmTCuA2_g', name: 'Earn With Mike' },
  { id: 'UC7yXBqf0tOZOSrVQRHTGQBg', name: 'Adam Erhart' },
  { id: 'UCzOAAJUiSO2uyu1xyxw__2Q', name: 'Nick Loper' },
  { id: 'UCEIySKPDQjeQD6NVHzN6oqA', name: 'Eddie Eizner' },
  { id: 'UCxiI1Gr_bfs_N0fWoDw2yAg', name: 'Molly Keyser' },
  { id: 'UCX_QAfWDjx45p3H2srYAEqg', name: 'Wealth Wisdom' },
  { id: 'UCVBNyvcHbffDw61L4sikLtQ', name: 'Steven Cravotta' },
];

const APPROVED_TAGS = [
  'AI', 'Automation', 'B2B SaaS', 'Community', 'Discord', 'Fintech',
  'Marketing', 'SEO', 'SaaS', 'Service', 'Upwork',
  '마케팅', '블로그', '서비스', '소프트웨어', '숙박',
  '제휴 마케팅', '콘텐츠', '콘텐츠 크리에이터',
  '이커머스', '드롭쉬핑', '디지털 제품', '사이드허슬',
  'YouTube', 'TikTok', 'Pinterest', 'Etsy', 'Gumroad',
  'Print on Demand', '수익화', '자동화',
];

const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = getBaseUrl();
  const results: string[] = [];

  try {
    results.push(`채널 ${IDEA_CHANNELS.length}개 확인`);

    // 1. 각 채널에서 새 영상 찾기
    let targetVideo: { videoId: string; title: string; channelName: string; channelId: string } | null = null;

    for (const channel of IDEA_CHANNELS) {
      const videos = await fetchChannelVideos(channel.id);
      if (videos.length === 0) continue;

      for (const video of videos.slice(0, 5)) {
        const isProcessed = await checkIfProcessed(video.videoId);
        if (!isProcessed) {
          targetVideo = {
            videoId: video.videoId,
            title: video.title,
            channelName: video.channelName || channel.name,
            channelId: channel.id,
          };
          break;
        }
      }
      if (targetVideo) break;
    }

    if (!targetVideo) {
      results.push('새 영상 없음');
      return NextResponse.json({ success: true, results, processed: 0 });
    }

    results.push(`새 영상 발견: ${targetVideo.title} (${targetVideo.videoId})`);

    // 2. 처리 시작 기록
    await markProcessing(targetVideo.videoId, targetVideo.channelId, targetVideo.title);

    // 3. 자막 추출
    const transcript = await getTranscript(targetVideo.videoId);
    if (!transcript || transcript.length < 200) {
      await markFailed(targetVideo.videoId, '자막 없음 또는 너무 짧음');
      results.push('자막 추출 실패 - 스킵');
      return NextResponse.json({ success: true, results, processed: 0 });
    }
    results.push(`자막 추출 완료: ${transcript.length}자`);

    // 4. Gemini로 아이디어 포스트 생성
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const videoUrl = `https://www.youtube.com/watch?v=${targetVideo.videoId}`;

    // 4a. 콘텐츠 생성
    const contentPrompt = `[언어 규칙] 반드시 한국어로만 응답하라. 설명, 인사말, 메타 코멘트 없이 마크다운 본문만 출력하라.

당신은 온라인 비즈니스와 수익화 트렌드를 정리하는 정보 큐레이터입니다. 아래 YouTube 영상 자막을 바탕으로, 핵심 정보를 깔끔하게 요약 정리하는 스토리텔링형 블로그 포스트를 작성하세요.

[영상 제목]: ${targetVideo.title}
[영상 URL]: ${videoUrl}

[문체 & 톤]
- 3인칭 서술. 1인칭("제가", "직접 해보니") 표현 금지.
- 뉴스-블로그 중간 톤. 담백하고 객관적으로 서술하되 딱딱하지 않게.
- "~합니다", "~됩니다", "~입니다" 존댓말체 기반.
- 구체적인 숫자, 도구명, 플랫폼명, 수익 구조를 명확히 전달해라.
- 문장은 짧고 명료하게. 군더더기 없이.

[구조]
1. 도입 (2~3줄): 이 비즈니스 모델이나 전략이 왜 주목받고 있는지 간결하게 시작
2. 본문: 핵심 전략/방법을 소제목으로 나눠 정리
   - 각 파트마다 ### 소제목 (최대 4개)
   - 구체적인 도구, 사이트, 방법 포함
   - 실제 수치/예시가 있으면 반드시 포함
3. 마무리: 불릿 포인트(-)로 핵심 3~4개를 간결하게 정리

[외부 링크]
- 본문에서 언급하는 도구/플랫폼 중 핵심적인 것 1~2개만 마크다운 링크로 넣어라.
- 형식: [도구명](https://실제URL)
- 실제 존재하는 URL만 사용. 모르면 링크 넣지 마라.

[가독성 규칙 — 문단과 줄간격 (매우 중요)]
- 소제목(###) 위에는 반드시 빈 줄 2개를 넣어라.
- 하나의 문단은 2~3문장으로 구성하라. 4문장 이상 줄바꿈 없이 이어지면 안 된다.
- 문단과 문단 사이에 빈 줄 1개를 넣어라.
- 마무리 불릿(-) 블록 위에도 빈 줄 1개를 넣어라.
- 문장을 빽빽하게 몰아쓰지 마라. 여백이 가독성이다.

[분량 - 반드시 지켜라]
- 절대 1,500자를 넘기지 마라. 목표는 1,000~1,500자.
- 소제목(###)은 최대 4개까지만.
- 각 소제목 아래 문단은 2~3문장이면 충분하다.

[절대 금지]
- 이모지/유니코드 특수문자 완전 금지. 단 하나도 쓰지 마라.
- 마크다운 표(파이프) 금지
- 소제목은 ##, ###만 사용
- 볼드(**) 사용 완전 금지. 강조 없이 평문으로만 작성해라.
- "~이다", "~것이다", "~점이다", "~된다", "~한다" 같은 문어체/반말 어미 금지. 반드시 "~합니다", "~됩니다", "~입니다"체로 작성.
- AI가 쓴 티 나는 표현 완전 금지: "혁신", "시사점", "교훈", "주목할 만한", "눈여겨볼", "강력한 도구", "게임 체인저", "놀라운 잠재력", "핵심 포인트", "다양한 방법", "결론적으로", "요약하자면", "마무리하며"
- "지금 바로 시작해보세요!" 같은 뻔한 CTA 금지
- JSON, 코드 블록 금지. 순수 마크다운 본문만 출력
- 글머리 번호(1. 2. 3.)를 남발하지 마라. 문단으로 풀어써라.
- HTML 태그 금지 (br, div, span 등). 줄간격은 빈 줄(엔터 두 번)로만 조절해라.

[자막 내용]
${transcript.substring(0, 4000)}

위 내용을 바탕으로 정보 요약형 블로그 포스트를 작성해라. 본문만 출력.`;

    const contentResult = await generateWithRetry(genAI, contentPrompt);
    let content = contentResult.response.text().trim();

    // 테이블/파이프/HTML태그 제거
    content = content
      .split('\n')
      .filter((line: string) => !(line.trim().startsWith('|') && line.trim().includes('|')))
      .join('\n')
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<\/?(?:div|span|p|br)[^>]*>/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\|/g, '');

    results.push(`콘텐츠 생성 완료: ${content.length}자`);

    // 4b. 메타데이터 생성
    const metaPrompt = `아래 블로그 포스트의 메타데이터를 JSON으로 생성하세요.

[블로그 본문 (앞부분)]
${content.substring(0, 2000)}

[원본 영상 제목]: ${targetVideo.title}

[승인된 태그 목록] - 이 목록에서 2~3개 선택:
${JSON.stringify(APPROVED_TAGS)}

아래 JSON 형식으로 출력:
{
  "id": "kebab-case-영문-id (예: etsy-digital-product-guide)",
  "title": "한글 제목 (구체적 수치 + 방법, 클릭하고 싶은 제목, 30자 이내)",
  "tags": ["승인된 태그만 2~3개"],
  "seo": {
    "metaTitle": "SEO 제목 (60자 이내)",
    "metaDescription": "SEO 설명 (70~160자)",
    "focusKeyword": "핵심 검색 키워드 (한국어, 1~3단어)"
  }
}`;

    const metaResult = await generateWithRetry(genAI, metaPrompt, true);
    const metaText = cleanJson(metaResult.response.text());
    const metadata = JSON.parse(metaText);

    const postId = metadata.id || `idea-${targetVideo.videoId}`;
    const postTitle = metadata.title || targetVideo.title;
    const postTags = Array.isArray(metadata.tags)
      ? metadata.tags.filter((t: string) => APPROVED_TAGS.includes(t)).slice(0, 3)
      : ['수익화'];

    // 5. ID 유니크 확인
    const { data: idCheck } = await supabaseAdmin
      .from('case_studies')
      .select('id')
      .ilike('id', `${postId}%`);

    let finalId = postId;
    if (idCheck && idCheck.length > 0) {
      finalId = `${postId}-${idCheck.length + 1}`;
    }

    // 6. Supabase 저장
    const { error: dbError } = await supabaseAdmin
      .from('case_studies')
      .insert({
        id: finalId,
        title: postTitle,
        korean_title: '',
        byline: `By ${targetVideo.channelName}`,
        url: '',
        mrr: '',
        launch_date: '',
        thumbnail_image: '',
        tags: postTags,
        metrics: [],
        executive_summary: [],
        product_preview: null,
        k_market_strategy: null,
        enriched_content: null,
        published: false,
        seo: metadata.seo || {},
        content,
        category: 'idea',
        source_url: videoUrl,
      });

    if (dbError) {
      await markFailed(targetVideo.videoId, dbError.message);
      results.push(`DB 저장 실패: ${dbError.message}`);
      return NextResponse.json({ success: true, results, processed: 0 });
    }

    results.push(`아이디어 포스트 저장: ${finalId}`);

    // 7. 바론 검증
    const validateRes = await fetch(`${baseUrl}/api/validate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title: postTitle, category: 'idea' }),
    });
    const validateData = await validateRes.json();

    if (!validateData.success) {
      await markCompleted(targetVideo.videoId, finalId);
      results.push('바론 검증 실패 - draft로 저장');
      return NextResponse.json({ success: true, results, processed: 1 });
    }

    const verdict = validateData.report?.verdict;
    results.push(`바론 판정: ${verdict}`);

    if (verdict === 'PASS') {
      await supabaseAdmin
        .from('case_studies')
        .update({ published: true })
        .eq('id', finalId);
      await markCompleted(targetVideo.videoId, finalId);
      results.push('자동 게시 완료!');
    } else if (verdict === 'REVISE') {
      const improveRes = await fetch(`${baseUrl}/api/improve-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          title: postTitle,
          category: 'idea',
          sourceUrl: videoUrl,
          baronFeedback: {
            verdict: validateData.report.verdict,
            fixes: validateData.report.fixes,
            redFlags: validateData.report.redFlags.map(
              (f: { severity: string; name: string; detail: string }) =>
                `[${f.severity}] ${f.name}: ${f.detail}`
            ),
            bannedWords: validateData.report.bannedWords.map(
              (bw: { word: string }) => bw.word
            ),
            baronComment: validateData.report.baronComment,
          },
        }),
      });
      const improveData = await improveRes.json();

      if (improveData.success) {
        await supabaseAdmin
          .from('case_studies')
          .update({ content: improveData.improvedContent })
          .eq('id', finalId);
        results.push('바론 피드백 반영 개선 완료 - draft로 저장');
      } else {
        results.push('개선 실패 - draft로 저장');
      }
      await markCompleted(targetVideo.videoId, finalId);
    } else {
      await markCompleted(targetVideo.videoId, finalId);
      results.push('REJECT - draft로 저장');
    }

    return NextResponse.json({ success: true, results, processed: 1 });
  } catch (error) {
    console.error('Idea sync error:', error);
    return NextResponse.json(
      { success: false, error: String(error), results },
      { status: 500 }
    );
  }
}

// ── 헬퍼 함수 ──

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

async function generateWithRetry(genAI: GoogleGenerativeAI, prompt: string, jsonMode = false) {
  for (const modelName of MODEL_PRIORITY) {
    try {
      const config = jsonMode
        ? { model: modelName, generationConfig: { responseMimeType: 'application/json' as const } }
        : { model: modelName };
      const m = genAI.getGenerativeModel(config);
      const result = await m.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      console.log(`[idea-sync] Used model: ${modelName}`);
      return result;
    } catch (err: any) {
      const status = err?.status || err?.message?.match(/\[(\d{3})/)?.[1];
      if ((status == 503 || status == 429 || status == 404) && modelName !== MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) {
        console.warn(`[idea-sync] ${modelName} unavailable (${status}), trying next...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error('All models unavailable');
}

function cleanJson(text: string): string {
  let c = text.trim();
  c = c.replace(/^\uFEFF/, '');
  c = c.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  if (!c.startsWith('{')) {
    const s = c.indexOf('{');
    const e = c.lastIndexOf('}');
    if (s !== -1 && e > s) c = c.substring(s, e + 1);
  }
  return c;
}

async function checkIfProcessed(videoId: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('youtube_processed')
      .select('video_id')
      .eq('video_id', videoId)
      .limit(1);
    if (data && data.length > 0) return true;
  } catch {
    // 테이블 없으면 무시
  }

  const { data: cases } = await supabaseAdmin
    .from('case_studies')
    .select('id')
    .ilike('source_url', `%${videoId}%`)
    .limit(1);

  return (cases && cases.length > 0) || false;
}

async function markProcessing(videoId: string, channelId: string, title: string) {
  try {
    await supabaseAdmin.from('youtube_processed').upsert({
      video_id: videoId,
      channel_id: channelId,
      title,
      status: 'processing',
    });
  } catch {
    // 테이블 없으면 무시
  }
}

async function markCompleted(videoId: string, caseStudyId: string) {
  try {
    await supabaseAdmin.from('youtube_processed').upsert({
      video_id: videoId,
      status: 'completed',
      case_study_id: caseStudyId,
    });
  } catch {
    // 테이블 없으면 무시
  }
}

async function markFailed(videoId: string, error: string) {
  try {
    await supabaseAdmin.from('youtube_processed').upsert({
      video_id: videoId,
      status: 'failed',
      error,
    });
  } catch {
    // 테이블 없으면 무시
  }
}

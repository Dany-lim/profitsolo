import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  fetchChannelVideos,
  getTranscript,
  transcriptToRawContent,
  DEFAULT_CHANNELS,
} from '@/lib/youtube';

// Vercel serverless function 최대 실행 시간
export const maxDuration = 60;

/**
 * YouTube 자동 동기화 Cron 핸들러
 * - 채널의 새 영상 감지 → 자막 추출 → 케이스 스터디 생성 → 바론 검증 → 게시
 * - 1회 실행에 1개 영상만 처리 (타임아웃 방지)
 */
export async function GET(request: NextRequest) {
  // Cron 인증 (Vercel Cron은 Authorization 헤더로 CRON_SECRET 전송)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = getBaseUrl();
  const results: string[] = [];

  try {
    // 1. 채널 목록 가져오기 (DB에 있으면 DB, 없으면 하드코딩)
    const channels = await getChannels();
    results.push(`채널 ${channels.length}개 확인`);

    // 2. 각 채널에서 새 영상 찾기
    let targetVideo: { videoId: string; title: string; channelName: string; channelId: string } | null = null;

    for (const channel of channels) {
      const videos = await fetchChannelVideos(channel.id);
      if (videos.length === 0) continue;

      // 이미 처리된 영상 제외
      for (const video of videos.slice(0, 5)) { // 최근 5개만 확인
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

    // 3. 처리 시작 기록
    await markProcessing(targetVideo.videoId, targetVideo.channelId, targetVideo.title);

    // 4. 자막 추출
    const transcript = await getTranscript(targetVideo.videoId);
    if (!transcript || transcript.length < 200) {
      await markFailed(targetVideo.videoId, '자막 없음 또는 너무 짧음');
      results.push('자막 추출 실패 - 스킵');
      return NextResponse.json({ success: true, results, processed: 0 });
    }
    results.push(`자막 추출 완료: ${transcript.length}자`);

    // 5. 자막 → rawContent
    const rawContent = transcriptToRawContent(
      transcript,
      targetVideo.title,
      targetVideo.channelName,
      targetVideo.videoId
    );

    // 6. 케이스 스터디 생성 (기존 API 활용)
    const generateRes = await fetch(`${baseUrl}/api/generate-case-study`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawContent,
        sourceUrl: `https://www.youtube.com/watch?v=${targetVideo.videoId}`,
      }),
    });
    const generateData = await generateRes.json();

    if (!generateData.success) {
      await markFailed(targetVideo.videoId, generateData.error || 'Generate failed');
      results.push('케이스 스터디 생성 실패');
      return NextResponse.json({ success: true, results, processed: 0 });
    }

    const caseStudyId = generateData.caseStudy.id;
    results.push(`케이스 스터디 생성: ${caseStudyId}`);

    // 7. 바론 검증
    const validateRes = await fetch(`${baseUrl}/api/validate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: generateData.caseStudy.content,
        title: generateData.caseStudy.title,
      }),
    });
    const validateData = await validateRes.json();

    if (!validateData.success) {
      await markCompleted(targetVideo.videoId, caseStudyId);
      results.push('바론 검증 실패 - draft로 저장');
      return NextResponse.json({ success: true, results, processed: 1 });
    }

    const verdict = validateData.report?.verdict;
    results.push(`바론 판정: ${verdict}`);

    if (verdict === 'PASS') {
      // PASS → 자동 게시
      await supabaseAdmin
        .from('case_studies')
        .update({ published: true })
        .eq('id', caseStudyId);
      await markCompleted(targetVideo.videoId, caseStudyId);
      results.push('자동 게시 완료!');
    } else if (verdict === 'REVISE') {
      // REVISE → 개선 시도 (1회만, 시간 제약)
      const improveRes = await fetch(`${baseUrl}/api/improve-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: generateData.caseStudy.content,
          title: generateData.caseStudy.title,
          sourceUrl: `https://www.youtube.com/watch?v=${targetVideo.videoId}`,
          homepageUrl: generateData.caseStudy.url || undefined,
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
        // 개선된 콘텐츠 저장
        await supabaseAdmin
          .from('case_studies')
          .update({ content: improveData.improvedContent })
          .eq('id', caseStudyId);
        results.push('바론 피드백 반영 개선 완료 - draft로 저장');
      } else {
        results.push('개선 실패 - draft로 저장');
      }
      await markCompleted(targetVideo.videoId, caseStudyId);
    } else {
      // REJECT → draft 저장
      await markCompleted(targetVideo.videoId, caseStudyId);
      results.push('REJECT - draft로 저장');
    }

    return NextResponse.json({ success: true, results, processed: 1 });
  } catch (error) {
    console.error('YouTube sync error:', error);
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

async function getChannels() {
  try {
    const { data, error } = await supabaseAdmin
      .from('youtube_channels')
      .select('*')
      .eq('enabled', true);
    if (error || !data || data.length === 0) return DEFAULT_CHANNELS;
    return data;
  } catch {
    return DEFAULT_CHANNELS;
  }
}

async function checkIfProcessed(videoId: string): Promise<boolean> {
  try {
    // youtube_processed 테이블 체크
    const { data } = await supabaseAdmin
      .from('youtube_processed')
      .select('video_id')
      .eq('video_id', videoId)
      .limit(1);
    if (data && data.length > 0) return true;
  } catch {
    // 테이블 없으면 무시
  }

  // case_studies에서 source_url로 체크 (폴백)
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

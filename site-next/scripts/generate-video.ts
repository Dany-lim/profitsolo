/**
 * 아이디어 포스트 → 영상 자동 생성 스크립트
 *
 * 플로우: 자막 추출 → 대본 생성 → TTS 음성 → 원본 영상 다운 → 클립 추출 + 합성
 *        (--with-blog 시) 대본 생성 후 블로그 포스트 병렬 생성 → Supabase 저장
 *
 * 사용법:
 *   일반 영상:         npx tsx scripts/generate-video.ts <videoId>
 *   쇼츠 영상:         npx tsx scripts/generate-video.ts <videoId> --shorts
 *   영상 + 블로그:     npx tsx scripts/generate-video.ts <videoId> --with-blog
 *   영상 + 자막:       npx tsx scripts/generate-video.ts <videoId> --with-subs
 *   쇼츠 + 블로그:     npx tsx scripts/generate-video.ts <videoId> --shorts --with-blog
 *   전체 (자막+블로그): npx tsx scripts/generate-video.ts <videoId> --with-subs --with-blog
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// .env.local 로드
const envPath = resolve(import.meta.dirname || __dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  process.env[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // Daniel - 차분한 남성 영어/다국어
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const OUTPUT_DIR = resolve(import.meta.dirname || __dirname, '..', 'output', 'videos');
const TEMP_DIR = resolve(OUTPUT_DIR, 'temp');

interface ScriptSegment {
  narration: string;
  videoStart: number;
  videoEnd: number;
}

// ── 블로그 생성용 헬퍼 ──

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

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

async function generateWithRetry(prompt: string, jsonMode = false) {
  for (const modelName of MODEL_PRIORITY) {
    try {
      const config = jsonMode
        ? { model: modelName, generationConfig: { responseMimeType: 'application/json' as const } }
        : { model: modelName };
      const m = genAI.getGenerativeModel(config);
      return await m.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    } catch (err: any) {
      const status = err?.status || err?.message?.match(/\[(\d{3})/)?.[1];
      if ((status == 503 || status == 429 || status == 404) && modelName !== MODEL_PRIORITY[MODEL_PRIORITY.length - 1]) continue;
      throw err;
    }
  }
  throw new Error('All models unavailable');
}

function cleanJson(text: string): string {
  let c = text.trim().replace(/^\uFEFF/, '');
  c = c.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  if (!c.startsWith('{')) {
    const s = c.indexOf('{');
    const e = c.lastIndexOf('}');
    if (s !== -1 && e > s) c = c.substring(s, e + 1);
  }
  return c;
}

// ── 1. 자막 추출 (타임스탬프 포함) ──

async function getTimestampedTranscript(videoId: string) {
  try {
    const t = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    if (t?.length) return t.map(x => ({ text: x.text, offset: x.offset, duration: x.duration }));
    const f = await YoutubeTranscript.fetchTranscript(videoId);
    if (f?.length) return f.map(x => ({ text: x.text, offset: x.offset, duration: x.duration }));
    return null;
  } catch { return null; }
}

async function getVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    return (await res.json()).title || videoId;
  } catch { return videoId; }
}

// ── 2. Gemini로 대본 생성 ──

function buildTranscriptSegments(transcript: { text: string; offset: number; duration: number }[]) {
  const segments: { startSec: number; endSec: number; text: string }[] = [];
  let current = { startSec: 0, endSec: 30, texts: [] as string[] };

  for (const item of transcript) {
    const sec = item.offset / 1000;
    if (sec >= current.endSec) {
      if (current.texts.length) {
        segments.push({ startSec: current.startSec, endSec: current.endSec, text: current.texts.join(' ') });
      }
      current = { startSec: Math.floor(sec / 30) * 30, endSec: Math.floor(sec / 30) * 30 + 30, texts: [] };
    }
    current.texts.push(item.text);
  }
  if (current.texts.length) {
    segments.push({ startSec: current.startSec, endSec: current.endSec, text: current.texts.join(' ') });
  }
  return segments;
}

async function generateScript(videoId: string, title: string, transcript: { text: string; offset: number; duration: number }[], isShorts: boolean): Promise<ScriptSegment[]> {
  const segments = buildTranscriptSegments(transcript);

  const segmentInfo = segments.map(s => {
    const sm = Math.floor(s.startSec / 60), ss = s.startSec % 60;
    const em = Math.floor(s.endSec / 60), es = s.endSec % 60;
    return `[${sm}:${String(ss).padStart(2, '0')} ~ ${em}:${String(es).padStart(2, '0')}] ${s.text}`;
  }).join('\n');

  const prompt = isShorts
    ? `당신은 유튜브 쇼츠 요약 채널의 나레이터입니다. 아래 영어 유튜브 영상의 자막을 보고, 60초 이내 한국어 쇼츠 나레이션 대본을 작성하세요.

[영상 제목]: ${title}

[타임스탬프별 원본 자막]
${segmentInfo.substring(0, 6000)}

[쇼츠 대본 규칙]
1. JSON 배열로 출력. 각 항목은 { "narration": "한국어 나레이션", "videoStart": 시작초, "videoEnd": 끝초 } 형식.
2. 전체 대본은 60초 이내. 나레이션 합계 200~280자.
3. 3~5개 구간만. 핵심만 빠르게.
4. 각 나레이션은 1~2문장. 임팩트 있게.
5. 도입(1문장): 호기심 유발. "이걸로 월 천만원 벌 수 있다는 거 아세요?" 같은 후킹.
6. 본문(2~3구간): 핵심 방법만 초압축.
7. 마무리(1문장): "자세한 건 블로그 링크 확인하세요" 식 CTA.
8. "~합니다" 존댓말. 빠른 템포의 구어체.
9. videoStart, videoEnd는 원본 영상의 가장 시각적으로 흥미로운 구간을 선택하라.

JSON 배열만 출력:`
    : `당신은 유튜브 요약 채널의 나레이터입니다. 아래 영어 유튜브 영상의 타임스탬프별 자막을 보고, 한국어 나레이션 대본을 작성하세요.

[영상 제목]: ${title}

[타임스탬프별 원본 자막]
${segmentInfo.substring(0, 6000)}

[대본 작성 규칙]
1. JSON 배열로 출력하라. 각 항목은 { "narration": "한국어 나레이션", "videoStart": 시작초, "videoEnd": 끝초 } 형식.
2. narration은 해당 구간의 원본 내용을 한국어로 요약/설명하는 나레이션이다.
3. 전체 대본은 약 3분 분량 (나레이션 합계 700~900자).
4. 각 나레이션은 2~3문장. 짧고 명료하게.
5. videoStart, videoEnd는 원본 영상에서 보여줄 구간(초 단위). 나레이션 내용과 관련된 원본 구간을 매핑하라.
6. 중요: videoEnd - videoStart 는 15~25초 사이로 설정. 한 구간이 너무 짧거나 길지 않게.
7. 도입부: "오늘은 ~ 방법에 대해 알아보겠습니다" 식으로 시작.
8. 마무리: 핵심 포인트 한 줄 정리 + 자연스러운 마무리.
9. "~합니다", "~됩니다" 존댓말 사용.
10. 자연스러운 구어체. 딱딱하지 않게.
11. 8~12개 구간으로 나눠라.
12. 원본 영상의 핵심 내용을 빠짐없이 요약하라. 이야기가 중간에 끊기지 않도록 결론까지 포함.

JSON 배열만 출력:`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
  let text = result.response.text().trim();
  text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(text);
}

// ── 3. ElevenLabs TTS ──

async function generateTTS(text: string, outputPath: string): Promise<void> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS 실패 (${res.status}): ${err}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(outputPath, buffer);
}

// ── 4. 원본 영상 다운로드 ──

function downloadVideo(videoId: string, outputPath: string): void {
  if (existsSync(outputPath)) {
    console.log('  원본 영상 이미 다운로드됨');
    return;
  }
  console.log('  원본 영상 다운로드 중...');
  execSync(
    `yt-dlp -f "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`,
    { stdio: 'inherit' }
  );
}

// ── 5. 오디오 길이 측정 ──

function getAudioDuration(filePath: string): number {
  const output = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
    { encoding: 'utf-8' }
  );
  return parseFloat(output.trim());
}

// ── 6. 자막 파일 생성 (ASS 형식) ──

function generateSubtitleFile(
  segments: ScriptSegment[],
  audioDurations: number[],
  isShorts: boolean,
  videoId: string
): string {
  const fontSize = isShorts ? 28 : 40;
  const marginV = isShorts ? 120 : 60;
  const playResX = isShorts ? 1080 : 1920;
  const playResY = isShorts ? 1920 : 1080;

  // 누적 타이밍 계산 + 문장 단위 분리
  let currentTime = 0;
  const events: { start: number; end: number; text: string }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const dur = audioDurations[i];
    const segStart = currentTime;
    const segEnd = currentTime + dur;

    // 마침표 기준 문장 분리 (가독성 향상)
    const sentences = segments[i].narration
      .split(/(?<=\.)\s+/)
      .filter(s => s.trim().length > 0);

    if (sentences.length <= 1) {
      events.push({ start: segStart, end: segEnd, text: segments[i].narration });
    } else {
      const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
      let t = segStart;
      for (let j = 0; j < sentences.length; j++) {
        const ratio = sentences[j].length / totalChars;
        const sentEnd = j === sentences.length - 1 ? segEnd : t + dur * ratio;
        events.push({ start: t, end: sentEnd, text: sentences[j].trim() });
        t = sentEnd;
      }
    }

    currentTime += dur;
  }

  const fmtTime = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 100);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const ass = `[Script Info]
Title: Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: ${playResX}
PlayResY: ${playResY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Apple SD Gothic Neo,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,30,30,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.map(e => `Dialogue: 0,${fmtTime(e.start)},${fmtTime(e.end)},Default,,0,0,0,,${e.text}`).join('\n')}
`;

  const assPath = `/tmp/${videoId}-subs.ass`;
  writeFileSync(assPath, ass, 'utf-8');
  return assPath;
}

// ── 7. 영상 합성 ──

function assembleVideo(
  segments: ScriptSegment[],
  audioFiles: string[],
  sourceVideo: string,
  outputPath: string,
  videoDuration: number,
  isShorts: boolean,
  withSubtitles: boolean = false,
  videoId: string = ''
): void {
  const audioDurations = audioFiles.map(f => getAudioDuration(f));

  // 자막 파일 생성
  let subtitleFile: string | null = null;
  if (withSubtitles && videoId) {
    subtitleFile = generateSubtitleFile(segments, audioDurations, isShorts, videoId);
    console.log('  자막 파일 생성 완료');
  }

  // 쇼츠: 1080x1920 (세로), 일반: 1920x1080 (가로)
  const width = isShorts ? 1080 : 1920;
  const height = isShorts ? 1920 : 1080;

  const inputArgs: string[] = [];
  const filterParts: string[] = [];
  const concatInputs: string[] = [];

  inputArgs.push(`-i "${sourceVideo}"`);
  for (const af of audioFiles) {
    inputArgs.push(`-i "${af}"`);
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const audioDur = audioDurations[i];
    const audioIdx = i + 1;

    let vStart = Math.max(0, seg.videoStart);
    let vEnd = Math.min(videoDuration, seg.videoEnd);

    let clipDur = vEnd - vStart;
    if (clipDur <= 0) {
      vStart = 0;
      vEnd = Math.min(30, videoDuration);
      clipDur = vEnd - vStart;
    }

    // 속도 제한: 최대 1.3배속, 최소 0.75배속 (너무 빠르거나 느리지 않게)
    const MAX_SPEED = 1.3;
    const MIN_SPEED = 0.75;
    let speed = clipDur / audioDur;

    if (speed > MAX_SPEED) {
      // 클립이 너무 길면 → 필요한 만큼만 잘라서 사용
      vEnd = vStart + audioDur * MAX_SPEED;
      vEnd = Math.min(vEnd, videoDuration);
      speed = MAX_SPEED;
    } else if (speed < MIN_SPEED) {
      // 클립이 너무 짧으면 → 살짝 느리게
      speed = MIN_SPEED;
    }

    if (isShorts) {
      // 쇼츠: 세로 크롭 (중앙 기준), 하단 자막 제거
      filterParts.push(
        `[0:v]trim=start=${vStart}:end=${vEnd},setpts=PTS/${speed},setpts=PTS-STARTPTS,crop=iw:ih*0.88:0:0,scale=-1:1920,crop=1080:1920[v${i}]`
      );
    } else {
      // 하단 12% 크롭 → 원본 자막 제거 후 1920x1080으로 스케일
      filterParts.push(
        `[0:v]trim=start=${vStart}:end=${vEnd},setpts=PTS/${speed},setpts=PTS-STARTPTS,crop=iw:ih*0.88:0:0,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v${i}]`
      );
    }

    concatInputs.push(`[v${i}][${audioIdx}:a]`);
  }

  const concatExpr = `${concatInputs.join('')}concat=n=${segments.length}:v=1:a=1`;
  let filter: string;
  if (subtitleFile) {
    filter = filterParts.join(';\n') +
      `;\n${concatExpr}[concatv][outa]` +
      `;\n[concatv]ass=${subtitleFile}[outv]`;
  } else {
    filter = filterParts.join(';\n') +
      `;\n${concatExpr}[outv][outa]`;
  }

  const filterFile = join(TEMP_DIR, 'filter.txt');
  writeFileSync(filterFile, filter);

  const cmd = `ffmpeg -y ${inputArgs.join(' ')} -filter_complex_script "${filterFile}" -map "[outv]" -map "[outa]" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k -movflags +faststart "${outputPath}"`;

  console.log('  FFmpeg 합성 중...');
  execSync(cmd, { stdio: 'inherit' });
}

// ── 7. 블로그 포스트 생성 (--with-blog) ──

async function generateBlogPost(
  videoId: string,
  title: string,
  transcript: { text: string; offset: number; duration: number }[],
  validScript: ScriptSegment[],
): Promise<void> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const transcriptText = transcript.map(t => t.text).join(' ');
  const narrationSummary = validScript.map(s => s.narration).join('\n');

  console.log('\n--- 블로그 포스트 생성 ---');

  // 1. 콘텐츠 생성 (정보 요약형 스토리텔링)
  console.log('  [Blog] 콘텐츠 생성 중...');
  const contentPrompt = `당신은 온라인 비즈니스와 수익화 트렌드를 분석하는 전문 블로거입니다. 아래 YouTube 영상 자막과 요약 나레이션을 바탕으로, 정보 요약형 블로그 포스트를 작성하세요.

[영상 제목]: ${title}
[영상 URL]: ${videoUrl}

[문체 & 톤 - 정보 요약형 스토리텔링]
- 3인칭 서술. "이 방법은 ~했습니다", "해당 전략을 사용하면 ~할 수 있습니다" 식으로 작성하라.
- 1인칭 표현("제가", "직접 해보니") 절대 금지.
- 뉴스 기사와 블로그의 중간 톤. 객관적이되 딱딱하지 않게.
- "~했습니다", "~했죠", "~됩니다" 톤 유지.
- 구체적인 숫자, 도구명, 플랫폼명, 수익 구조를 명확히 전달하라.
- 문장은 짧고 명료하게.

[구조]
1. 도입 (2~3줄): 이 영상에서 다루는 핵심 주제와 왜 주목할 만한지를 간결하게 설명
2. 본문: 핵심 전략/방법을 소제목별로 정리
   - 각 섹션마다 ### 소제목 사용
   - 구체적인 도구, 사이트, 방법 포함
   - 실제 수치/예시가 있으면 반드시 포함
3. 마무리: 핵심 정리를 불릿 포인트(- 형식)로 3~5개 요약. 장황한 감상 금지.

[외부 링크]
- 본문에서 언급하는 도구/플랫폼/사이트 중 가장 핵심적인 것 1개만 마크다운 링크로 넣어라.
- 형식: [도구명](https://실제URL)
- 실제 존재하는 URL만 사용. 모르면 링크 넣지 마라.

[줄간격 규칙]
- 문단과 문단 사이에 빈 줄을 하나씩 넣어라.
- 소제목(###) 위에는 빈 줄 2개, 아래에는 빈 줄 1개를 넣어라.
- 한 문단은 2~4문장.

[분량 — 최우선 규칙]
- 마크다운 기호 포함 총 1,500자 이내. 이것은 절대 규칙이다.
- 1,500자를 초과하면 불합격이다. 정보를 과감히 생략하고 핵심만 남겨라.
- 소제목(###)은 최대 3개.
- 각 소제목 아래 본문은 3~5문장으로 제한.
- 마무리 불릿은 3개 이내.

[절대 금지]
- 이모지/유니코드 특수문자 완전 금지.
- 마크다운 표(파이프) 금지. 소제목은 ##, ###만 사용.
- 볼드(**) 사용 완전 금지.
- "~이다", "~것이다" 같은 문어체/반말 어미 금지.
- AI가 쓴 티 나는 표현 금지: "혁신", "시사점", "교훈", "주목할 만한", "눈여겨볼", "강력한 도구", "게임 체인저", "놀라운 잠재력", "핵심 포인트", "다양한 방법", "결론적으로", "요약하자면", "마무리하며"
- "지금 바로 시작해보세요!" 같은 뻔한 CTA 금지.
- JSON, 코드 블록 금지. 순수 마크다운 본문만 출력.
- 글머리 번호(1. 2. 3.)를 남발하지 마라. 문단으로 풀어써라. 단, 마무리 정리에서만 불릿(-)을 사용하라.
- HTML 태그 금지.
- 1인칭 표현 금지.

[자막 내용]
${transcriptText.substring(0, 4000)}

[한국어 나레이션 요약]
${narrationSummary.substring(0, 2000)}

위 내용을 바탕으로 정보 요약형 블로그 포스트를 작성하라. 본문만 출력.`;

  const contentResult = await generateWithRetry(contentPrompt);
  let content = contentResult!.response.text().trim();
  content = content
    .split('\n')
    .filter((line: string) => !(line.trim().startsWith('|') && line.trim().includes('|')))
    .join('\n')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<\/?(?:div|span|p|br)[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\|/g, '');

  console.log(`  [Blog] 콘텐츠 생성 완료: ${content.length}자`);

  // 2. 메타데이터 생성
  console.log('  [Blog] 메타데이터 생성 중...');
  const metaPrompt = `아래 블로그 포스트의 메타데이터를 JSON으로 생성하세요.

[블로그 본문 (앞부분)]
${content.substring(0, 2000)}

[원본 영상 제목]: ${title}

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

productPreview 규칙:
- 본문에 등장하는 주요 서비스/도구의 핵심 기능 3가지를 요약
- label은 4~8자의 짧은 기능명
- desc는 30자 이내의 한줄 설명`;

  const metaResult = await generateWithRetry(metaPrompt, true);
  const metadata = JSON.parse(cleanJson(metaResult!.response.text()));

  const postId = metadata.id || `video-${videoId}`;
  const postTitle = metadata.title || title;
  const tags = Array.isArray(metadata.tags)
    ? metadata.tags.filter((t: string) => APPROVED_TAGS.includes(t)).slice(0, 3)
    : ['수익화'];

  // 3. ID 중복 체크
  const supabase = getSupabase();
  const { data: idCheck } = await supabase
    .from('case_studies')
    .select('id')
    .ilike('id', `${postId}%`);

  let finalId = postId;
  if (idCheck && idCheck.length > 0) {
    finalId = `${postId}-${idCheck.length + 1}`;
  }

  // 4. Supabase 저장
  const { error: dbError } = await supabase
    .from('case_studies')
    .insert({
      id: finalId,
      title: postTitle,
      korean_title: '',
      byline: 'By ProfitSolo',
      url: '',
      mrr: '',
      launch_date: '',
      thumbnail_image: '',
      tags,
      metrics: [],
      executive_summary: [],
      product_preview: metadata.productPreview ? {
        title: metadata.productPreview.title || '제품 체험하기',
        localImage: '',
        steps: Array.isArray(metadata.productPreview.steps)
          ? metadata.productPreview.steps.slice(0, 3).map((s: any) => ({ label: s.label || '', desc: s.desc || '' }))
          : [],
      } : null,
      k_market_strategy: null,
      enriched_content: null,
      published: false,
      seo: metadata.seo || {},
      content,
      category: 'idea',
      source_url: videoUrl,
    });

  if (dbError) {
    console.error(`  [Blog] DB 저장 실패: ${dbError.message}`);
    return;
  }

  console.log(`  [Blog] 저장 완료: ${finalId}`);
  console.log(`  [Blog] 제목: "${postTitle}"`);
  console.log(`  [Blog] 태그: ${tags.join(', ')}`);
  console.log('--- 블로그 포스트 생성 완료 ---\n');
}

// ── 메인 ──

async function main() {
  const args = process.argv.slice(2);
  const isShorts = args.includes('--shorts');
  const withBlog = args.includes('--with-blog');
  const withSubs = args.includes('--with-subs');
  const videoId = args.find(a => !a.startsWith('--'));

  if (!videoId) {
    console.log('사용법: npx tsx scripts/generate-video.ts <videoId> [--shorts] [--with-subs] [--with-blog]');
    console.log('예시:   npx tsx scripts/generate-video.ts Xs0h513JFK0 --with-subs --with-blog');
    return;
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(TEMP_DIR, { recursive: true });

  const flags = [isShorts ? '쇼츠' : '일반 (3분, 가로)', withSubs ? '+자막' : '', withBlog ? '+블로그' : ''].filter(Boolean).join(' ');
  console.log(`\n=== 영상 생성 시작: ${videoId} [${flags}] ===\n`);

  // 1. 영상 제목
  const title = await getVideoTitle(videoId);
  console.log(`1. 제목: ${title}`);

  // 2. 자막 추출
  console.log('2. 자막 추출 중...');
  const transcript = await getTimestampedTranscript(videoId);
  if (!transcript || transcript.length < 10) {
    console.log('   자막이 없거나 너무 짧습니다.');
    return;
  }
  console.log(`   ${transcript.length}개 자막 세그먼트`);

  // 3. 대본 생성
  console.log('3. 대본 생성 중...');
  const script = await generateScript(videoId, title, transcript, isShorts);
  console.log(`   ${script.length}개 구간 생성`);

  // 대본 저장
  const scriptPath = join(TEMP_DIR, `${videoId}-script.json`);
  writeFileSync(scriptPath, JSON.stringify(script, null, 2));

  // 대본 미리보기 + 유효성 검사
  const validScript = script.filter((s: any) => s && s.narration && typeof s.narration === 'string' && typeof s.videoStart === 'number' && typeof s.videoEnd === 'number');
  if (validScript.length === 0) {
    console.log('   유효한 대본이 없습니다.');
    return;
  }

  let totalChars = 0;
  for (let i = 0; i < validScript.length; i++) {
    const s = validScript[i];
    const preview = s.narration.length > 40 ? s.narration.substring(0, 40) + '...' : s.narration;
    console.log(`   [${i + 1}] ${Math.floor(s.videoStart / 60)}:${String(Math.floor(s.videoStart % 60)).padStart(2, '0')}~${Math.floor(s.videoEnd / 60)}:${String(Math.floor(s.videoEnd % 60)).padStart(2, '0')} "${preview}"`);
    totalChars += s.narration.length;
  }
  console.log(`   총 ${totalChars}자\n`);

  // 블로그 포스트 병렬 생성 시작
  let blogPromise: Promise<void> | null = null;
  if (withBlog) {
    console.log('>> 블로그 포스트 생성을 병렬로 시작합니다...\n');
    blogPromise = generateBlogPost(videoId, title, transcript, validScript)
      .catch(err => console.error(`  [Blog] 블로그 생성 실패: ${err.message}`));
  }

  // 4. TTS 생성
  console.log('4. TTS 음성 생성 중...');
  const audioFiles: string[] = [];
  const audioPrefix = isShorts ? `${videoId}-shorts-audio` : `${videoId}-audio`;
  for (let i = 0; i < validScript.length; i++) {
    const audioPath = join(TEMP_DIR, `${audioPrefix}-${i}.mp3`);
    audioFiles.push(audioPath);

    if (existsSync(audioPath)) {
      console.log(`   [${i + 1}/${validScript.length}] 캐시 사용`);
      continue;
    }

    const preview = validScript[i].narration.length > 30 ? validScript[i].narration.substring(0, 30) + '...' : validScript[i].narration;
    console.log(`   [${i + 1}/${validScript.length}] "${preview}"`);
    await generateTTS(validScript[i].narration, audioPath);

    // Rate limit 방지
    if (i < validScript.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.log();

  // 5. 원본 영상 다운로드
  console.log('5. 원본 영상 준비');
  const sourceVideo = join(TEMP_DIR, `${videoId}-source.mp4`);
  downloadVideo(videoId, sourceVideo);

  // 영상 길이 확인
  const videoDuration = getAudioDuration(sourceVideo);
  console.log(`   영상 길이: ${Math.floor(videoDuration / 60)}분 ${Math.floor(videoDuration % 60)}초\n`);

  // 6. 영상 합성
  console.log('6. 영상 합성');
  const suffix = isShorts ? '-shorts' : '-final';
  const outputPath = join(OUTPUT_DIR, `${videoId}${suffix}.mp4`);
  assembleVideo(validScript, audioFiles, sourceVideo, outputPath, videoDuration, isShorts, withSubs, videoId);

  // 블로그 포스트 완료 대기
  if (blogPromise) {
    console.log('\n블로그 포스트 완료 대기 중...');
    await blogPromise;
  }

  console.log(`\n=== 완료 ===`);
  console.log(`출력 파일: ${outputPath}`);
  if (withBlog) {
    console.log('블로그: Supabase case_studies 테이블에 저장됨 (draft)');
  }

  // 임시 파일 정리
  const filterFile = join(TEMP_DIR, 'filter.txt');
  if (existsSync(filterFile)) unlinkSync(filterFile);
  const assFile = `/tmp/${videoId}-subs.ass`;
  if (existsSync(assFile)) unlinkSync(assFile);
}

main().catch(console.error);

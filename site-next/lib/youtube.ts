import { YoutubeTranscript } from 'youtube-transcript';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  published: string;
  channelName: string;
}

/**
 * YouTube RSS 피드에서 최근 영상 목록 가져오기
 */
export async function fetchChannelVideos(channelId: string): Promise<YouTubeVideo[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const res = await fetch(feedUrl, { next: { revalidate: 0 } });
  if (!res.ok) {
    console.error(`RSS fetch failed for ${channelId}: ${res.status}`);
    return [];
  }

  const xml = await res.text();
  const videos: YouTubeVideo[] = [];

  // 간단한 XML 파싱 (cheerio 대신 regex)
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const channelNameMatch = xml.match(/<name>([\s\S]*?)<\/name>/);
  const channelName = channelNameMatch ? channelNameMatch[1].trim() : '';

  for (const entry of entries) {
    const videoIdMatch = entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);

    if (videoIdMatch) {
      videos.push({
        videoId: videoIdMatch[1].trim(),
        title: titleMatch ? titleMatch[1].trim() : '',
        published: publishedMatch ? publishedMatch[1].trim() : '',
        channelName,
      });
    }
  }

  return videos;
}

/**
 * 영상 자막 추출
 */
export async function getTranscript(videoId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en',
    });

    if (!transcript || transcript.length === 0) {
      // 영어 자막 없으면 기본 자막 시도
      const fallback = await YoutubeTranscript.fetchTranscript(videoId);
      if (!fallback || fallback.length === 0) return null;
      return fallback.map((t) => t.text).join(' ');
    }

    return transcript.map((t) => t.text).join(' ');
  } catch (error) {
    console.error(`Transcript error for ${videoId}:`, error);
    return null;
  }
}

/**
 * 자막 텍스트를 케이스 스터디 생성용 rawContent로 변환
 */
export function transcriptToRawContent(
  transcript: string,
  videoTitle: string,
  channelName: string,
  videoId: string
): string {
  return `# ${videoTitle}

Source: ${channelName} (YouTube)
Video: https://www.youtube.com/watch?v=${videoId}

## Transcript

${transcript}
`;
}

/**
 * 기본 채널 목록 (하드코딩)
 */
export const DEFAULT_CHANNELS = [
  {
    id: 'UCGsBRXfOV7_gfOo5IHTqfOw',
    name: 'Starter Story',
    url: 'https://www.youtube.com/@StarterStory',
  },
  {
    id: 'UC9cn0TuPq4dnbTY-CBsm8sg',
    name: 'My First Million',
    url: 'https://www.youtube.com/@MyFirstMillionPod',
  },
  {
    id: 'UCwHm4XKVqaGAPZwosfgKgGQ',
    name: 'Greg Isenberg',
    url: 'https://www.youtube.com/@GregIsenberg',
  },
];

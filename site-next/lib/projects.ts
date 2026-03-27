export interface Project {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  screenshot: string;
  metrics: { label: string; value: string }[];
  techStack: string[];
  status: '운영중' | '개발중' | '종료';
  category: string;
}

export const projects: Project[] = [
  {
    id: 'profitsolo',
    name: 'Startup Radar',
    tagline: '1인 창업 케이스 스터디 플랫폼',
    description:
      '해외 1인 창업자들의 성공 사례를 AI로 분석하고, 한국 시장에 맞는 인사이트를 제공합니다. 광고비 0원, 100% 자동화된 콘텐츠 파이프라인으로 운영됩니다.',
    url: 'https://www.profitsolo.net',
    screenshot: 'https://iqxxpycuhyjddizqeqhe.supabase.co/storage/v1/object/public/images/projects/profitsolo.png',
    metrics: [
      { label: '케이스 스터디', value: '12+' },
      { label: '콘텐츠 자동화', value: '100%' },
      { label: '상태', value: '운영중' },
    ],
    techStack: ['Next.js', 'Gemini AI', 'Supabase', 'Vercel'],
    status: '운영중',
    category: '미디어 / AI',
  },
  {
    id: 'bestcryptobots',
    name: 'Magic Split',
    tagline: '암호화폐 자동매매 봇',
    description:
      '검증된 퀀트 알고리즘으로 24시간 자동 거래합니다. 피라미드 가중치 매수와 하이브리드 점프 시스템으로 리스크를 최소화하며, 연 13.4% 수익률을 기록했습니다.',
    url: 'https://bestcryptobots.net',
    screenshot: 'https://iqxxpycuhyjddizqeqhe.supabase.co/storage/v1/object/public/images/projects/bestcryptobots.png',
    metrics: [
      { label: '연 수익률', value: '13.4%' },
      { label: '최대 낙폭', value: '-4.5%' },
      { label: '상태', value: '운영중' },
    ],
    techStack: ['Python', 'Upbit API', 'Quant Algorithm'],
    status: '운영중',
    category: '핀테크 / 자동화',
  },
  {
    id: 'okhostel',
    name: 'TwinRabbit Hostel',
    tagline: '서울 연남동 호스텔',
    description:
      '서울 연남동에 위치한 모던 호스텔입니다. 다국어 예약 시스템과 직접 운영 경험을 바탕으로, 합리적인 가격에 쾌적한 숙소를 제공합니다.',
    url: 'https://www.okhostel.com',
    screenshot: 'https://iqxxpycuhyjddizqeqhe.supabase.co/storage/v1/object/public/images/projects/okhostel.png',
    metrics: [
      { label: '다국어 지원', value: '6개국어' },
      { label: '위치', value: '서울 연남동' },
      { label: '상태', value: '운영중' },
    ],
    techStack: ['WordPress', 'Booking Engine', 'Multi-language'],
    status: '운영중',
    category: '숙박 / 여행',
  },
];

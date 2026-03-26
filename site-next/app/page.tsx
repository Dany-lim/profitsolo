import { CaseStudy } from '@/types/case-study';
import { HomeContent } from '@/components/home-content';
import fs from 'fs/promises';
import path from 'path';

// ISR: 1시간마다 재생성 (구글 크롤 효율 극대화)
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://profitsolo.net';

export default async function Home() {
  const filePath = path.join(process.cwd(), 'data', 'case-studies.json');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const allStudies = JSON.parse(fileContent) as CaseStudy[];
  const studies = allStudies.filter(s => s.published !== false);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '스타트업 레이더',
    url: SITE_URL,
    description: '해외 1인 창업자들의 월 수천만원 매출 비결을 분석합니다.',
    inLanguage: 'ko',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeContent initialStudies={studies} />
    </>
  );
}

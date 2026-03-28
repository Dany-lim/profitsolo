import { CaseStudy } from '@/types/case-study';
import { HomeContent } from '@/components/home-content';
import { getPublishedCaseStudies, getPublishedIdeas } from '@/lib/data';

// 데이터베이스 업데이트 시 즉각 반영을 위해 ISR 대신 적절한 재검증 주기 설정 (또는 실시간을 원하면 0)
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://profitsolo.net';

export default async function Home() {
  const [studies, ideas] = await Promise.all([
    getPublishedCaseStudies(),
    getPublishedIdeas(),
  ]);


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
      <HomeContent initialStudies={studies} initialIdeas={ideas} />
    </>
  );
}

import { Metadata } from 'next';
import { IdeasContent } from '@/components/ideas-content';
import { getPublishedIdeas } from '@/lib/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '아이디어모음 | Startup Radar',
  description:
    '수익화 아이디어, 마케팅 전략, 자동화 노하우를 모았습니다. 1인 창업자를 위한 실전 가이드.',
  openGraph: {
    title: '아이디어모음 | Startup Radar',
    description: '수익화 아이디어, 마케팅 전략, 자동화 노하우를 모았습니다.',
    type: 'website',
  },
};

export default async function IdeasPage() {
  const ideas = await getPublishedIdeas();

  return <IdeasContent ideas={ideas} />;
}

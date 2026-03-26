import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { CaseStudy } from '@/types/case-study';
import { CaseDetailContent } from '@/components/case-detail-content';
import { CaseDetailNav } from '@/components/case-detail-nav';
import { getCaseStudyById, getPublishedCaseStudies } from '@/lib/data';

// 데이터베이스 업데이트 시 즉각 반영을 위해 재검증 주기 설정
export const revalidate = 60; 

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getStudy(id: string): Promise<CaseStudy | null> {
  return await getCaseStudyById(id);
}

// 빌드 시 모든 케이스 페이지를 미리 생성 (SSG + ISR)
export async function generateStaticParams() {
  const studies = await getPublishedCaseStudies();
  return studies.map((s) => ({ id: s.id }));
}


export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const study = await getStudy(id);

  if (!study || study.published === false) {
    return { title: '페이지를 찾을 수 없습니다' };
  }

  const title = study.seo?.metaTitle || study.title;
  const description = study.seo?.metaDescription || `${study.byline} | ${study.mrr} | ${study.tags.join(', ')} — ${study.title}`;
  const ogImage = study.seo?.ogImage || study.thumbnailImage;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `/case/${id}`,
    },
  };
}

export default async function CaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const study = await getStudy(id);

  if (!study || study.published === false) {
    notFound();
  }

  // JSON-LD structured data
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://profitsolo.net';
  const thumb = study.thumbnailImage || '/og-default.png';
  const absImage = thumb.startsWith('http') ? thumb : `${SITE_URL}${thumb}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: study.seo?.metaTitle || study.title,
    description: study.seo?.metaDescription || `${study.byline} | ${study.mrr}`,
    image: absImage,
    author: {
      '@type': 'Organization',
      name: '스타트업 레이더',
    },
    publisher: {
      '@type': 'Organization',
      name: '스타트업 레이더',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.ico`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/case/${id}`,
    },
    datePublished: new Date().toISOString().split('T')[0],
    dateModified: new Date().toISOString().split('T')[0],
  };

  return (
    <div className="min-h-screen bg-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation */}
      <CaseDetailNav study={study} />

      {/* Hero Section */}
      <div className="relative">
        <div className="relative h-[280px] w-full overflow-hidden sm:h-[400px]">
          <Image
            src={study.thumbnailImage || '/og-default.png'}
            alt={study.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 sm:px-6 sm:pb-12 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <div className="mb-2 flex flex-wrap gap-1.5 sm:mb-4 sm:gap-2">
                {study.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:mb-4 sm:text-4xl md:text-5xl">
                {study.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700 sm:gap-4 sm:text-base">
                <span className="text-lg font-bold text-orange-600 sm:text-2xl">{study.mrr}</span>
                <span className="text-slate-300">|</span>
                <span>{study.byline}</span>
                <span className="text-slate-300">|</span>
                <span>{study.launchDate} 시작</span>
                {study.url && (() => {
                  const fullUrl = study.url.startsWith('http') ? study.url : `https://${study.url}`;
                  let hostname = study.url;
                  try { hostname = new URL(fullUrl).hostname.replace('www.', ''); } catch {}
                  return (
                    <>
                      <span className="text-slate-300">|</span>
                      <a
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-600 transition-colors hover:text-blue-800"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                        </svg>
                        {hostname}
                      </a>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-16 lg:px-8">
        <CaseDetailContent study={study} />
      </div>
    </div>
  );
}

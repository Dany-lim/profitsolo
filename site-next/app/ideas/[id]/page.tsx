import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { CaseStudy } from '@/types/case-study';
import { getCaseStudyById, getPublishedIdeas } from '@/lib/data';
import ReactMarkdown from 'react-markdown';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getIdea(id: string): Promise<CaseStudy | null> {
  return await getCaseStudyById(id);
}

export async function generateStaticParams() {
  const ideas = await getPublishedIdeas();
  return ideas.map((idea) => ({ id: idea.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const idea = await getIdea(id);

  if (!idea || idea.published === false) {
    return { title: '페이지를 찾을 수 없습니다' };
  }

  const title = idea.seo?.metaTitle || idea.title;
  const description =
    idea.seo?.metaDescription ||
    idea.content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .substring(0, 160);

  return {
    title: `${title} | Startup Radar`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
    alternates: {
      canonical: `/ideas/${id}`,
    },
  };
}

export default async function IdeaDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { preview } = await searchParams;
  const idea = await getIdea(id);
  const isPreview = preview === 'true';

  if (!idea || (!isPreview && idea.published === false)) {
    notFound();
  }

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://profitsolo.net';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: idea.seo?.metaTitle || idea.title,
    description:
      idea.seo?.metaDescription ||
      idea.content.replace(/#{1,6}\s/g, '').substring(0, 160),
    author: {
      '@type': 'Organization',
      name: '스타트업 레이더',
    },
    publisher: {
      '@type': 'Organization',
      name: '스타트업 레이더',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/ideas/${id}`,
    },
    datePublished: new Date().toISOString().split('T')[0],
    dateModified: new Date().toISOString().split('T')[0],
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Preview Banner */}
      {isPreview && (
        <div className="sticky top-0 z-50 bg-orange-500 px-4 py-2 text-center text-sm font-medium text-white">
          미리보기 모드 — 이 글은 아직 발행되지 않았습니다
        </div>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link
              href="/ideas"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-blue-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              아이디어모음
            </Link>
            <Link href="/">
              <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-lg font-bold text-transparent">
                Startup Radar
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Article */}
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        {/* Tags */}
        {idea.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {idea.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="mb-8 text-2xl font-bold leading-tight text-slate-900 sm:text-4xl">
          {idea.title}
        </h1>

        {/* Content */}
        <div
          className="prose prose-base prose-slate max-w-none sm:prose-lg
            prose-headings:font-bold
            prose-h2:text-xl prose-h2:text-blue-600 sm:prose-h2:text-2xl
            prose-h3:text-lg prose-h3:text-blue-500 sm:prose-h3:text-xl
            prose-p:text-slate-700 prose-p:leading-relaxed
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:font-semibold prose-strong:text-orange-600
            prose-blockquote:border-l-orange-500 prose-blockquote:bg-orange-50 prose-blockquote:py-2 prose-blockquote:not-italic"
        >
          <ReactMarkdown
            components={{
              a: ({ href, children, ...props }) => {
                const isExternal =
                  href &&
                  (href.startsWith('http://') || href.startsWith('https://'));
                if (isExternal) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                }
                return (
                  <a href={href} {...props}>
                    {children}
                  </a>
                );
              },
            }}
          >
            {idea.content}
          </ReactMarkdown>
        </div>

        {/* Source link */}
        {idea.sourceUrl && (
          <div className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <span className="font-medium">출처:</span>{' '}
            <a
              href={idea.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {idea.sourceTitle || idea.sourceUrl}
            </a>
          </div>
        )}
      </article>

      {/* Back to list */}
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
        <Link
          href="/ideas"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          다른 아이디어 보기
        </Link>
      </div>
    </div>
  );
}

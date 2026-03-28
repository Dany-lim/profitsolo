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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Preview Banner */}
      {isPreview && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-center text-sm font-medium text-white shadow-sm">
          미리보기 모드 — 이 글은 아직 발행되지 않았습니다
        </div>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link
              href="/ideas"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-blue-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
      <article className="mx-auto max-w-3xl px-4 pt-8 pb-6 sm:px-6 sm:pt-14 sm:pb-10 lg:px-8">
        {/* Tags */}
        {idea.tags.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {idea.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-blue-50 px-3.5 py-1 text-xs font-semibold tracking-wide text-blue-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="mb-10 text-2xl font-extrabold leading-snug tracking-tight text-slate-900 sm:text-4xl sm:leading-tight">
          {idea.title}
        </h1>

        {/* Content */}
        <div
          className="prose prose-base prose-slate max-w-none sm:prose-lg
            prose-headings:font-extrabold prose-headings:tracking-tight
            prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-xl prose-h2:text-slate-900 sm:prose-h2:text-2xl
            prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-lg prose-h3:text-slate-800 sm:prose-h3:text-xl
            prose-p:text-slate-600 prose-p:leading-[1.8]
            prose-a:text-blue-600 prose-a:underline prose-a:decoration-blue-200 prose-a:underline-offset-2 hover:prose-a:decoration-blue-500
            prose-strong:font-semibold prose-strong:text-slate-900
            prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50/50 prose-blockquote:py-1 prose-blockquote:not-italic prose-blockquote:text-slate-600
            prose-li:text-slate-600 prose-li:marker:text-blue-400"
        >
          <ReactMarkdown
            components={{
              a: ({ href, children }) => {
                const isExternal =
                  href &&
                  (href.startsWith('http://') || href.startsWith('https://'));
                if (isExternal) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  );
                }
                return (
                  <a href={href}>
                    {children}
                  </a>
                );
              },
            }}
          >
            {idea.content}
          </ReactMarkdown>
        </div>

        {/* Product Preview */}
        {(idea.productPreview?.steps?.length ?? 0) > 0 && idea.productPreview && (
          <section className="mt-12 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl">
            <div className="p-6 sm:p-8">
              {idea.productPreview.localImage && (
                <div className="mb-6 flex justify-center">
                  <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10">
                    <img
                      src={idea.productPreview.localImage}
                      alt={idea.productPreview.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white sm:text-xl">
                  {idea.productPreview.title}
                </h2>
              </div>
              <div className="space-y-3">
                {idea.productPreview.steps.map((step: any, index: number) => (
                  <div key={index} className="flex gap-4 rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-slate-900">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="mb-0.5 text-sm font-semibold text-amber-300">
                        {step.label}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-400">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Source link */}
        {idea.sourceUrl && (
          <div className="mt-10 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
            <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.686-5.747 4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757" />
            </svg>
            <span>
              <span className="font-medium text-slate-600">출처:</span>{' '}
              <a
                href={idea.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-500"
              >
                {idea.sourceTitle || idea.sourceUrl}
              </a>
            </span>
          </div>
        )}
      </article>

      {/* Back to list */}
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
        <Link
          href="/ideas"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-blue-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          다른 아이디어 보기
        </Link>
      </div>
    </div>
  );
}

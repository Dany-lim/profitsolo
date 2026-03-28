'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CaseStudy } from '@/types/case-study';

interface IdeasContentProps {
  ideas: CaseStudy[];
}

export function IdeasContent({ ideas }: IdeasContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredIdeas = useMemo(() => {
    if (!searchQuery) return ideas;
    const q = searchQuery.toLowerCase();
    return ideas.filter(
      (idea) =>
        idea.title.toLowerCase().includes(q) ||
        idea.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [ideas, searchQuery]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 md:grid md:grid-cols-3">
            <div className="hidden gap-6 md:flex">
              <Link
                href="/"
                className="text-sm font-medium text-slate-700 transition-colors hover:text-blue-600"
              >
                케이스 스터디
              </Link>
              <Link
                href="/ideas"
                className="text-sm font-medium text-blue-600"
              >
                아이디어모음
              </Link>
              <Link
                href="/projects"
                className="text-sm font-medium text-slate-700 transition-colors hover:text-blue-600"
              >
                우리가 만든 것들
              </Link>
            </div>

            <div className="text-center md:col-start-2">
              <Link href="/">
                <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
                  Startup Radar
                </span>
              </Link>
            </div>

            <div className="hidden items-center justify-end md:flex">
              <Link
                href="#newsletter"
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                뉴스레터 구독
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="border-t border-slate-200 py-4 md:hidden">
              <div className="flex flex-col gap-3">
                <Link href="/" className="text-sm font-medium text-slate-700">케이스 스터디</Link>
                <Link href="/ideas" className="text-sm font-medium text-blue-600">아이디어모음</Link>
                <Link href="/projects" className="text-sm font-medium text-slate-700">우리가 만든 것들</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-3xl font-bold text-slate-900 sm:text-5xl">
            아이디어모음
          </h1>
          <p className="mb-8 text-base text-slate-600 sm:text-lg">
            수익화 아이디어, 마케팅 전략, 자동화 노하우를 모았습니다
          </p>

          {/* Search */}
          <div className="mx-auto max-w-xl">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="아이디어 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ideas Grid */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        {filteredIdeas.length === 0 ? (
          <p className="text-center text-slate-500">
            {searchQuery ? '검색 결과가 없습니다.' : '아직 게시된 아이디어가 없습니다.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredIdeas.map((idea, index) => (
              <Link key={idea.id} href={`/ideas/${idea.id}`}>
                <article
                  className="animate-fade-in-up group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-200 hover:shadow-lg"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  {/* Thumbnail */}
                  {idea.thumbnailImage ? (
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                      <Image
                        src={idea.thumbnailImage}
                        alt={idea.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
                      <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                      </svg>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    {/* Tags */}
                    {idea.tags.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {idea.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600 sm:text-lg">
                      {idea.title}
                    </h2>

                    {/* Content Preview */}
                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                      {idea.content
                        .replace(/#{1,6}\s/g, '')
                        .replace(/\*\*/g, '')
                        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                        .substring(0, 120)}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 sm:px-6">
        <Link href="/admin" className="text-slate-400 transition-colors hover:text-slate-600">Startup Radar</Link>
        <span> - 1인 창업의 모든 것</span>
      </footer>
    </div>
  );
}

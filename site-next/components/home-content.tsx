'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CaseStudy } from '@/types/case-study';
import { CaseStudyCard } from '@/components/case-study-card';

interface HomeContentProps {
  initialStudies: CaseStudy[];
  initialIdeas: CaseStudy[];
}

export function HomeContent({ initialStudies, initialIdeas }: HomeContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Extract unique tags from all case studies
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    initialStudies.forEach((study) => {
      study.tags.forEach((tag) => tagSet.add(tag));
    });
    return ['All', ...Array.from(tagSet).sort()];
  }, [initialStudies]);

  // Filter studies based on search and tag
  const filteredStudies = useMemo(() => {
    return initialStudies.filter((study) => {
      const matchesSearch =
        searchQuery === '' ||
        study.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        study.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesTag =
        activeTag === 'All' || study.tags.includes(activeTag);

      return matchesSearch && matchesTag;
    });
  }, [initialStudies, searchQuery, activeTag]);

  return (
    <div className="min-h-screen bg-white">
      {/* Magazine-style Sticky Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 md:grid md:grid-cols-3">
            {/* Left Navigation (desktop only) */}
            <div className="hidden gap-6 md:flex">
              <Link
                href="#about"
                className="text-sm font-medium text-slate-700 transition-colors hover:text-blue-600"
              >
                사이트 소개
              </Link>
              <Link
                href="/"
                className="text-sm font-medium text-slate-700 transition-colors hover:text-blue-600"
              >
                케이스 스터디
              </Link>
              <Link
                href="/ideas"
                className="text-sm font-medium text-slate-700 transition-colors hover:text-blue-600"
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

            {/* Center Logo */}
            <div className="text-center md:col-start-2">
              <Link href="/">
                <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
                  Startup Radar
                </span>
              </Link>
            </div>

            {/* Right Navigation (desktop only) */}
            <div className="hidden justify-end gap-6 md:flex">
              <Link
                href="#join"
                className="text-sm font-medium text-slate-700 transition-colors hover:text-blue-600"
              >
                레이더망 합류하기
              </Link>
            </div>

            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
              aria-label="메뉴 열기"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="border-t border-slate-100 pb-4 md:hidden">
              <div className="flex flex-col gap-1 pt-2">
                <Link
                  href="#about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  사이트 소개
                </Link>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  케이스 스터디
                </Link>
                <Link
                  href="/ideas"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  아이디어모음
                </Link>
                <Link
                  href="/projects"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  우리가 만든 것들
                </Link>
                <Link
                  href="#join"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  레이더망 합류하기
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <div className="animate-hero text-center">
            <h1 className="mb-6 text-3xl font-bold leading-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
              세상의 모든 아이디어,
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                세상을 바꾸다
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-base text-slate-600 sm:mb-12 sm:text-xl">
              광고비 0원, 100% 자동화, 압도적 이익률.
              <br />
              월 1,000만 원 이상을 벌어들이는 전 세계 숨겨진 알짜 비즈니스를 치밀하게 분석합니다.
            </p>

            {/* Search Bar */}
            <div className="mx-auto mb-8 max-w-2xl">
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="케이스 스터디 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white py-3 pl-12 pr-6 text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:py-4"
                />
              </div>
            </div>

            {/* Tag Filters */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition-all sm:px-6 sm:text-sm ${
                    activeTag === tag
                      ? 'border-orange-500 bg-orange-500 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-slate-600">
            {filteredStudies.length}개의 케이스 스터디
          </p>
        </div>

        {filteredStudies.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStudies.map((study, index) => (
              <CaseStudyCard key={study.id} study={study} index={index} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-slate-500">
              검색 결과가 없습니다. 다른 키워드로 시도해보세요.
            </p>
          </div>
        )}
      </section>

      {/* Ideas Section */}
      {initialIdeas.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">아이디어 모음</h2>
                <p className="mt-1 text-slate-600">{initialIdeas.length}개의 아이디어</p>
              </div>
              <Link
                href="/ideas"
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
              >
                전체 보기 →
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {initialIdeas.slice(0, 8).map((idea, index) => (
                <Link key={idea.id} href={`/ideas/${idea.id}`}>
                  <article
                    className="animate-fade-in-up group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-200 hover:shadow-lg"
                    style={{ animationDelay: `${index * 0.06}s` }}
                  >
                    {idea.thumbnailImage ? (
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                        <Image
                          src={idea.thumbnailImage}
                          alt={idea.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
                      <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600 sm:text-lg">
                        {idea.title}
                      </h3>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      <section id="about" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <div className="animate-fade-in-up space-y-8 sm:space-y-12">
            {/* Main Title */}
            <div className="text-center">
              <h2 className="mb-4 text-2xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
                위대한 아이디어는 하늘에서 떨어지지 않습니다
              </h2>
              <p className="text-base font-semibold text-blue-600 sm:text-xl">
                우리가 세상을 바꾸는 아이디어를 추적하는 이유
              </p>
            </div>

            {/* Content Box 1 */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-8 md:p-12">
              <div className="space-y-4 text-base leading-relaxed text-slate-700 sm:space-y-6 sm:text-lg">
                <p>
                  우리는 오랫동안 거대한 착각 속에 살아왔습니다. '창업'이라고 하면 으레 번듯한 사무실을 빌리고, 수십억 원의 투자금을 유치하며, 수십 명의 직원을 먹여 살리는 뼈깎는 고통의 길이라고 배워왔기 때문입니다.
                </p>
                <p>
                  하지만 세상의 이면에는 완전히 다른 규칙으로 돌아가는 은밀하고 거대한 시장이 존재합니다. 바로 노트북 한 대, AI 툴 하나만을 가지고 방구석에서 조용히 월 수천만 원의 자동화 수익을 꽂아 넣는 <span className="font-semibold text-orange-600">'1인 기업가(Solo-founder)'</span>들의 세계입니다.
                </p>
                <p>
                  저희 <span className="font-semibold text-blue-600">Startup Radar</span>가 이 사이트를 개설하고 전 세계에 숨겨진 1인 창업가들의 사례를 집요하게 추적하는 이유는 단 하나입니다. 바로 그들의 <span className="font-semibold">'작고 단단한 성공 방식'</span>이 우리 모두에게 가장 현실적인 경제적 자유를 가져다줄 유일한 열쇠라고 믿기 때문입니다.
                </p>
              </div>
            </div>

            {/* Content Box 2 */}
            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-8 sm:p-12">
              <h3 className="mb-6 text-2xl font-bold text-orange-600">
                발견하고, 연결하고, 즉각 실행하라
              </h3>
              <div className="space-y-6 text-lg leading-relaxed text-slate-700">
                <p>
                  1인 창업은 세상을 바꿀 거창하고 거대한 혁신을 만들어내는 프로젝트가 아닙니다. 1인 창업의 본질은 무언가 일상에서 불편함을 느꼈거나 번뜩이는 아이디어가 생각났을 때, 완벽을 기하느라 1년을 허비하는 대신 <span className="font-semibold text-orange-600">'오늘 당장 조잡하더라도 만들어보는 즉각적인 실행력'</span>에 있습니다.
                </p>
                <p>
                  하지만, 그 '번뜩이는 아이디어'조차 백지상태에서는 절대 나오지 않습니다. 천재적인 영감은 하늘에서 뚝 떨어지는 것이 아니라, 이미 시장에서 돈을 벌고 있는 수많은 남들의 <span className="font-semibold">'작은 성공 사례(Case Studies)'</span>들을 끊임없이 관찰하고 훔쳐보는 과정에서 비로소 이리저리 연결되며 탄생합니다.
                </p>
                <p className="font-semibold text-blue-600">
                  당신이 더 많은 비즈니스 모델을 둘러볼수록, 당신의 뇌는 새로운 시장에 적용할 수 있는 마법 같은 연결고리를 뿜어내게 될 것입니다.
                </p>
              </div>
            </div>

            {/* Content Box 3 */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-orange-50 p-8 sm:p-12">
              <h3 className="mb-6 text-2xl font-bold text-blue-600">
                누구를 위한 레이더망인가요?
              </h3>
              <div className="space-y-6 text-lg leading-relaxed text-slate-700">
                <p>
                  이곳은 지긋지긋한 회사 로직에서 벗어나 나만의 비즈니스를 갖고 싶은 예비 창업가, 코딩은 알지만 무엇을 만들어야 돈이 되는지 모르는 개발자, 해외의 트렌드를 낚아채 한국 시장을 선점하고 싶은 기획자를 위한 <span className="font-semibold text-orange-600">'아이디어 무기고'</span>입니다.
                </p>
                <p>
                  수백 개의 해외 블로그를 뒤질 필요가 없습니다. 영감이 스친 바로 그 순간, 책상을 박차고 일어나 즉각적으로 <span className="font-semibold text-blue-600">실행(Execute)</span> 하십시오.
                </p>
                <p className="text-xl font-bold text-orange-600">
                  바로 지금 여러분이 스크롤을 내릴 이 페이지에 당신의 첫 아이디어가 숨어 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <Link href="/admin" className="text-sm text-slate-400 transition-colors hover:text-slate-600">
              © 2026 Startup Radar
            </Link>
            <span className="text-sm text-slate-500">. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { projects } from '@/lib/projects';

export function ProjectsContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Navigation — 동일 패턴 */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 md:grid md:grid-cols-3">
            <div className="hidden gap-6 md:flex">
              <Link href="/" className="text-sm font-medium text-slate-700 transition-colors hover:text-blue-600">
                케이스 스터디
              </Link>
              <Link href="/projects" className="text-sm font-medium text-blue-600">
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

            <div className="hidden justify-end gap-6 md:flex">
              <Link href="/#about" className="text-sm font-medium text-slate-700 transition-colors hover:text-blue-600">
                사이트 소개
              </Link>
            </div>

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

          {mobileMenuOpen && (
            <div className="border-t border-slate-100 pb-4 md:hidden">
              <div className="flex flex-col gap-1 pt-2">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                  케이스 스터디
                </Link>
                <Link href="/projects" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-medium text-blue-600 transition-colors hover:bg-slate-50">
                  우리가 만든 것들
                </Link>
                <Link href="/#about" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                  사이트 소개
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <div className="text-center">
            <h1 className="mb-6 text-3xl font-bold leading-tight text-slate-900 sm:text-5xl md:text-6xl">
              아이디어를 읽고,
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                직접 만들었습니다
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-base text-slate-600 sm:text-xl">
              케이스 스터디에서 발견한 인사이트로
              <br />
              실제 서비스를 런칭하고 운영하고 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Project Cards */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="space-y-8 sm:space-y-12">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="grid md:grid-cols-2">
                {/* 좌: 스크린샷 */}
                <div className="relative flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 p-6 sm:p-10">
                  {project.screenshot ? (
                    <img
                      src={project.screenshot}
                      alt={project.name}
                      className="max-h-64 rounded-lg shadow-md transition-transform group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 sm:h-64">
                      <div className="text-center">
                        <div className="mb-2 text-4xl">
                          {project.category.includes('AI') ? '🤖' : project.category.includes('핀테크') ? '📈' : '🏨'}
                        </div>
                        <p className="text-sm font-medium text-slate-400">{project.name}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 우: 정보 */}
                <div className="flex flex-col justify-center p-6 sm:p-10">
                  {/* 카테고리 */}
                  <span className="mb-2 inline-block w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                    {project.category}
                  </span>

                  {/* 이름 & 태그라인 */}
                  <h2 className="mb-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                    {project.name}
                  </h2>
                  <p className="mb-4 text-base font-medium text-slate-500">
                    {project.tagline}
                  </p>

                  {/* 설명 */}
                  <p className="mb-6 text-sm leading-relaxed text-slate-600 sm:text-base">
                    {project.description}
                  </p>

                  {/* 지표 */}
                  <div className="mb-6 grid grid-cols-3 gap-3">
                    {project.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-lg bg-slate-50 p-3 text-center">
                        <div className="text-lg font-bold text-orange-600 sm:text-xl">
                          {metric.value}
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 sm:text-xs">
                          {metric.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 기술 스택 */}
                  <div className="mb-6 flex flex-wrap gap-1.5">
                    {project.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* 링크 */}
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                  >
                    사이트 방문
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-20 lg:px-8">
          <h2 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl">
            다음 아이디어를 찾고 계신가요?
          </h2>
          <p className="mb-8 text-slate-600">
            전 세계 1인 창업가들의 검증된 비즈니스 모델을 분석합니다.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-orange-500 px-8 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl"
          >
            케이스 스터디 보러가기
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-slate-500">
              © 2026 Startup Radar. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

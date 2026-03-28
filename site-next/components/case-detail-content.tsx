'use client';

import Image from 'next/image';
import { CaseStudy } from '@/types/case-study';
import ReactMarkdown from 'react-markdown';

interface CaseDetailContentProps {
  study: CaseStudy;
}

export function CaseDetailContent({ study }: CaseDetailContentProps) {
  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Metrics */}
      {study.metrics && study.metrics.length > 0 && (
        <section className="animate-fade-in-up grid gap-4 sm:gap-6 sm:grid-cols-3">
          {study.metrics.map((metric, index) => (
          <div
            key={metric.label}
            className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="mb-1 text-xs font-medium text-slate-500 sm:mb-2 sm:text-sm">
              {metric.label}
            </div>
            <div className="mb-2 text-2xl font-bold text-orange-600 sm:mb-3 sm:text-3xl">
              {metric.value}
            </div>
            <div className="text-sm text-slate-600">
              {metric.insight}
            </div>
          </div>
        ))}
        </section>
      )}

      {/* Executive Summary */}
      {study.executiveSummary && study.executiveSummary.length > 0 && (
        <section
        className="animate-fade-in-up rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-orange-50 p-5 sm:p-8"
        style={{ animationDelay: '0.3s' }}
      >
        <h2 className="mb-4 text-xl font-bold text-slate-900 sm:mb-6 sm:text-2xl">
          핵심 요약
        </h2>
        <ul className="space-y-4">
          {study.executiveSummary.map((item, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                {index + 1}
              </span>
              <span className="text-slate-700">
                {typeof item === 'string'
                  ? item
                  : typeof item === 'object' && item !== null
                    ? (item as any).content || (item as any).point || JSON.stringify(item)
                    : String(item)}
              </span>
            </li>
          ))}
        </ul>
        </section>
      )}

      {/* Product Preview */}
      {(study.productPreview?.steps?.length ?? 0) > 0 && study.productPreview && (
        <section
          className="animate-fade-in-up overflow-hidden rounded-2xl bg-slate-900 shadow-xl"
          style={{ animationDelay: '0.4s' }}
        >
          <div className="grid items-center md:grid-cols-2">
            {/* Left: Product Image */}
            {study.productPreview.localImage ? (
              <div className="relative flex items-center justify-center bg-slate-800/50 p-4 sm:p-8 md:p-12">
                <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl shadow-2xl">
                  <Image
                    src={study.productPreview.localImage}
                    alt={study.productPreview.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            ) : null}
            {/* Right: Features */}
            <div className="p-5 sm:p-8 md:p-12">
              <h2 className="mb-4 text-xl font-bold text-white sm:mb-8 sm:text-2xl">
                {study.productPreview.title}
              </h2>
              <div className="space-y-6">
                {study.productPreview.steps.map((step, index) => (
                  <div
                    key={index}
                    className="animate-fade-in-right flex gap-4"
                    style={{ animationDelay: `${0.5 + index * 0.15}s` }}
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-slate-900">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="mb-1 font-semibold text-amber-400">
                        {step.label}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-300">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Korean Market Strategy */}
      {study.kMarketStrategy && (
        <section
        className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        style={{ animationDelay: '0.5s' }}
      >
        <h2 className="mb-4 text-xl font-bold text-blue-600 sm:mb-6 sm:text-2xl">
          한국 시장 전략
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 font-semibold text-blue-600">
              왜 한국에서 먹힐까?
            </h3>
            <p className="text-slate-700">
              {study.kMarketStrategy.why}
            </p>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-blue-600">
              실제로 될까?
            </h3>
            <p className="text-slate-700">
              {study.kMarketStrategy.willItWork}
            </p>
          </div>
        </div>
        </section>
      )}

      {/* Main Content */}
      <article
        className="animate-fade-in-up prose prose-base prose-slate max-w-none sm:prose-lg
          prose-headings:font-bold
          prose-h2:text-xl prose-h2:text-blue-600 sm:prose-h2:text-3xl
          prose-h3:text-lg prose-h3:text-blue-500 sm:prose-h3:text-2xl
          prose-p:text-slate-700 prose-p:leading-relaxed
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:font-semibold prose-strong:text-orange-600
          prose-blockquote:border-l-orange-500 prose-blockquote:bg-orange-50 prose-blockquote:py-2 prose-blockquote:not-italic
          rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8"
        style={{ animationDelay: '0.6s' }}
      >
        <ReactMarkdown
          components={{
            a: ({ href, children, ...props }) => {
              const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
              if (isExternal) {
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                    {children}
                  </a>
                );
              }
              return <a href={href} {...props}>{children}</a>;
            },
          }}
        >{study.content}</ReactMarkdown>
      </article>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { CaseStudy } from '@/types/case-study';

interface CaseDetailNavProps {
  study: CaseStudy;
}

export function CaseDetailNav({ study }: CaseDetailNavProps) {
  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Index
          </Link>
          <Link
            href={`/admin/${study.id}`}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            ✍️ Edit Story
          </Link>
        </div>
      </div>
    </nav>
  );
}

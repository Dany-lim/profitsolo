'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CaseStudy } from '@/types/case-study';

interface CaseStudyCardProps {
  study: CaseStudy;
  index: number;
}

export function CaseStudyCard({ study, index }: CaseStudyCardProps) {
  return (
    <div
      className="animate-fade-in-up group transition-transform duration-300 hover:-translate-y-1"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <Link href={`/case/${study.id}`}>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={study.thumbnailImage || 'https://images.unsplash.com/photo-1542744094-24638eff58bb?auto=format&fit=crop&q=80&w=2670'}
              alt={study.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />

            {/* MRR Badge */}
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
              <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow-lg sm:px-4 sm:py-1.5 sm:text-sm">
                {study.mrr}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            {/* Tags */}
            <div className="mb-2 flex flex-wrap gap-1.5 sm:mb-3 sm:gap-2">
              {study.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h3 className="mb-2 line-clamp-2 text-base font-semibold text-slate-900 transition-colors group-hover:text-blue-600 sm:text-xl">
              {study.title}
            </h3>

            {/* Launch Date */}
            <p className="text-sm text-slate-500">
              {study.launchDate} 시작
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}

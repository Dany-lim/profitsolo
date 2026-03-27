'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CaseStudy } from '@/types/case-study';

interface AdminCaseListProps {
  initialStudies: CaseStudy[];
}

export function AdminCaseList({ initialStudies }: AdminCaseListProps) {
  const router = useRouter();
  const [studies, setStudies] = useState(initialStudies);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [enrichedModal, setEnrichedModal] = useState<{ title: string; content: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'case-study' | 'idea'>('all');

  const filteredStudies = studies.filter((study) => {
    if (filter === 'published' && study.published === false) return false;
    if (filter === 'draft' && study.published !== false) return false;
    if (categoryFilter === 'case-study' && study.category === 'idea') return false;
    if (categoryFilter === 'idea' && study.category !== 'idea') return false;
    return true;
  });

  const publishedCount = studies.filter(s => s.published !== false).length;
  const draftCount = studies.filter(s => s.published === false).length;
  const caseCount = studies.filter(s => s.category !== 'idea').length;
  const ideaCount = studies.filter(s => s.category === 'idea').length;

  const handleTogglePublish = async (id: string) => {
    setToggling(id);
    try {
      const res = await fetch('/api/toggle-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (data.success) {
        setStudies(prev =>
          prev.map(s => s.id === id ? { ...s, published: data.published } : s)
        );
      } else {
        alert(`상태 변경 실패: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('연결 에러가 발생했습니다.');
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 포스트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch('/api/delete-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (data.success) {
        setStudies(prev => prev.filter(s => s.id !== id));
      } else {
        alert(`삭제 실패: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('연결 에러가 발생했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex gap-2 rounded-lg bg-blue-50 p-1">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            categoryFilter === 'all'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          전체 ({studies.length})
        </button>
        <button
          onClick={() => setCategoryFilter('case-study')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            categoryFilter === 'case-study'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          케이스 ({caseCount})
        </button>
        <button
          onClick={() => setCategoryFilter('idea')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            categoryFilter === 'idea'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          아이디어 ({ideaCount})
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            filter === 'published'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          발행 ({publishedCount})
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            filter === 'draft'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          미발행 ({draftCount})
        </button>
      </div>

      {/* Study List */}
      <div className="grid gap-4">
        {filteredStudies.map((study) => (
          <div
            key={study.id}
            className={`flex items-center justify-between rounded-xl border p-6 shadow-sm transition-all hover:shadow-md ${
              study.published === false
                ? 'border-slate-300 bg-slate-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  study.published === false
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-green-100 text-green-600'
                }`}>
                  {study.published === false ? '미발행' : '발행'}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  study.category === 'idea'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {study.category === 'idea' ? '아이디어' : '케이스'}
                </span>
                <span className="text-xs font-mono text-slate-400">ID: {study.id}</span>
                {study.tags.map(tag => (
                  <span key={tag} className="scale-75 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{study.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{study.mrr} • {study.byline}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleTogglePublish(study.id)}
                disabled={toggling === study.id}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  toggling === study.id
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : study.published === false
                      ? 'border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                      : 'border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'
                }`}
              >
                {toggling === study.id
                  ? '변경 중...'
                  : study.published === false
                    ? '발행하기'
                    : '미발행'}
              </button>
              {study.enrichedContent && (
                <button
                  onClick={() => setEnrichedModal({ title: study.title, content: study.enrichedContent! })}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
                >
                  수집 정보
                </button>
              )}
              <a
                href={`/admin/${study.id}`}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                편집
              </a>
              <a
                href={`/${study.category === 'idea' ? 'ideas' : 'case'}/${study.id}?preview=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                미리보기
              </a>
              <button
                onClick={() => handleDelete(study.id, study.title)}
                disabled={deleting === study.id}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  deleting === study.id
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                {deleting === study.id ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Enriched Content Modal */}
      {enrichedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEnrichedModal(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">추가 수집 정보</h3>
                <p className="mt-0.5 text-sm text-slate-500">{enrichedModal.title}</p>
              </div>
              <button
                onClick={() => setEnrichedModal(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(80vh - 80px)' }}>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {enrichedModal.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { CaseStudy } from '@/types/case-study';
import { AdminCaseList } from '@/components/admin-case-list';
import { getAllCaseStudies } from '@/lib/data';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  const studies = await getAllCaseStudies();


  return (
    <div className="min-h-screen bg-slate-50 p-8 pt-24">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-end justify-between border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">스타트업 레이더 관리자</h1>
            <p className="mt-2 text-slate-500">주인장 에디션 리포트 제작 및 관리</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/generate"
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-700 hover:to-blue-600"
            >
              포스트 생성
            </Link>
            <Link
              href="/admin/new"
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              수동 추가
            </Link>
          </div>
        </header>

        <AdminCaseList initialStudies={studies} />
      </div>
    </div>
  );
}

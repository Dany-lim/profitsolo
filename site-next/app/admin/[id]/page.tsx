import { notFound } from 'next/navigation';
import { CaseStudy } from '@/types/case-study';
import { CaseEditorForm } from '@/components/case-editor-form';
import { getCaseStudyById } from '@/lib/data';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditPage({ params }: PageProps) {
  const { id } = await params;
  const study = await getCaseStudyById(id);


  if (!study) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <CaseEditorForm study={study} />
      </div>
    </div>
  );
}

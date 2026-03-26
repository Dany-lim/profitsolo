import { notFound } from 'next/navigation';
import { CaseStudy } from '@/types/case-study';
import { CaseEditorForm } from '@/components/case-editor-form';
import fs from 'fs/promises';
import path from 'path';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditPage({ params }: PageProps) {
  const { id } = await params;

  // Read JSON file at runtime (no caching)
  const filePath = path.join(process.cwd(), 'data', 'case-studies.json');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const studies = JSON.parse(fileContent) as CaseStudy[];

  const study = studies.find((s) => s.id === id);

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

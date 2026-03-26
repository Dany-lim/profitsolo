import { CaseStudy } from '@/types/case-study';
import { CaseEditorForm } from '@/components/case-editor-form';

export default function AdminNewPage() {
  // Create a new empty case study template
  const newStudy: CaseStudy = {
    id: `new-${Date.now()}`,
    title: '새 케이스 스터디',
    koreanTitle: '',
    byline: 'By Unknown',
    url: '',
    mrr: '월 0원',
    launchDate: new Date().getFullYear() + '년',
    thumbnailImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800',
    tags: [],
    content: '# 새 케이스 스터디\n\n여기에 내용을 작성하세요...',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <CaseEditorForm study={newStudy} isNew />
      </div>
    </div>
  );
}

import { NewCaseForm } from '@/components/new-case-form';

export default function AdminGeneratePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <NewCaseForm />
      </div>
    </div>
  );
}

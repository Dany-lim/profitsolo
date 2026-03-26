import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <h1 className="mb-2 text-6xl font-bold text-slate-900">404</h1>
      <p className="mb-8 text-lg text-slate-600">
        페이지를 찾을 수 없습니다.
      </p>
      <Link
        href="/"
        className="rounded-full bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}

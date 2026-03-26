'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Tab = 'url' | 'paste';

export function NewCaseForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('url');
  const [url, setUrl] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [enrichedContent, setEnrichedContent] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [enrichDone, setEnrichDone] = useState(false);

  const handleScrape = async () => {
    if (!url.trim()) {
      alert('URL을 입력해주세요.');
      return;
    }

    setIsScraping(true);
    setStatus('페이지 스크래핑 중...');
    setEnrichDone(false);
    setEnrichedContent('');
    setCompanyUrl('');

    try {
      const response = await fetch('/api/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setRawContent(data.content);
        setStatus(`스크래핑 완료 (${data.contentLength.toLocaleString()}자)`);
      } else {
        setStatus('');
        alert('스크래핑 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('');
      alert('스크래핑 중 오류가 발생했습니다.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleEnrich = async () => {
    if (!rawContent.trim() || rawContent.trim().length < 100) {
      alert('Raw content가 너무 짧습니다. 먼저 스크래핑하거나 텍스트를 입력해주세요.');
      return;
    }

    setIsEnriching(true);
    setStatus('추가 정보 조사 중... (웹사이트, SNS, 창업자 정보 등)');

    try {
      const response = await fetch('/api/enrich-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent: rawContent.trim(), companyUrl: companyUrl.trim() || undefined }),
      });

      const data = await response.json();

      if (data.success) {
        setEnrichedContent(data.enrichedSection);
        if (data.entities?.websiteUrl) {
          setCompanyUrl(data.entities.websiteUrl);
        }
        setEnrichDone(true);
        const websiteNote = data.websiteScraped ? '(웹사이트 스크래핑 포함)' : '(웹사이트 접근 불가)';
        setStatus(`추가 정보 조사 완료 ${websiteNote}`);
      } else {
        setStatus('');
        alert('추가 정보 조사 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('');
      alert('추가 정보 조사 중 오류가 발생했습니다.');
    } finally {
      setIsEnriching(false);
    }
  };

  const handleGenerate = async () => {
    if (!rawContent.trim() || rawContent.trim().length < 100) {
      alert('Raw content가 너무 짧습니다. 최소 100자 이상 필요합니다.');
      return;
    }

    setIsGenerating(true);
    setStatus('Gemini로 케이스 스터디 생성 중... (1~2분 소요)');

    try {
      const response = await fetch('/api/generate-case-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: rawContent.trim(),
          enrichedContent: enrichedContent.trim() || undefined,
          sourceUrl: url.trim() || undefined,
          companyUrl: companyUrl.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('');
        alert(`케이스 스터디가 생성되었습니다!\n\nID: ${data.caseStudy.id}\n제목: ${data.caseStudy.title}\n본문: ${data.stats.contentLength.toLocaleString()}자`);
        router.push('/admin');
        router.refresh();
      } else {
        setStatus('');
        alert('생성 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('');
      alert('케이스 스터디 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = isScraping || isEnriching || isGenerating;
  const hasRawContent = rawContent.trim().length >= 100;

  return (
    <div className="rounded-xl bg-white p-8 shadow-lg dark:bg-slate-800">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            새 케이스 스터디 생성
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            URL 스크래핑 또는 raw content로 케이스 스터디를 자동 생성합니다
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline" disabled={isLoading}>
            돌아가기
          </Button>
        </Link>
      </div>

      {/* Tab Switch */}
      <div className="mb-6 flex gap-2 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab('url')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'url'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          URL에서 가져오기
        </button>
        <button
          onClick={() => setActiveTab('paste')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'paste'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          직접 붙여넣기
        </button>
      </div>

      <div className="space-y-6">
        {/* URL Input */}
        {activeTab === 'url' && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Starter Story URL</Label>
            <div className="flex gap-3">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.starterstory.com/stories/..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleScrape}
                disabled={isLoading || !url.trim()}
              >
                {isScraping ? '스크래핑 중...' : '스크래핑'}
              </Button>
            </div>
          </div>
        )}

        {/* Raw Content */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              {activeTab === 'url' ? 'Raw Content (스크래핑 결과)' : 'Raw Content (직접 입력)'}
            </Label>
            {rawContent && (
              <span className="text-sm text-slate-500">
                {rawContent.length.toLocaleString()}자
              </span>
            )}
          </div>
          <textarea
            value={rawContent}
            onChange={(e) => {
              setRawContent(e.target.value);
              setEnrichDone(false);
              setEnrichedContent('');
              setCompanyUrl('');
            }}
            placeholder={
              activeTab === 'url'
                ? 'URL을 입력하고 스크래핑 버튼을 클릭하면 여기에 콘텐츠가 표시됩니다...'
                : 'Starter Story 등에서 복사한 원본 텍스트를 여기에 붙여넣으세요...'
            }
            disabled={isLoading}
            rows={16}
            className="w-full rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
          />
        </div>

        {/* Enrich Button */}
        {hasRawContent && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">추가 정보 자동 조사</p>
                <p className="mt-1 text-sm text-slate-500">
                  Raw content에서 회사/창업자 정보를 추출하고, 공식 웹사이트와 SNS를 자동 스크래핑합니다
                </p>
              </div>
              <Button
                onClick={handleEnrich}
                disabled={isLoading}
                variant={enrichDone ? 'outline' : 'default'}
                className={enrichDone ? 'border-green-300 text-green-700' : ''}
              >
                {isEnriching ? '조사 중...' : enrichDone ? '조사 완료' : '추가 정보 조사'}
              </Button>
            </div>
          </div>
        )}

        {/* Enriched Content Preview */}
        {enrichedContent && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold text-green-700">
                추가 온라인 자료 (자동 생성)
              </Label>
              <span className="text-sm text-slate-500">
                {enrichedContent.length.toLocaleString()}자
              </span>
            </div>
            <textarea
              value={enrichedContent}
              onChange={(e) => setEnrichedContent(e.target.value)}
              disabled={isLoading}
              rows={12}
              className="w-full rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-slate-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-green-50/50"
            />
          </div>
        )}

        {/* Company Website URL */}
        {hasRawContent && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">회사 웹사이트 URL</Label>
            <div className="flex gap-3">
              <Input
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                placeholder="https://www.example.com (자동 조사로 못 찾으면 직접 입력)"
                disabled={isLoading}
                className="flex-1"
              />
              {companyUrl && (
                <a
                  href={companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  확인
                </a>
              )}
            </div>
            <p className="text-xs text-slate-400">
              추가 정보 조사에서 자동 입력되지만, 잘못되었거나 비어있으면 직접 입력하세요
            </p>
          </div>
        )}

        {/* Status */}
        {status && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {status}
          </div>
        )}

        {/* Generate Button */}
        <div className="flex justify-end gap-3 border-t pt-6">
          <Link href="/admin/new">
            <Button variant="outline" disabled={isLoading}>
              수동으로 작성
            </Button>
          </Link>
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !hasRawContent}
            size="lg"
            className="gap-2"
          >
            {isGenerating ? (
              'AI로 생성 중...'
            ) : (
              'AI로 케이스 스터디 생성'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

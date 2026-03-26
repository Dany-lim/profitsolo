'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CaseStudy } from '@/types/case-study';

// Dynamic import for markdown editor to avoid SSR issues
const MarkdownEditor = dynamic(
  () => import('@uiw/react-markdown-editor').then((mod) => mod.default),
  { ssr: false }
);

interface CaseEditorFormProps {
  study: CaseStudy;
  isNew?: boolean;
}

export function CaseEditorForm({ study, isNew = false }: CaseEditorFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: study.title,
    launchDate: study.launchDate,
    mrr: study.mrr,
    thumbnailImage: study.thumbnailImage,
    content: study.content,
    tags: study.tags.join(', '),
    productPreviewImage: study.productPreview?.localImage || '',
    seoMetaTitle: study.seo?.metaTitle || '',
    seoMetaDescription: study.seo?.metaDescription || '',
    seoOgImage: study.seo?.ogImage || '',
    seoFocusKeyword: study.seo?.focusKeyword || '',
  });

  // SEO 체크리스트 분석
  const seoChecks = useMemo(() => {
    const keyword = formData.seoFocusKeyword.trim().toLowerCase();
    const metaTitle = formData.seoMetaTitle || formData.title;
    const metaDesc = formData.seoMetaDescription;
    const contentLen = formData.content.length;

    // 단어 단위 매칭: 키워드의 각 단어가 모두 포함되면 통과
    const keywordWords = keyword.split(/\s+/).filter(Boolean);
    const containsKeyword = (text: string) => {
      if (!keyword) return true;
      const lower = text.toLowerCase();
      // 정확한 문구 포함이면 바로 통과
      if (lower.includes(keyword)) return true;
      // 아니면 모든 단어가 개별적으로 포함되는지 체크
      return keywordWords.length > 0 && keywordWords.every(w => lower.includes(w));
    };

    return [
      {
        label: '메타 타이틀에 포커스 키워드 포함',
        pass: !keyword || containsKeyword(metaTitle),
        skip: !keyword,
      },
      {
        label: '메타 설명에 포커스 키워드 포함',
        pass: !keyword || containsKeyword(metaDesc),
        skip: !keyword,
      },
      {
        label: `메타 설명 길이 (${metaDesc.length}/160자, 최소 70자)`,
        pass: metaDesc.length >= 70 && metaDesc.length <= 160,
        skip: !metaDesc,
      },
      {
        label: `본문 길이 충분 (${contentLen.toLocaleString()}자, 최소 3,000자)`,
        pass: contentLen >= 3000,
        skip: false,
      },
      {
        label: '제목(H1)에 포커스 키워드 포함',
        pass: !keyword || containsKeyword(formData.title),
        skip: !keyword,
      },
    ];
  }, [formData.seoFocusKeyword, formData.seoMetaTitle, formData.seoMetaDescription, formData.title, formData.content]);

  // Generic image paste handler
  const createPasteHandler = useCallback((field: 'thumbnailImage' | 'productPreviewImage') => {
    return async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            const uploadData = new FormData();
            uploadData.append('file', file);

            try {
              const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: uploadData,
              });
              const data = await response.json();
              if (data.success) {
                setFormData((prev) => ({ ...prev, [field]: data.url }));
              } else {
                alert('이미지 업로드 실패');
              }
            } catch (error) {
              console.error('Upload error:', error);
              alert('이미지 업로드 중 오류가 발생했습니다.');
            }
          }
          return;
        }
      }
    };
  }, []);

  const handlePaste = createPasteHandler('thumbnailImage');
  const handleProductImagePaste = createPasteHandler('productPreviewImage');

  const handleImproveContent = async () => {
    if (!formData.content || formData.content.trim().length === 0) {
      alert('개선할 콘텐츠를 먼저 작성해주세요.');
      return;
    }

    setIsImproving(true);

    try {
      const response = await fetch('/api/improve-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: formData.content,
          title: formData.title,
          context: `MRR: ${formData.mrr}, 런칭: ${formData.launchDate}, 태그: ${formData.tags}`
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFormData({ ...formData, content: data.improvedContent });
        alert('콘텐츠가 개선되었습니다!');
      } else {
        alert('개선 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Improve error:', error);
      alert('콘텐츠 개선 중 오류가 발생했습니다.');
    } finally {
      setIsImproving(false);
    }
  };

  const handleGenerateSeo = async () => {
    if (!formData.content || formData.content.trim().length < 100) {
      alert('SEO를 생성하려면 본문이 최소 100자 이상 필요합니다.');
      return;
    }

    setIsGeneratingSeo(true);
    try {
      const response = await fetch('/api/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          tags: formData.tags,
          mrr: formData.mrr,
          byline: study.byline,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setFormData((prev) => ({
          ...prev,
          seoMetaTitle: data.seo.metaTitle || prev.seoMetaTitle,
          seoMetaDescription: data.seo.metaDescription || prev.seoMetaDescription,
          seoFocusKeyword: data.seo.focusKeyword || prev.seoFocusKeyword,
        }));
      } else {
        alert('SEO 생성 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Generate SEO error:', error);
      alert('SEO 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const seoData = {
        metaTitle: formData.seoMetaTitle || undefined,
        metaDescription: formData.seoMetaDescription || undefined,
        ogImage: formData.seoOgImage || undefined,
        focusKeyword: formData.seoFocusKeyword || undefined,
      };
      const hasSeo = Object.values(seoData).some(Boolean);

      const updatedStudy = {
        ...study,
        title: formData.title,
        launchDate: formData.launchDate,
        mrr: formData.mrr,
        thumbnailImage: formData.thumbnailImage,
        content: formData.content,
        tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        productPreview: study.productPreview ? {
          ...study.productPreview,
          localImage: formData.productPreviewImage || study.productPreview.localImage,
        } : undefined,
        seo: hasSeo ? seoData : undefined,
      };

      const response = await fetch('/api/save-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedStudy),
      });

      const data = await response.json();

      if (data.success) {
        alert(isNew ? '케이스가 생성되었습니다!' : '저장되었습니다!');
        router.push('/admin');
        router.refresh();
      } else {
        alert('저장 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-8 shadow-lg dark:bg-slate-800">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {isNew ? '새 케이스 스터디 추가' : '케이스 스터디 편집'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {isNew ? '새로운 케이스를 추가합니다' : `${study.id} 편집 중`}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin">
            <Button variant="outline" disabled={isLoading}>
              취소
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-base font-semibold">
            제목 *
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="케이스 스터디 제목"
            className="text-lg"
          />
        </div>

        {/* Launch Date & MRR */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="launchDate" className="text-base font-semibold">
              런칭 날짜
            </Label>
            <Input
              id="launchDate"
              value={formData.launchDate}
              onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })}
              placeholder="2014년"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mrr" className="text-base font-semibold">
              MRR
            </Label>
            <Input
              id="mrr"
              value={formData.mrr}
              onChange={(e) => setFormData({ ...formData, mrr: e.target.value })}
              placeholder="월 800만원"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label htmlFor="tags" className="text-base font-semibold">
            태그 (쉼표로 구분)
          </Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="블로그, 콘텐츠 크리에이터"
          />
        </div>

        {/* Thumbnail Image */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">썸네일 이미지</Label>
          <Input
            value={formData.thumbnailImage}
            onChange={(e) => setFormData({ ...formData, thumbnailImage: e.target.value })}
            onPaste={handlePaste}
            placeholder="이미지 URL을 입력하거나 붙여넣기 (Ctrl+V)"
          />
          {formData.thumbnailImage && (
            <div className="mt-4">
              <img
                src={formData.thumbnailImage}
                alt="Preview"
                className="max-w-md rounded-lg shadow-md"
              />
            </div>
          )}
        </div>

        {/* Product Preview Image */}
        {study.productPreview && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">제품 체험 이미지</Label>
            <p className="text-sm text-slate-500">
              스크린샷을 클립보드에서 붙여넣기 (Ctrl+V / Cmd+V) 하거나 URL을 입력하세요
            </p>
            <Input
              value={formData.productPreviewImage}
              onChange={(e) => setFormData({ ...formData, productPreviewImage: e.target.value })}
              onPaste={handleProductImagePaste}
              placeholder="이미지 URL 또는 스크린샷 붙여넣기"
            />
            {formData.productPreviewImage && (
              <div className="mt-4 overflow-hidden rounded-xl bg-slate-900 p-6">
                <img
                  src={formData.productPreviewImage}
                  alt="Product Preview"
                  className="mx-auto max-h-64 rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
        )}

        {/* Markdown Content */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">본문 (마크다운) *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImproveContent}
              disabled={isImproving || isLoading || !formData.content}
              className="gap-2"
            >
              {isImproving ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  AI로 개선 중...
                </>
              ) : (
                <>
                  ✨ AI로 콘텐츠 개선
                </>
              )}
            </Button>
          </div>
          <div className="border-2 rounded-lg overflow-hidden text-lg" data-color-mode="light">
            <MarkdownEditor
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              height="600px"
            />
          </div>
        </div>

        {/* SEO Settings */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setSeoOpen(!seoOpen)}
            className="flex w-full items-center justify-between rounded-xl px-6 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </span>
              <span className="text-base font-semibold text-slate-900 dark:text-slate-50">SEO 설정</span>
              {formData.seoFocusKeyword && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                  {seoChecks.filter(c => !c.skip && c.pass).length}/{seoChecks.filter(c => !c.skip).length} 통과
                </span>
              )}
            </div>
            <svg className={`h-5 w-5 text-slate-400 transition-transform ${seoOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {seoOpen && (
            <div className="space-y-6 border-t border-slate-200 px-6 py-6 dark:border-slate-700">
              {/* AI Generate Button */}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSeo}
                  disabled={isGeneratingSeo || isLoading || !formData.content}
                  className="gap-2"
                >
                  {isGeneratingSeo ? (
                    <>
                      <span className="animate-spin">⚙️</span>
                      AI로 SEO 생성 중...
                    </>
                  ) : (
                    <>
                      ✨ AI로 SEO 자동 생성
                    </>
                  )}
                </Button>
              </div>

              {/* Google SERP Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-500">Google 검색 미리보기</Label>
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
                  <div className="text-xl leading-snug text-blue-700 dark:text-blue-400" style={{ fontFamily: 'arial, sans-serif' }}>
                    {(formData.seoMetaTitle || formData.title || '제목 없음').substring(0, 60)}
                    {formData.seoMetaTitle && formData.seoMetaTitle.length > 60 ? '...' : !formData.seoMetaTitle && formData.title.length > 60 ? '...' : ''} | 스타트업 레이더
                  </div>
                  <div className="mt-1 text-sm text-green-700 dark:text-green-400" style={{ fontFamily: 'arial, sans-serif' }}>
                    profitsolo.net &rsaquo; case &rsaquo; {study.id}
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400" style={{ fontFamily: 'arial, sans-serif' }}>
                    {(formData.seoMetaDescription || `${study.byline} | ${formData.mrr} | ${formData.tags} — ${formData.title}`).substring(0, 160)}
                    {(formData.seoMetaDescription || '').length > 160 ? '...' : ''}
                  </div>
                </div>
              </div>

              {/* Meta Title */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="seoMetaTitle" className="text-sm font-medium">메타 타이틀</Label>
                  <span className={`text-xs ${(formData.seoMetaTitle.length > 60) ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                    {formData.seoMetaTitle.length}/60자
                  </span>
                </div>
                <Input
                  id="seoMetaTitle"
                  value={formData.seoMetaTitle}
                  onChange={(e) => setFormData({ ...formData, seoMetaTitle: e.target.value })}
                  placeholder={formData.title || '비어있으면 포스트 제목 사용'}
                />
              </div>

              {/* Meta Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="seoMetaDescription" className="text-sm font-medium">메타 설명</Label>
                  <span className={`text-xs ${formData.seoMetaDescription.length > 160 ? 'text-red-500 font-semibold' : formData.seoMetaDescription.length > 0 && formData.seoMetaDescription.length < 70 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {formData.seoMetaDescription.length}/160자
                  </span>
                </div>
                <textarea
                  id="seoMetaDescription"
                  value={formData.seoMetaDescription}
                  onChange={(e) => setFormData({ ...formData, seoMetaDescription: e.target.value })}
                  placeholder="검색 결과에 표시될 설명 (70~160자 권장)"
                  rows={3}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                />
              </div>

              {/* Focus Keyword */}
              <div className="space-y-2">
                <Label htmlFor="seoFocusKeyword" className="text-sm font-medium">포커스 키워드</Label>
                <Input
                  id="seoFocusKeyword"
                  value={formData.seoFocusKeyword}
                  onChange={(e) => setFormData({ ...formData, seoFocusKeyword: e.target.value })}
                  placeholder="이 포스트의 핵심 검색 키워드 (예: 1인 창업, AI 자동화)"
                />
              </div>

              {/* OG Image */}
              <div className="space-y-2">
                <Label htmlFor="seoOgImage" className="text-sm font-medium">OG 이미지 (소셜 공유용)</Label>
                <Input
                  id="seoOgImage"
                  value={formData.seoOgImage}
                  onChange={(e) => setFormData({ ...formData, seoOgImage: e.target.value })}
                  placeholder="비어있으면 썸네일 이미지 사용"
                />
                {formData.seoOgImage && (
                  <img src={formData.seoOgImage} alt="OG Preview" className="mt-2 max-w-xs rounded-lg shadow-md" />
                )}
              </div>

              {/* SEO Checklist */}
              {formData.seoFocusKeyword && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-500">SEO 체크리스트</Label>
                  <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                    {seoChecks.filter(c => !c.skip).map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {check.pass ? (
                          <svg className="h-4 w-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                          </svg>
                        )}
                        <span className={check.pass ? 'text-slate-600 dark:text-slate-400' : 'text-amber-700 dark:text-amber-400'}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex justify-end gap-3 border-t pt-6">
        <Link href="/admin">
          <Button variant="outline" disabled={isLoading} size="lg">
            취소
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={isLoading} size="lg">
          {isLoading ? '저장 중...' : isNew ? '케이스 생성' : '변경사항 저장'}
        </Button>
      </div>
    </div>
  );
}

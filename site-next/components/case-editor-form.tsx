'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
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

interface ValidationReport {
  verdict: 'PASS' | 'REVISE' | 'REJECT';
  aiRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  redFlags: { name: string; severity: string; detail: string }[];
  greenFlags: { found: number; total: number; details: { name: string; pass: boolean; note: string }[] };
  bannedWords: { word: string; location: string }[];
  eeat: {
    score: number;
    experience: { pass: boolean; note: string };
    expertise: { pass: boolean; note: string };
    authoritativeness: { pass: boolean; note: string };
    trustworthiness: { pass: boolean; note: string };
  };
  fixes: string[];
  baronComment: string;
}

export function CaseEditorForm({ study, isNew = false }: CaseEditorFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [contentBackup, setContentBackup] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [preImproveReport, setPreImproveReport] = useState<ValidationReport | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [editorMode, setEditorMode] = useState<'editor' | 'text'>('editor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastValidatedContent, setLastValidatedContent] = useState<string>('');
  const [category, setCategory] = useState<'case-study' | 'idea'>(study.category || 'case-study');
  const isIdea = category === 'idea';
  const [formData, setFormData] = useState({
    title: study.title,
    launchDate: study.launchDate,
    mrr: study.mrr,
    thumbnailImage: study.thumbnailImage,
    content: study.content,
    url: study.url || '',
    sourceTitle: study.sourceTitle || '',
    sourceUrl: study.sourceUrl || '',
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

  // 이미지 압축: Canvas API로 리사이즈 + WebP 변환
  const compressImage = useCallback(async (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], `image-${Date.now()}.webp`, { type: 'image/webp' }));
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }, []);

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
            try {
              const compressed = await compressImage(file);
              const uploadData = new FormData();
              uploadData.append('file', compressed);

              const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: uploadData,
              });
              const data = await response.json();
              if (data.success) {
                setFormData((prev) => ({ ...prev, [field]: data.url }));
              } else {
                alert('이미지 업로드 실패: ' + (data.error || ''));
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
  }, [compressImage]);

  const handlePaste = createPasteHandler('thumbnailImage');
  const handleProductImagePaste = createPasteHandler('productPreviewImage');

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      if (editorMode === 'text' && textareaRef.current) {
        const ta = textareaRef.current;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const before = formData.content.substring(0, start);
        const after = formData.content.substring(end);
        const newContent = before + text + after;
        setFormData({ ...formData, content: newContent });
        requestAnimationFrame(() => {
          ta.focus();
          ta.selectionStart = ta.selectionEnd = start + text.length;
        });
      } else {
        setFormData({ ...formData, content: formData.content + '\n' + text });
      }
    } catch {
      alert('클립보드 접근 권한이 필요합니다. 브라우저 설정에서 허용해주세요.');
    }
  };

  const handleImproveContent = async () => {
    if (!formData.content || formData.content.trim().length === 0) {
      alert('개선할 콘텐츠를 먼저 작성해주세요.');
      return;
    }

    // 자동 백업: 개선 전 현재 콘텐츠 저장
    setContentBackup(formData.content);
    // 개선 전 바론 리포트 저장 (비교용)
    setPreImproveReport(validationReport);
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
          category,
          context: `MRR: ${formData.mrr}, 런칭: ${formData.launchDate}, 태그: ${formData.tags}`,
          sourceUrl: formData.sourceUrl || undefined,
          homepageUrl: formData.url || undefined,
          customInstruction: customInstruction.trim() || undefined,
          baronFeedback: validationReport ? {
            verdict: validationReport.verdict,
            fixes: validationReport.fixes,
            redFlags: validationReport.redFlags.map(f => `[${f.severity}] ${f.name}: ${f.detail}`),
            bannedWords: validationReport.bannedWords.map(bw => bw.word),
            baronComment: validationReport.baronComment,
          } : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const improvedContent = data.improvedContent;
        setFormData({ ...formData, content: improvedContent });
        setShowDiff(true);

        // 개선 후 자동으로 바론 재검증 실행
        setIsRevalidating(true);
        setIsImproving(false);
        try {
          const revalidateRes = await fetch('/api/validate-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: improvedContent,
              title: formData.title,
              category,
            }),
          });
          const revalidateData = await revalidateRes.json();
          if (revalidateData.success) {
            setValidationReport(revalidateData.report);
            setLastValidatedContent(improvedContent);
            setValidationOpen(true);
          }
        } catch (revalError) {
          console.error('Auto re-validation error:', revalError);
        } finally {
          setIsRevalidating(false);
        }
      } else {
        setContentBackup(null);
        setPreImproveReport(null);
        alert('개선 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Improve error:', error);
      setContentBackup(null);
      setPreImproveReport(null);
      alert('콘텐츠 개선 중 오류가 발생했습니다.');
    } finally {
      setIsImproving(false);
    }
  };

  const handleRollback = () => {
    if (contentBackup) {
      setFormData({ ...formData, content: contentBackup });
      // 바론 리포트도 개선 전 버전으로 복원
      if (preImproveReport) {
        setValidationReport(preImproveReport);
      }
      setContentBackup(null);
      setPreImproveReport(null);
      setShowDiff(false);
    }
  };

  const handleAcceptImprovement = () => {
    setContentBackup(null);
    setPreImproveReport(null);
    setShowDiff(false);
  };

  const handleReimprove = async () => {
    if (!validationReport || validationReport.verdict === 'PASS') return;

    // 현재 콘텐츠 기준으로 재개선 (백업은 최초 원본 유지)
    setPreImproveReport(validationReport);
    setIsImproving(true);

    try {
      const response = await fetch('/api/improve-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.content,
          title: formData.title,
          category,
          context: `MRR: ${formData.mrr}, 런칭: ${formData.launchDate}, 태그: ${formData.tags}`,
          sourceUrl: formData.sourceUrl || undefined,
          homepageUrl: formData.url || undefined,
          baronFeedback: {
            verdict: validationReport.verdict,
            fixes: validationReport.fixes,
            redFlags: validationReport.redFlags.map(f => `[${f.severity}] ${f.name}: ${f.detail}`),
            bannedWords: validationReport.bannedWords.map(bw => bw.word),
            baronComment: validationReport.baronComment,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        const improvedContent = data.improvedContent;
        setFormData({ ...formData, content: improvedContent });

        // 재개선 후 자동 바론 재검증
        setIsRevalidating(true);
        setIsImproving(false);
        try {
          const revalidateRes = await fetch('/api/validate-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: improvedContent,
              title: formData.title,
              category,
            }),
          });
          const revalidateData = await revalidateRes.json();
          if (revalidateData.success) {
            setValidationReport(revalidateData.report);
            setLastValidatedContent(improvedContent);
            setValidationOpen(true);
          }
        } catch (revalError) {
          console.error('Re-validation error:', revalError);
        } finally {
          setIsRevalidating(false);
        }
      } else {
        alert('재개선 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Reimprove error:', error);
      alert('재개선 중 오류가 발생했습니다.');
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

  const handleValidate = async () => {
    if (!formData.content || formData.content.trim().length < 100) {
      alert('검증하려면 본문이 최소 100자 이상 필요합니다.');
      return;
    }

    // 콘텐츠가 변경되지 않았고 이전 검증 결과가 있으면 캐시된 결과 표시
    if (validationReport && formData.content === lastValidatedContent) {
      setValidationOpen(true);
      return;
    }

    setIsValidating(true);
    setValidationReport(null);
    setValidationOpen(true);

    try {
      const response = await fetch('/api/validate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.content,
          title: formData.title,
          category,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setValidationReport(data.report);
        setLastValidatedContent(formData.content);
      } else {
        alert('검증 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Validate error:', error);
      alert('검증 중 오류가 발생했습니다.');
    } finally {
      setIsValidating(false);
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
        url: formData.url,
        sourceTitle: formData.sourceTitle,
        sourceUrl: formData.sourceUrl,
        thumbnailImage: formData.thumbnailImage,
        content: formData.content,
        tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        category,
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
            {isNew ? (isIdea ? '새 아이디어 추가' : '새 케이스 스터디 추가') : (isIdea ? '아이디어 편집' : '케이스 스터디 편집')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {isNew ? (isIdea ? '새로운 아이디어를 추가합니다' : '새로운 케이스를 추가합니다') : `${study.id} 편집 중`}
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
        {/* Category Selector */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">카테고리</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCategory('case-study')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                !isIdea
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              케이스 스터디
            </button>
            <button
              type="button"
              onClick={() => setCategory('idea')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isIdea
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              아이디어
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-base font-semibold">
            제목 *
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={isIdea ? '아이디어 제목' : '케이스 스터디 제목'}
            className="text-lg"
          />
        </div>

        {/* Launch Date & MRR (case-study only) */}
        {!isIdea && (
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
        )}

        {/* URL & Source */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="url" className="text-base font-semibold">
              홈페이지 주소
            </Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
        </div>

        {/* Source */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sourceTitle" className="text-base font-semibold">
              출처 제목
            </Label>
            <Input
              id="sourceTitle"
              value={formData.sourceTitle}
              onChange={(e) => setFormData({ ...formData, sourceTitle: e.target.value })}
              placeholder="Starter Story, IndieHackers 등"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceUrl" className="text-base font-semibold">
              출처 URL
            </Label>
            <Input
              id="sourceUrl"
              value={formData.sourceUrl}
              onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
              placeholder="https://starterstory.com/stories/..."
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
            <div className="flex items-center gap-2">
              {contentBackup && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDiff(!showDiff)}
                    className="gap-1.5 text-slate-600"
                  >
                    {showDiff ? '비교 닫기' : '전/후 비교'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRollback}
                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    되돌리기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptImprovement}
                    className="gap-1.5 border-green-200 text-green-600 hover:bg-green-50"
                  >
                    개선 확정
                  </Button>
                </>
              )}
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
                    <span className="animate-spin">&#9881;</span>
                    AI로 개선 중...
                  </>
                ) : (
                  'AI로 콘텐츠 개선'
                )}
              </Button>
            </div>
          </div>

          {/* AI 커스텀 지시 입력 */}
          <div className="flex gap-2">
            <Input
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="AI에게 추가 지시 (예: 톤을 더 캐주얼하게, 한국 시장 부분 보강 등)"
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && customInstruction.trim() && formData.content) {
                  e.preventDefault();
                  handleImproveContent();
                }
              }}
            />
          </div>

          {/* Diff 비교 패널 */}
          {showDiff && contentBackup && (
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-700">개선 전/후 비교</span>
                <div className="flex gap-2 text-xs text-slate-500">
                  <span>이전: {contentBackup.length.toLocaleString()}자</span>
                  <span>|</span>
                  <span>현재: {formData.content.length.toLocaleString()}자</span>
                  <span>|</span>
                  <span className={formData.content.length >= contentBackup.length ? 'text-green-600' : 'text-red-600'}>
                    {formData.content.length >= contentBackup.length ? '+' : ''}{(formData.content.length - contentBackup.length).toLocaleString()}자
                  </span>
                </div>
              </div>

              {/* Baron 재검증 결과 비교 */}
              {isRevalidating && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-slate-100">
                  <span className="animate-spin">&#9881;</span>
                  <span>바론이 개선된 콘텐츠를 재검증하고 있습니다...</span>
                </div>
              )}
              {!isRevalidating && validationReport && preImproveReport && (
                <div className="mb-3 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-2 text-xs font-bold text-slate-500">Baron 검증 비교 (개선 전 → 후)</div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {/* 판정 */}
                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                      <div className="text-[10px] font-medium text-slate-400">판정</div>
                      <div className="mt-1 flex items-center justify-center gap-1.5">
                        <span className={`text-sm font-black ${
                          preImproveReport.verdict === 'PASS' ? 'text-green-600' :
                          preImproveReport.verdict === 'REJECT' ? 'text-red-600' : 'text-amber-600'
                        }`}>{preImproveReport.verdict}</span>
                        <span className="text-slate-300">→</span>
                        <span className={`text-sm font-black ${
                          validationReport.verdict === 'PASS' ? 'text-green-600' :
                          validationReport.verdict === 'REJECT' ? 'text-red-600' : 'text-amber-600'
                        }`}>{validationReport.verdict}</span>
                      </div>
                    </div>
                    {/* AI 위험도 */}
                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                      <div className="text-[10px] font-medium text-slate-400">AI 위험도</div>
                      <div className="mt-1 flex items-center justify-center gap-1.5">
                        <span className={`text-sm font-black ${
                          preImproveReport.aiRisk === 'LOW' ? 'text-green-600' :
                          preImproveReport.aiRisk === 'CRITICAL' ? 'text-red-600' :
                          preImproveReport.aiRisk === 'HIGH' ? 'text-orange-600' : 'text-amber-600'
                        }`}>{preImproveReport.aiRisk}</span>
                        <span className="text-slate-300">→</span>
                        <span className={`text-sm font-black ${
                          validationReport.aiRisk === 'LOW' ? 'text-green-600' :
                          validationReport.aiRisk === 'CRITICAL' ? 'text-red-600' :
                          validationReport.aiRisk === 'HIGH' ? 'text-orange-600' : 'text-amber-600'
                        }`}>{validationReport.aiRisk}</span>
                      </div>
                    </div>
                    {/* E-E-A-T */}
                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                      <div className="text-[10px] font-medium text-slate-400">E-E-A-T</div>
                      <div className="mt-1 flex items-center justify-center gap-1.5">
                        <span className={`text-sm font-black ${
                          preImproveReport.eeat.score >= 8 ? 'text-green-600' :
                          preImproveReport.eeat.score >= 5 ? 'text-amber-600' : 'text-red-600'
                        }`}>{preImproveReport.eeat.score}/10</span>
                        <span className="text-slate-300">→</span>
                        <span className={`text-sm font-black ${
                          validationReport.eeat.score >= 8 ? 'text-green-600' :
                          validationReport.eeat.score >= 5 ? 'text-amber-600' : 'text-red-600'
                        }`}>{validationReport.eeat.score}/10</span>
                        {validationReport.eeat.score > preImproveReport.eeat.score && (
                          <span className="text-xs font-bold text-green-600">+{validationReport.eeat.score - preImproveReport.eeat.score}</span>
                        )}
                        {validationReport.eeat.score < preImproveReport.eeat.score && (
                          <span className="text-xs font-bold text-red-600">{validationReport.eeat.score - preImproveReport.eeat.score}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* 세부 변화 요약 */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>Red Flags:</span>
                      <span className="font-bold">{preImproveReport.redFlags.length}개 → {validationReport.redFlags.length}개</span>
                      {validationReport.redFlags.length < preImproveReport.redFlags.length && (
                        <span className="font-bold text-green-600">(-{preImproveReport.redFlags.length - validationReport.redFlags.length})</span>
                      )}
                      {validationReport.redFlags.length > preImproveReport.redFlags.length && (
                        <span className="font-bold text-red-600">(+{validationReport.redFlags.length - preImproveReport.redFlags.length})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>Green Flags:</span>
                      <span className="font-bold">{preImproveReport.greenFlags.found}개 → {validationReport.greenFlags.found}개</span>
                      {validationReport.greenFlags.found > preImproveReport.greenFlags.found && (
                        <span className="font-bold text-green-600">(+{validationReport.greenFlags.found - preImproveReport.greenFlags.found})</span>
                      )}
                      {validationReport.greenFlags.found < preImproveReport.greenFlags.found && (
                        <span className="font-bold text-red-600">({validationReport.greenFlags.found - preImproveReport.greenFlags.found})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>금지어:</span>
                      <span className="font-bold">{preImproveReport.bannedWords.length}개 → {validationReport.bannedWords.length}개</span>
                      {validationReport.bannedWords.length < preImproveReport.bannedWords.length && (
                        <span className="font-bold text-green-600">(-{preImproveReport.bannedWords.length - validationReport.bannedWords.length})</span>
                      )}
                      {validationReport.bannedWords.length > preImproveReport.bannedWords.length && (
                        <span className="font-bold text-red-600">(+{validationReport.bannedWords.length - preImproveReport.bannedWords.length})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>수정 지시:</span>
                      <span className="font-bold">{preImproveReport.fixes.length}개 → {validationReport.fixes.length}개</span>
                    </div>
                  </div>
                  {/* Baron 코멘트 */}
                  {validationReport.baronComment && (
                    <div className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100">
                      <span className="font-bold text-red-400">Baron:</span> &quot;{validationReport.baronComment}&quot;
                    </div>
                  )}
                  {/* PASS 아니면 재개선 버튼 */}
                  {validationReport.verdict !== 'PASS' && (
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <span className="text-xs text-amber-700">
                        바론 판정: <span className="font-bold">{validationReport.verdict}</span> — 피드백 반영해서 다시 개선할 수 있습니다
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleReimprove}
                        disabled={isImproving || isRevalidating}
                        className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
                      >
                        {isImproving ? (
                          <>
                            <span className="animate-spin">&#9881;</span>
                            재개선 중...
                          </>
                        ) : (
                          '바론 피드백 반영 재개선'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {!isRevalidating && validationReport && !preImproveReport && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  개선 전 바론 검증 데이터가 없어 비교할 수 없습니다. 다음번에는 개선 전에 바론 검증을 먼저 실행하세요.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1.5 text-xs font-bold text-red-600">이전 (개선 전)</div>
                  <div className="h-96 overflow-auto rounded-lg border border-red-200 bg-white p-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {contentBackup}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-xs font-bold text-green-600">현재 (개선 후)</div>
                  <div className="h-96 overflow-auto rounded-lg border border-green-200 bg-white p-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {formData.content}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRollback}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  되돌리기 (이전 버전 복원)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAcceptImprovement}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  개선 확정
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditorMode(editorMode === 'editor' ? 'text' : 'editor')}
            >
              {editorMode === 'editor' ? '텍스트 모드' : '에디터 모드'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClipboardPaste}
            >
              붙여넣기
            </Button>
          </div>
          {editorMode === 'editor' ? (
            <div className="border-2 rounded-lg overflow-hidden text-lg" data-color-mode="light">
              <MarkdownEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                height="600px"
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full rounded-lg border-2 border-slate-200 bg-white p-4 font-mono text-sm leading-relaxed text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={30}
              placeholder="마크다운 본문을 입력하세요. Ctrl+V로 원하는 위치에 붙여넣기 가능합니다."
            />
          )}
        </div>

        {/* Baron Validation */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setValidationOpen(!validationOpen)}
            className="flex w-full items-center justify-between rounded-xl px-6 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </span>
              <span className="text-base font-semibold text-slate-900 dark:text-slate-50">Baron 검증</span>
              {validationReport && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  validationReport.verdict === 'PASS'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : validationReport.verdict === 'REJECT'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                }`}>
                  {validationReport.verdict}
                </span>
              )}
            </div>
            <svg className={`h-5 w-5 text-slate-400 transition-transform ${validationOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {validationOpen && (
            <div className="space-y-5 border-t border-slate-200 px-6 py-6 dark:border-slate-700">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleValidate}
                  disabled={isValidating || isLoading || !formData.content}
                  className="gap-2 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                >
                  {isValidating ? (
                    <>
                      <span className="animate-spin">&#9881;</span>
                      Baron 검증 중...
                    </>
                  ) : (
                    <>
                      Baron 검증 실행
                    </>
                  )}
                </Button>
              </div>

              {isValidating && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="mb-3 text-2xl animate-pulse">&#128373;</div>
                    <p className="text-sm text-slate-500">바론이 콘텐츠를 검수하고 있습니다...</p>
                    <p className="text-xs text-slate-400 mt-1">&quot;AI 냄새가 나는지 한번 보자...&quot;</p>
                  </div>
                </div>
              )}

              {validationReport && !isValidating && (
                <div className="space-y-4">
                  {/* Baron Comment */}
                  <div className="rounded-lg bg-slate-900 p-4 text-sm text-slate-100 dark:bg-slate-950">
                    <div className="mb-1 text-xs font-bold text-red-400">Baron says:</div>
                    <p className="italic">&quot;{validationReport.baronComment}&quot;</p>
                  </div>

                  {/* Verdict + AI Risk */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-lg p-4 text-center ${
                      validationReport.verdict === 'PASS' ? 'bg-green-50 dark:bg-green-950' :
                      validationReport.verdict === 'REJECT' ? 'bg-red-50 dark:bg-red-950' :
                      'bg-amber-50 dark:bg-amber-950'
                    }`}>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">최종 판정</div>
                      <div className={`mt-1 text-2xl font-black ${
                        validationReport.verdict === 'PASS' ? 'text-green-600' :
                        validationReport.verdict === 'REJECT' ? 'text-red-600' :
                        'text-amber-600'
                      }`}>{validationReport.verdict}</div>
                    </div>
                    <div className={`rounded-lg p-4 text-center ${
                      validationReport.aiRisk === 'LOW' ? 'bg-green-50 dark:bg-green-950' :
                      validationReport.aiRisk === 'CRITICAL' ? 'bg-red-50 dark:bg-red-950' :
                      validationReport.aiRisk === 'HIGH' ? 'bg-orange-50 dark:bg-orange-950' :
                      'bg-amber-50 dark:bg-amber-950'
                    }`}>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">AI 탐지 위험도</div>
                      <div className={`mt-1 text-2xl font-black ${
                        validationReport.aiRisk === 'LOW' ? 'text-green-600' :
                        validationReport.aiRisk === 'CRITICAL' ? 'text-red-600' :
                        validationReport.aiRisk === 'HIGH' ? 'text-orange-600' :
                        'text-amber-600'
                      }`}>{validationReport.aiRisk}</div>
                    </div>
                  </div>

                  {/* E-E-A-T Score */}
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold">E-E-A-T 점수</span>
                      <span className={`text-lg font-black ${
                        validationReport.eeat.score >= 8 ? 'text-green-600' :
                        validationReport.eeat.score >= 5 ? 'text-amber-600' : 'text-red-600'
                      }`}>{validationReport.eeat.score}/10</span>
                    </div>
                    <div className="space-y-2">
                      {(['experience', 'expertise', 'authoritativeness', 'trustworthiness'] as const).map((key) => (
                        <div key={key} className="flex items-start gap-2 text-sm">
                          {validationReport.eeat[key].pass ? (
                            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          )}
                          <div>
                            <span className="font-medium capitalize">{key}</span>
                            <span className="ml-1 text-slate-500 dark:text-slate-400">— {validationReport.eeat[key].note}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Red Flags */}
                  {validationReport.redFlags.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                      <div className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
                        Red Flags ({validationReport.redFlags.length}개)
                      </div>
                      <div className="space-y-2">
                        {validationReport.redFlags.map((flag, i) => (
                          <div key={i} className="text-sm">
                            <span className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-xs font-bold ${
                              flag.severity === 'HIGH' ? 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                            }`}>{flag.severity}</span>
                            <span className="font-medium text-red-800 dark:text-red-300">{flag.name}</span>
                            <p className="mt-0.5 pl-1 text-red-600 dark:text-red-400">{flag.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Banned Words */}
                  {validationReport.bannedWords.length > 0 && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
                      <div className="mb-2 text-sm font-semibold text-orange-700 dark:text-orange-400">
                        AI 금지어 발견 ({validationReport.bannedWords.length}개)
                      </div>
                      <div className="space-y-1">
                        {validationReport.bannedWords.map((bw, i) => (
                          <div key={i} className="text-sm text-orange-700 dark:text-orange-300">
                            <span className="font-bold">&quot;{bw.word}&quot;</span>
                            <span className="text-orange-500"> — {bw.location}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Green Flags */}
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">Green Flags</span>
                      <span className={`text-sm font-bold ${
                        validationReport.greenFlags.found >= 5 ? 'text-green-600' :
                        validationReport.greenFlags.found >= 3 ? 'text-amber-600' : 'text-red-600'
                      }`}>{validationReport.greenFlags.found}/{validationReport.greenFlags.total}</span>
                    </div>
                    <div className="space-y-1">
                      {validationReport.greenFlags.details.map((gf, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {gf.pass ? (
                            <svg className="h-3.5 w-3.5 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          )}
                          <span className={gf.pass ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}>{gf.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fix Instructions */}
                  {validationReport.fixes.length > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                      <div className="mb-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
                        수정 지시사항
                      </div>
                      <ol className="list-decimal space-y-1.5 pl-4 text-sm text-blue-800 dark:text-blue-300">
                        {validationReport.fixes.map((fix, i) => (
                          <li key={i}>{fix}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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

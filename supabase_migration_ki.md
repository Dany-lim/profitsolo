# 💾 Profitsolo Supabase 마이그레이션 기술 명세서 (Memory)

이 문서는 Profitsolo 프로젝트가 JSON 기반에서 Supabase/PostgreSQL 기반으로 성공적으로 마이그레이션된 과정과 기술적 세부 사항을 기록한 지식 항목입니다.

## 1. 개요 (Overview)
- **목표**: 정적 JSON 파일(`case-studies.json`)에 의존하던 데이터 구조를 탈피하여, 실시간 관리와 확장성이 용이한 클라우드 데이터베이스(Supabase)로 전환.
- **주요 혜택**:
  - 로컬 스크래퍼/에이전트가 별도의 Git 커밋 없이 즉시 웹사이트 업데이트 가능.
  - Vercel 빌드 타임에만 데이터가 고정되던 제약 해소 (ISR/on-demand revalidation 가능).
  - 다중 사용자의 관리자 페이지 동시 접속 시 데이터 충돌 방지.

## 2. 환경 설정 (Configuration)
### 의존성 추가
- `@supabase/supabase-js`: JS 클라이언트 라이브러리.

### 환경 변수 (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`: 프로젝트 URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 공개 조회용 API 키.
- `SUPABASE_SERVICE_ROLE_KEY`: 관리자 전역 권한 키 (마이그레이션 및 Server Action용).

## 3. 데이터베이스 설계 (Schema)
### `case_studies` 테이블 (Public)
| Column Name | Type | Description |
|---|---|---|
| `id` | `text` | **Primary Key** (Slug 형태, 예: `casino-guru`) |
| `title` | `text` | 메인 한글 제목 |
| `korean_title` | `text` | 부제목/상황 묘사 |
| `byline` | `text` | 창업자 이름 |
| `url` | `text` | 원본 서비스/회사 URL |
| `mrr` | `text` | 월 매출 수치 (한화) |
| `launch_date` | `text` | 런칭 연도 |
| `thumbnail_image` | `text` | 메인 이미지 URL |
| `tags` | `jsonb` | 태그 배열 |
| `metrics` | `jsonb` | 핵심 지표 객체 배열 |
| `executive_summary`| `jsonb` | 요약 필드 배열 |
| `product_preview` | `jsonb` | 제품 미리보기 단계 객체 |
| `k_market_strategy` | `jsonb` | 한국 시장 전략 객체 |
| `enriched_content` | `text` | 원본 백업용 텍스트 |
| `published` | `boolean` | 공개 여부 |
| `seo` | `jsonb` | 메타 정보 (metaTitle, description 등) |
| `content` | `text` | 마크다운 본문 (핵심 스토리) |
| `created_at` | `timestamptz`| 생성 일시 (기본값: `now()`) |

### 보안 정책 (RLS)
- **Enable RLS**: ON
- **Select Policy**: `published = true`인 경우 익명(Anon) 접근 허용.
- **Service Role**: RLS를 우회하여 모든 CRUD 가능 (Server-side 전전).

## 4. 데이터 페칭 전략 (Data Fetching)
### `lib/data.ts` (중앙 집중화)
- **Mapping**: DB의 `snake_case` 컬럼을 프론트엔드의 `camelCase` 타입(`CaseStudy`)으로 변환하여 기존 컴포넌트 파손 방지.
- **함수 목록**:
  - `getAllCaseStudies()`: 관리자용 전체 목록.
  - `getPublishedCaseStudies()`: 메인 페이지용 공개 목록.
  - `getCaseStudyById(id)`: 상세 페이지용 개별 조회.

## 5. API 전환 내역
데이터 소스가 파일에서 DB로 변경됨에 따라 다음 API들이 `upsert`/`update`/`delete` 쿼리로 전면 개편되었습니다.
- `app/api/save-post/route.ts`
- `app/api/delete-post/route.ts`
- `app/api/toggle-publish/route.ts`
- `app/api/generate-case-study/route.ts`
- `app/api/admin/improve/route.ts`

## 6. 워크플로우 (Workflow)
1. **데이터 수집**: `agents/scout.py` (Python)
2. **콘텐츠 생성**:Next.js API 호출 → Gemini AI → **Supabase Insert**
3. **웹 반영**: Vercel에 설정된 `revalidate = 60`에 의해 최대 60초 내 사이트 갱신.

## 7. 주의사항 및 유지보수
- **ID 생성 규칙**: 제목을 기반으로 slug를 생성하며, 중복 시 `-1`, `-2` 접미사를 자동으로 붙임.
- **유형 호환성**: `jsonb` 타입 내부의 복잡한 스키마가 변경될 경우 프론트엔드의 Type 정의와 일치하도록 업데이트 필요.

---
*Last Updated: 2026-03-26 by Antigravity* 🚀🎨✨

# Scout (스카우트)

**역할:** Startup Radar 콘텐츠 수집 에이전트

## 담당 업무
1. Starter Story 등 외부 소스에서 원본 인터뷰를 Selenium으로 스크래핑
2. Raw content를 Gemini API에 전달하여 "스타트업 레이더 주인장" 스타일의 케이스 스터디 자동 생성
3. 생성된 케이스를 `site-next/data/case-studies.json`에 자동 저장
4. `raw-content/` 폴더에 원본 백업 관리

## 실행
- **코드:** `agents/scout.py`
- **슬래시 커맨드:** `/scout`

```bash
python agents/scout.py <url>                    # 단일 URL
python agents/scout.py <url1> <url2>            # 다중 URL
python agents/scout.py --file urls.txt          # URL 목록 파일
python agents/scout.py --raw <file.txt>         # 로컬 raw 파일로 생성
python agents/scout.py -i                       # 대화형 모드
```

## 파이프라인
```
Starter Story URL
  → Selenium 스크래핑 (쿠키 인증)
  → raw-content/ 백업 저장
  → /api/generate-case-study (Gemini 2.5 Flash)
  → case-studies.json 자동 저장
  → 홈페이지/상세페이지 즉시 반영
```

## 전제 조건
- Next.js 서버 실행 중 (`npm run dev` → localhost:3000)
- Chrome + ChromeDriver 설치
- Python: `selenium`, `beautifulsoup4`, `requests`

## 설정
- `NEXTJS_URL`: Next.js 서버 주소 (기본: http://localhost:3000)
- `STARTERSTORY_COOKIE`: 인증 쿠키 (환경변수로 오버라이드 가능)

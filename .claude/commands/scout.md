Scout (스카우트) - Startup Radar 콘텐츠 수집 에이전트를 실행합니다.

사용자가 제공한 Starter Story URL을 Selenium으로 스크래핑하고, Gemini API로 케이스 스터디를 자동 생성하여 case-studies.json에 저장합니다.

## 실행 방법

1. 사용자가 URL을 제공한 경우: `python agents/scout.py <URL>` 실행
2. 사용자가 raw 파일 경로를 제공한 경우: `python agents/scout.py --raw <파일경로>` 실행
3. URL 없이 호출된 경우: 사용자에게 URL을 물어보세요

## 전제 조건
- Next.js 서버가 localhost:3000에서 실행 중이어야 합니다
- 실행 전에 서버 상태를 확인하고, 안 돌아가고 있으면 사용자에게 알려주세요

## 사용자 입력
$ARGUMENTS

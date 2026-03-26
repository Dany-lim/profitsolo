# 자동 파일 번호 매기기 시스템

## 개요
모든 스크래핑된 파일은 자동으로 순차적인 번호가 매겨집니다.
- 형식: `01-파일명.txt`, `02-파일명.txt`, ...
- 기존 파일의 최고 번호를 확인하고 다음 번호부터 자동 할당

## 사용된 파일들

### 1. 유틸리티 모듈
**파일:** `scraper_utils.py`

주요 함수:
- `get_next_file_number(content_dir)` - 다음 파일 번호 반환
- `generate_numbered_filename(base_name, file_number)` - 번호가 포함된 파일명 생성
- `save_content_to_file(content, filename, content_dir)` - 파일 저장

### 2. 업데이트된 스크래퍼들

#### scrape_page2_top10.py
- 2페이지 상위 10개 케이스 스크래핑
- 자동 번호 매기기 적용 ✅

#### scrape_page1_remaining.py
- 1페이지 남은 케이스 스크래핑 (BruMate, Supademo 제외)
- 자동 번호 매기기 적용 ✅

#### starterstory_scraper.py
- 메인 스크래퍼 클래스
- 자동 번호 매기기 유틸리티 import ✅

## 작동 방식

### 1. 시작 번호 확인
```python
start_number = get_next_file_number('../raw-content')
# 예: raw-content에 28개 파일(01-28)이 있으면 29를 반환
```

### 2. 파일 저장 시 자동 번호 부여
```python
for i, case in enumerate(cases_to_scrape, 1):
    base_filename = case['url'].split('/')[-1]
    file_number = start_number + i - 1
    filename = generate_numbered_filename(base_filename, file_number)
    # 결과: "29-파일명.txt", "30-파일명.txt", ...
```

### 3. 결과
- **기존 파일:** 01-28 (이미 저장됨)
- **새 파일:** 29부터 자동 시작
- **충돌 없음:** 항상 순차적으로 증가

## 예시

### Before (이전)
```
raw-content/
  sustainable-fashion-blog.txt
  personal-finance-blog.txt
  ...
```

### After (번호 매기기 후)
```
raw-content/
  01-sustainable-fashion-blog.txt
  02-personal-finance-blog.txt
  03-start-a-website-about-online-casinos.txt
  ...
  28-zenmaster-wellness.txt
```

### 새로운 스크래핑 실행 시
```
raw-content/
  01-28 (기존 파일들)
  29-new-case-study.txt  ← 자동으로 29부터 시작
  30-another-case.txt
  ...
```

## 장점
1. ✅ **자동화:** 수동으로 번호 매길 필요 없음
2. ✅ **충돌 방지:** 기존 파일 번호와 겹치지 않음
3. ✅ **정렬 용이:** 파일 탐색기에서 자동 정렬
4. ✅ **일관성:** 모든 스크래퍼가 동일한 규칙 사용

## 테스트

유틸리티 함수 테스트:
```bash
cd scraper
python scraper_utils.py
```

출력 예시:
```
현재 다음 파일 번호: 29
생성된 파일명: 29-test-blog-post.txt
```

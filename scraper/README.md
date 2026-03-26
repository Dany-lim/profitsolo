# Starter Story Scraper 사용 가이드

## ⚠️ 중요 주의사항

**스크래핑 전 반드시 확인:**
1. Starter Story 이용약관 확인
2. 개인 학습/연구 목적으로만 사용
3. Rate limiting 준수 (요청 간 5초 대기)
4. 상업적 재배포 금지

---

## 📦 설치

```bash
# 1. 필요한 패키지 설치
cd scraper
pip install -r requirements.txt

# 2. ChromeDriver 설치 (자동)
# webdriver-manager가 자동으로 설치합니다
```

---

## 🔑 1단계: 쿠키 가져오기 (권장 방법)

### Chrome에서 쿠키 복사:

1. **Chrome에서 Starter Story 로그인**
   - https://www.starterstory.com/login

2. **개발자 도구 열기**
   - `Cmd+Option+I` (Mac) 또는 `F12` (Windows)

3. **Application 탭 클릭**
   - 왼쪽 메뉴에서 `Cookies` > `https://www.starterstory.com` 선택

4. **쿠키 복사**
   - `_starterstory_session` 찾기
   - Value 값 복사

5. **스크립트에 붙여넣기**
   ```python
   cookies = [
       {
           'name': '_starterstory_session',
           'value': '여기에_복사한_값',  # 복사한 값 붙여넣기
           'domain': '.starterstory.com'
       },
   ]
   ```

---

## 🚀 2단계: 실행

### 방법 A: 쿠키 사용 (권장)

```bash
python starterstory_scraper.py
```

### 방법 B: 직접 로그인

스크립트에서 cookies를 빈 리스트로 두면:
```python
cookies = []
```

실행 시 이메일/비밀번호 입력 프롬프트가 나옵니다.

---

## 📊 3단계: HTML 구조 확인

**중요:** Starter Story의 실제 HTML 구조를 확인해야 합니다.

### 셀렉터 찾기 스크립트 먼저 실행:

```bash
python find_selectors.py
```

이 스크립트가 페이지 HTML을 저장하면, 수동으로 확인 후:
- 케이스 스터디 카드의 클래스명
- 제목, 창업자, 매출 등의 셀렉터

를 찾아서 `starterstory_scraper.py`의 아래 부분 수정:

```python
# 실제 HTML 구조에 맞게 수정
cards = soup.find_all('div', class_='실제_클래스명')
```

---

## 🎯 4단계: 데이터 확인

스크래핑 완료 후:

```bash
# JSON 파일 확인
cat ../raw-content/case_studies.json

# 케이스 수 확인
python -c "import json; data=json.load(open('../raw-content/case_studies.json')); print(f'{len(data)}개 케이스 스터디')"
```

---

## 🔧 Rate Limiting 설정

**필수:** 서버 부하를 줄이기 위해 요청 간격 조절

```python
# 기본 5초 (스크립트 내 설정됨)
time.sleep(5)

# 더 보수적으로 (10초)
time.sleep(10)
```

---

## 📝 출력 형식

```json
[
  {
    "title": "BruMate: 따뜻한 맥주 문제를...",
    "founder": "Dylan Jacob",
    "revenue": "$10M/month",
    "url": "/stories/brumate",
    "description": "...",
    "content": "전체 스토리 내용..."
  }
]
```

---

## 🐛 트러블슈팅

### 1. "ChromeDriver 찾을 수 없음"
```bash
pip install --upgrade webdriver-manager
```

### 2. "로그인 실패"
- 쿠키 값이 정확한지 확인
- 쿠키 유효기간 확인 (재로그인 후 새 쿠키)

### 3. "카드를 찾을 수 없음"
- `find_selectors.py` 먼저 실행
- HTML 구조 확인 후 셀렉터 수정

### 4. "너무 느림"
- `--headless` 옵션 활성화 (스크립트 내 주석 해제)
- 동시 실행 금지 (한 번에 하나만)

---

## 📌 다음 단계

1. ✅ 스크래핑 완료
2. 데이터를 `brumate.txt` 같은 형식으로 변환
3. `case-studies.json`에 추가
4. 사이트에 표시

변환 스크립트도 필요하시면 말씀해주세요!

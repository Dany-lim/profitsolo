#!/usr/bin/env python3
"""
Scout (스카우트) - Startup Radar 콘텐츠 수집 에이전트

역할: 전 세계 1인 창업 성공 사례를 발굴하고, 한국 독자를 위한
      케이스 스터디로 자동 변환하는 콘텐츠 파이프라인 에이전트

담당 업무:
  1. Starter Story 등 소스에서 원본 인터뷰 스크래핑 (Selenium)
  2. raw content를 Gemini API에 전달하여 케이스 스터디 자동 생성
  3. 생성된 케이스를 case-studies.json DB에 자동 저장
  4. raw content 백업 관리

사용법:
  python agents/scout.py <url>                  # 단일 URL 처리
  python agents/scout.py <url1> <url2> ...      # 다중 URL 처리
  python agents/scout.py --file urls.txt        # 파일에서 URL 목록 읽기
  python agents/scout.py --interactive          # 대화형 모드
  python agents/scout.py --raw <file.txt>       # 로컬 raw 파일로 생성
"""

import time
import sys
import os
import json
import argparse
import requests
from datetime import datetime

# Selenium
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup

# ─────────────────────────────────────────────
# 설정
# ─────────────────────────────────────────────
AGENT_NAME = "Scout"
AGENT_VERSION = "1.0.0"
NEXTJS_URL = os.environ.get("NEXTJS_URL", "http://localhost:3000")
RAW_CONTENT_DIR = os.path.join(os.path.dirname(__file__), '..', 'raw-content')

# Starter Story 인증 쿠키 (환경변수 우선, 없으면 하드코딩)
COOKIE_VALUE = os.environ.get(
    "STARTERSTORY_COOKIE",
    "eyJfcmFpbHMiOnsibWVzc2FnZSI6IlcxczNNVFUyTXpKZExDSWtNbUVrTVRFa1RHUlhOR0pGTlM5QmVqbGpaV05TZWt4eGNtcFRkU0lzSWpFM056UXhNemd6TnprdU1ERTRORE0xTWlKZCIsImV4cCI6IjIwMjgtMDMtMjJUMDA6MTI6NTkuMDE4WiIsInB1ciI6bnVsbH19--fd0407cf98076037facdded070b5e1f4fac487ee"
)


def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    prefix = {"INFO": " ", "OK": "+", "ERR": "!", "WAIT": "~"}
    print(f"  [{prefix.get(level, ' ')}] {timestamp}  {msg}")


def banner():
    print()
    print("  ╔══════════════════════════════════════════════╗")
    print(f"  ║  Scout v{AGENT_VERSION} — Startup Radar Agent       ║")
    print("  ║  콘텐츠 수집 → 케이스 스터디 자동 생성      ║")
    print("  ╚══════════════════════════════════════════════╝")
    print()


# ─────────────────────────────────────────────
# Selenium 스크래핑
# ─────────────────────────────────────────────
class Scraper:
    def __init__(self):
        self.driver = None

    def start(self):
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument(
            '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
            'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        self.driver = webdriver.Chrome(options=chrome_options)
        log("Chrome 드라이버 시작", "OK")

    def login(self):
        self.driver.get('https://www.starterstory.com')
        time.sleep(2)
        self.driver.add_cookie({
            'name': 'remember_user_token',
            'value': COOKIE_VALUE,
            'domain': '.starterstory.com'
        })
        log("Starter Story 인증 완료", "OK")

    def scrape(self, url):
        log(f"스크래핑: {url}", "WAIT")
        self.driver.get(url)
        time.sleep(5)

        # 스크롤로 전체 콘텐츠 로드
        last_height = self.driver.execute_script("return document.body.scrollHeight")
        for _ in range(5):
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            new_height = self.driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

        soup = BeautifulSoup(self.driver.page_source, 'html.parser')

        # 불필요 요소 제거
        for tag in soup.find_all(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()

        sections = []

        # 제목
        h1 = soup.find('h1')
        title = h1.text.strip() if h1 else ''
        if title:
            sections.append(f"# {title}\n")

        # 본문
        container = (
            soup.find('div', class_='story-content') or
            soup.find('article') or
            soup.find('main')
        )

        if container:
            for elem in container.find_all(['p', 'h2', 'h3', 'h4', 'li', 'blockquote']):
                text = elem.text.strip()
                if not text or len(text) < 15:
                    continue
                tag = elem.name
                if tag in ('h2', 'h3'):
                    sections.append(f"\n### {text}\n")
                elif tag == 'h4':
                    sections.append(f"\n#### {text}\n")
                elif tag == 'blockquote':
                    sections.append(f"\n> {text}\n")
                elif tag == 'li':
                    sections.append(f"- {text}")
                else:
                    sections.append(f"{text}\n")

        raw = '\n'.join(sections)
        log(f"스크래핑 완료 ({len(raw):,}자)", "OK")
        return title, raw

    def stop(self):
        if self.driver:
            self.driver.quit()
            log("Chrome 종료", "OK")


# ─────────────────────────────────────────────
# 콘텐츠 처리
# ─────────────────────────────────────────────
def save_raw(url_or_name, raw_content):
    """raw content 백업 저장"""
    os.makedirs(RAW_CONTENT_DIR, exist_ok=True)
    slug = url_or_name.rstrip('/').split('/')[-1].replace('.txt', '')
    filepath = os.path.join(RAW_CONTENT_DIR, f"{slug}.txt")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(raw_content)
    log(f"Raw 백업 저장: {os.path.basename(filepath)}", "OK")
    return filepath


def generate(raw_content, source_url=''):
    """Next.js API로 케이스 스터디 생성"""
    log("Gemini로 케이스 스터디 생성 중... (1~2분)", "WAIT")

    try:
        resp = requests.post(
            f"{NEXTJS_URL}/api/generate-case-study",
            json={'rawContent': raw_content, 'sourceUrl': source_url},
            timeout=180
        )
        data = resp.json()

        if data.get('success'):
            cs = data['caseStudy']
            log(f"케이스 생성 완료!", "OK")
            log(f"  ID:   {cs['id']}")
            log(f"  제목: {cs['title']}")
            log(f"  MRR:  {cs['mrr']}")
            log(f"  태그: {', '.join(cs['tags'])}")
            log(f"  본문: {data['stats']['contentLength']:,}자")
            return cs
        else:
            log(f"생성 실패: {data.get('error', 'Unknown')}", "ERR")
            return None

    except requests.exceptions.ConnectionError:
        log(f"Next.js 서버 연결 실패 ({NEXTJS_URL})", "ERR")
        log("  → npm run dev로 서버를 먼저 실행하세요")
        return None
    except requests.exceptions.Timeout:
        log("요청 타임아웃 (3분 초과)", "ERR")
        return None
    except Exception as e:
        log(f"오류: {e}", "ERR")
        return None


# ─────────────────────────────────────────────
# 워크플로우
# ─────────────────────────────────────────────
def process_url(scraper, url):
    """URL → 스크래핑 → 저장 → 케이스 생성"""
    print(f"\n  {'─'*50}")
    title, raw = scraper.scrape(url)

    if len(raw) < 200:
        log(f"콘텐츠 부족 ({len(raw)}자) - 건너뜀", "ERR")
        return None

    save_raw(url, raw)
    result = generate(raw, url)
    time.sleep(3)  # rate limit
    return result


def process_raw_file(filepath):
    """로컬 raw 파일 → 케이스 생성"""
    print(f"\n  {'─'*50}")
    log(f"파일 읽기: {filepath}", "WAIT")

    with open(filepath, 'r', encoding='utf-8') as f:
        raw = f.read()

    if len(raw) < 200:
        log(f"콘텐츠 부족 ({len(raw)}자) - 건너뜀", "ERR")
        return None

    log(f"파일 로드 완료 ({len(raw):,}자)", "OK")
    return generate(raw)


# ─────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────
def main():
    banner()

    parser = argparse.ArgumentParser(description='Scout - Startup Radar Agent')
    parser.add_argument('urls', nargs='*', help='스크래핑할 URL(s)')
    parser.add_argument('--file', '-f', help='URL 목록 파일')
    parser.add_argument('--raw', '-r', help='로컬 raw content 파일로 케이스 생성')
    parser.add_argument('--interactive', '-i', action='store_true', help='대화형 모드')
    args = parser.parse_args()

    # 모드 1: 로컬 raw 파일
    if args.raw:
        result = process_raw_file(args.raw)
        if result:
            print(f"\n  생성 완료: [{result['id']}] {result['title']}")
        return

    # URL 수집
    urls = list(args.urls)

    if args.file:
        with open(args.file, 'r') as f:
            urls += [line.strip() for line in f if line.strip().startswith('http')]
        log(f"파일에서 {len(urls)}개 URL 로드")

    if args.interactive or (not urls and not args.raw):
        log("URL을 입력하세요 (빈 줄로 완료):")
        while True:
            url = input("    > ").strip()
            if not url:
                break
            if url.startswith('http'):
                urls.append(url)

    if not urls:
        log("처리할 URL이 없습니다.", "ERR")
        return

    log(f"총 {len(urls)}개 URL 처리 시작\n")

    # Selenium 시작
    scraper = Scraper()
    scraper.start()
    scraper.login()

    results = []
    for i, url in enumerate(urls, 1):
        log(f"[{i}/{len(urls)}] 처리 중...")
        result = process_url(scraper, url)
        if result:
            results.append(result)

    scraper.stop()

    # 결과 요약
    print(f"\n  {'═'*50}")
    log(f"Scout 완료: {len(results)}/{len(urls)}개 케이스 생성")
    print(f"  {'═'*50}")

    if results:
        print("\n  생성된 케이스:")
        for r in results:
            print(f"    [{r['id']}] {r['title']}")
    print()


if __name__ == '__main__':
    main()

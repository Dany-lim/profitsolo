#!/usr/bin/env python3
"""
2페이지 상위 10개 케이스 스크래핑
"""

import time
import json
import os
import sys
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup

# 현재 디렉토리를 path에 추가
sys.path.insert(0, os.path.dirname(__file__))
from scraper_utils import get_next_file_number, generate_numbered_filename

def scrape_page2_top10():
    print("="*70)
    print("🎯 2페이지 상위 10개 케이스 스크래핑 시작")
    print("="*70)
    print()

    # 2페이지 케이스 로드
    with open('all_cases_complete.json', 'r', encoding='utf-8') as f:
        all_cases = json.load(f)

    page2_cases = [case for case in all_cases if case['page'] == 2]

    # 상위 10개만 선택 (1-10번)
    cases_to_scrape = page2_cases[:10]

    print(f"스크래핑할 케이스: {len(cases_to_scrape)}개\n")

    # Chrome 설정
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')

    driver = webdriver.Chrome(options=chrome_options)

    # 시작 번호 가져오기
    content_dir = '../raw-content'
    start_number = get_next_file_number(content_dir)
    print(f"📝 파일 번호 시작: {start_number:02d}\n")

    try:
        # 쿠키 설정
        driver.get('https://www.starterstory.com')
        time.sleep(2)

        cookie = {
            'name': 'remember_user_token',
            'value': 'eyJfcmFpbHMiOnsibWVzc2FnZSI6IlcxczNNVFUyTXpKZExDSWtNbUVrTVRFa1RHUlhOR0pGTlM5QmVqbGpaV05TZWt4eGNtcFRkU0lzSWpFM056UXhNemd6TnprdU1ERTRORE0xTWlKZCIsImV4cCI6IjIwMjgtMDMtMjJUMDA6MTI6NTkuMDE4WiIsInB1ciI6bnVsbH19--fd0407cf98076037facdded070b5e1f4fac487ee',
            'domain': '.starterstory.com'
        }
        driver.add_cookie(cookie)
        print("✅ 쿠키 설정 완료\n")

        # 각 케이스 스크래핑
        for i, case in enumerate(cases_to_scrape, 1):
            print(f"[{i}/{len(cases_to_scrape)}] {case['title'][:60]}...")

            try:
                # 페이지 로드
                driver.get(case['url'])
                time.sleep(5)  # 로딩 대기

                # 스크롤 (모든 콘텐츠 로드)
                last_height = driver.execute_script("return document.body.scrollHeight")
                for _ in range(3):
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    time.sleep(2)
                    new_height = driver.execute_script("return document.body.scrollHeight")
                    if new_height == last_height:
                        break
                    last_height = new_height

                # HTML 파싱
                soup = BeautifulSoup(driver.page_source, 'html.parser')

                # 콘텐츠 추출
                content_sections = []

                # 제목
                title_elem = soup.find('h1')
                if title_elem:
                    content_sections.append(f"# {title_elem.text.strip()}\n")

                # 본문 콘텐츠
                content_container = (
                    soup.find('div', class_='story-content') or
                    soup.find('article') or
                    soup.find('main')
                )

                if content_container:
                    paragraphs = content_container.find_all(['p', 'h2', 'h3', 'h4', 'li', 'blockquote'])

                    for elem in paragraphs:
                        text = elem.text.strip()
                        if text and len(text) > 20:
                            if elem.name == 'h2':
                                content_sections.append(f"\n## {text}\n")
                            elif elem.name == 'h3':
                                content_sections.append(f"\n### {text}\n")
                            elif elem.name == 'blockquote':
                                content_sections.append(f"\n> {text}\n")
                            else:
                                content_sections.append(f"{text}\n")

                # 파일명 생성 (자동 번호 + URL에서 추출)
                base_filename = case['url'].split('/')[-1]
                file_number = start_number + i - 1
                filename = generate_numbered_filename(base_filename, file_number)
                filepath = os.path.join('../raw-content', filename)

                # 파일 저장
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(content_sections))

                print(f"  ✅ 저장: {filename} ({len(''.join(content_sections))} bytes)")

                # Rate limiting
                time.sleep(3)

            except Exception as e:
                print(f"  ❌ 에러: {e}")
                continue

        print("\n" + "="*70)
        print("✅ 스크래핑 완료!")
        print("="*70)

    except Exception as e:
        print(f"\n❌ 에러 발생: {e}")
        import traceback
        traceback.print_exc()

    finally:
        driver.quit()
        print("\n✅ 브라우저 종료")

if __name__ == '__main__':
    scrape_page2_top10()

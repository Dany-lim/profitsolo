#!/usr/bin/env python3
"""
간단 테스트: 2개 케이스만 가져오기
"""

import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup

def test_scrape_two():
    """2개 케이스 스터디만 테스트"""
    print("🧪 테스트 시작: 2개 케이스 스터디 수집\n")

    # Chrome 설정
    chrome_options = Options()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')

    driver = webdriver.Chrome(options=chrome_options)

    try:
        # 1. 메인 페이지 접속
        driver.get('https://www.starterstory.com')
        time.sleep(2)

        # 2. 쿠키 추가
        cookie = {
            'name': 'remember_user_token',
            'value': 'eyJfcmFpbHMiOnsibWVzc2FnZSI6IlcxczNNVFUyTXpKZExDSWtNbUVrTVRFa1RHUlhOR0pGTlM5QmVqbGpaV05TZWt4eGNtcFRkU0lzSWpFM056UXhNemd6TnprdU1ERTRORE0xTWlKZCIsImV4cCI6IjIwMjgtMDMtMjJUMDA6MTI6NTkuMDE4WiIsInB1ciI6bnVsbH19--fd0407cf98076037facdded070b5e1f4fac487ee',
            'domain': '.starterstory.com'
        }
        driver.add_cookie(cookie)
        print("✅ 쿠키 추가 완료")

        # 3. Explore 페이지 이동
        driver.get('https://www.starterstory.com/explore')
        time.sleep(5)
        print("✅ Explore 페이지 로드 완료")

        # 4. HTML 파싱
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # 5. 케이스 스터디 카드 찾기
        cards = soup.find_all('a', class_='database-story-result')
        print(f"📊 발견된 케이스 스터디: {len(cards)}개")
        print(f"🎯 처음 2개만 추출합니다...\n")

        results = []

        for i, card in enumerate(cards[:2]):  # 처음 2개만
            print(f"--- 케이스 {i+1} ---")

            # 제목
            title_elem = card.find('div', class_='text-xl')
            title = title_elem.text.strip() if title_elem else "제목 없음"
            print(f"제목: {title}")

            # URL
            url = card.get('href', '')
            full_url = f"https://www.starterstory.com{url}" if url.startswith('/') else url
            print(f"URL: {full_url}")

            # 설명
            desc_elem = card.find('div', class_='mt-2 flex')
            description = desc_elem.text.strip() if desc_elem else "설명 없음"
            print(f"설명: {description[:100]}...")

            results.append({
                'title': title,
                'url': full_url,
                'description': description
            })

            print()

        # 6. JSON 저장
        with open('test_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        print("✅ 저장 완료: test_results.json")
        print(f"📊 총 {len(results)}개 케이스 스터디 수집 완료")

    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        import traceback
        traceback.print_exc()

    finally:
        driver.quit()
        print("\n✅ 브라우저 종료")

if __name__ == '__main__':
    test_scrape_two()

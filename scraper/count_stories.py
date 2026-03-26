#!/usr/bin/env python3
"""
Starter Story Explore 페이지의 케이스 스터디 개수 확인
"""

import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup

def count_stories():
    print("🔍 Starter Story 케이스 스터디 개수 확인 중...\n")

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

        # 4. 페이지 스크롤 (모든 콘텐츠 로드)
        print("📜 페이지 스크롤 시작...")

        last_height = driver.execute_script("return document.body.scrollHeight")
        scroll_count = 0
        max_scrolls = 50  # 최대 50번 스크롤

        while scroll_count < max_scrolls:
            # 페이지 끝까지 스크롤
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(3)

            # 새로운 높이 확인
            new_height = driver.execute_script("return document.body.scrollHeight")

            scroll_count += 1
            print(f"  스크롤 {scroll_count}회... (높이: {last_height} → {new_height})")

            if new_height == last_height:
                print(f"✅ 모든 콘텐츠 로드 완료 ({scroll_count}번 스크롤)")
                break

            last_height = new_height

        # 5. HTML 파싱
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # 6. 케이스 스터디 카드 찾기
        cards = soup.find_all('a', class_='database-story-result')

        print(f"\n{'='*60}")
        print(f"📊 총 케이스 스터디 개수: {len(cards)}개")
        print(f"{'='*60}\n")

        # 7. 처음 10개 제목 샘플 출력
        print("처음 10개 케이스 스터디 샘플:")
        for i, card in enumerate(cards[:10]):
            title_elem = card.find('div', class_='text-xl')
            title = title_elem.text.strip() if title_elem else "제목 없음"
            print(f"{i+1}. {title}")

        return len(cards)

    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        import traceback
        traceback.print_exc()
        return 0

    finally:
        driver.quit()
        print("\n✅ 브라우저 종료")

if __name__ == '__main__':
    total = count_stories()
    print(f"\n🎯 최종 결과: {total}개의 케이스 스터디")

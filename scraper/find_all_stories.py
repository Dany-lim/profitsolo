#!/usr/bin/env python3
"""
Starter Story의 전체 케이스 스터디 개수 확인
- 페이지에 표시된 총 개수 찾기
- 무한 스크롤로 모든 콘텐츠 로드 시도
"""

import time
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup

def find_all_stories():
    print("🔍 Starter Story 전체 케이스 스터디 개수 확인 중...\n")

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

        # 4. 페이지 소스에서 총 개수 찾기
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # 페이지 텍스트에서 "X stories", "X results" 등 찾기
        page_text = soup.get_text()

        # "1,234 stories" 같은 패턴 찾기
        count_patterns = [
            r'(\d+,?\d*)\s+stories',
            r'(\d+,?\d*)\s+results',
            r'(\d+,?\d*)\s+interviews',
            r'Showing\s+(\d+)',
            r'Total:\s+(\d+)',
        ]

        found_counts = []
        for pattern in count_patterns:
            matches = re.findall(pattern, page_text, re.IGNORECASE)
            if matches:
                for match in matches:
                    count = int(match.replace(',', ''))
                    found_counts.append(count)
                    print(f"  패턴 '{pattern}' 발견: {count}개")

        if found_counts:
            max_count = max(found_counts)
            print(f"\n📊 페이지에 표시된 최대 개수: {max_count}개")

        # 5. HTML 저장 (분석용)
        with open('explore_page.html', 'w', encoding='utf-8') as f:
            f.write(driver.page_source)
        print("✅ HTML 저장: explore_page.html")

        # 6. 적극적인 스크롤 시도
        print("\n📜 적극적인 스크롤 시작...")

        cards_loaded = set()
        scroll_count = 0
        max_scrolls = 100  # 최대 100번 스크롤
        no_change_count = 0

        while scroll_count < max_scrolls:
            # 현재 로드된 카드 개수
            current_cards = driver.find_elements(By.CSS_SELECTOR, 'a.database-story-result')
            current_count = len(current_cards)

            # 페이지 끝까지 스크롤
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)

            # 새로운 카드 개수
            new_cards = driver.find_elements(By.CSS_SELECTOR, 'a.database-story-result')
            new_count = len(new_cards)

            scroll_count += 1

            if new_count > current_count:
                print(f"  스크롤 {scroll_count}회: {current_count}개 → {new_count}개 (+{new_count - current_count})")
                no_change_count = 0
            else:
                no_change_count += 1
                print(f"  스크롤 {scroll_count}회: {current_count}개 (변화 없음, {no_change_count}회 연속)")

            # 5번 연속 변화 없으면 종료
            if no_change_count >= 5:
                print(f"\n✅ 더 이상 로드할 콘텐츠 없음 (스크롤 {scroll_count}회 완료)")
                break

            # "Load More" 버튼 찾기 시도
            try:
                load_more_buttons = driver.find_elements(By.XPATH,
                    "//button[contains(text(), 'Load') or contains(text(), 'More') or contains(text(), 'Show')]")
                for btn in load_more_buttons:
                    if btn.is_displayed():
                        print(f"  'Load More' 버튼 발견! 클릭 시도...")
                        btn.click()
                        time.sleep(3)
                        break
            except:
                pass

        # 7. 최종 카운트
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        cards = soup.find_all('a', class_='database-story-result')

        print(f"\n{'='*60}")
        print(f"📊 최종 로드된 케이스 스터디: {len(cards)}개")
        print(f"{'='*60}\n")

        # 8. 모든 제목 리스트 저장
        titles = []
        for i, card in enumerate(cards):
            title_elem = card.find('div', class_='text-xl')
            title = title_elem.text.strip() if title_elem else "제목 없음"
            titles.append(title)
            if i < 20:  # 처음 20개만 출력
                print(f"{i+1}. {title}")

        if len(cards) > 20:
            print(f"... (나머지 {len(cards) - 20}개 생략)")

        # 전체 리스트 저장
        with open('all_stories_list.txt', 'w', encoding='utf-8') as f:
            for i, title in enumerate(titles, 1):
                f.write(f"{i}. {title}\n")

        print(f"\n✅ 전체 리스트 저장: all_stories_list.txt")

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
    total = find_all_stories()
    print(f"\n{'='*60}")
    print(f"🎯 최종 결과: {total}개의 케이스 스터디")
    print(f"{'='*60}")

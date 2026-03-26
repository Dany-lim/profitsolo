#!/usr/bin/env python3
"""
HTML 구조 분석 스크립트
Starter Story의 실제 HTML 구조를 확인하여 올바른 셀렉터를 찾습니다.
"""

import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def analyze_page_structure():
    """페이지 구조 분석"""
    print("🔍 Starter Story 페이지 구조 분석 중...")

    chrome_options = Options()
    # chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')

    driver = webdriver.Chrome(options=chrome_options)

    try:
        # 쿠키로 로그인 (여기에 쿠키 추가)
        driver.get('https://www.starterstory.com')
        time.sleep(2)

        # 여기에 쿠키 추가
        cookies = [
            {
                'name': 'remember_user_token',
                'value': 'eyJfcmFpbHMiOnsibWVzc2FnZSI6IlcxczNNVFUyTXpKZExDSWtNbUVrTVRFa1RHUlhOR0pGTlM5QmVqbGpaV05TZWt4eGNtcFRkU0lzSWpFM056UXhNemd6TnprdU1ERTRORE0xTWlKZCIsImV4cCI6IjIwMjgtMDMtMjJUMDA6MTI6NTkuMDE4WiIsInB1ciI6bnVsbH19--fd0407cf98076037facdded070b5e1f4fac487ee',
                'domain': '.starterstory.com'
            },
        ]

        if cookies:
            for cookie in cookies:
                driver.add_cookie(cookie)

        # Explore 페이지 로드
        driver.get('https://www.starterstory.com/explore')
        time.sleep(5)

        # 페이지 스크롤 (콘텐츠 로드)
        driver.execute_script("window.scrollTo(0, 1000);")
        time.sleep(3)

        # HTML 저장
        html = driver.page_source

        with open('page_structure.html', 'w', encoding='utf-8') as f:
            f.write(html)

        print("✅ HTML 저장 완료: page_structure.html")
        print("\n다음 단계:")
        print("1. page_structure.html 파일 열기")
        print("2. 케이스 스터디 카드의 HTML 구조 확인")
        print("3. 클래스명, ID 등 메모")
        print("4. starterstory_scraper.py의 셀렉터 수정")

        # 스크린샷 저장
        driver.save_screenshot('page_screenshot.png')
        print("✅ 스크린샷 저장 완료: page_screenshot.png")

    finally:
        driver.quit()

if __name__ == '__main__':
    analyze_page_structure()

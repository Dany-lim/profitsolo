#!/usr/bin/env python3
"""
Starter Story Scraper
로그인 후 케이스 스터디를 수집하는 스크립트

사용법:
1. Chrome에서 Starter Story 로그인
2. 브라우저 쿠키 복사 (아래 설명 참조)
3. python starterstory_scraper.py 실행

주의: 이용약관 확인 필수!
"""

import time
import json
import os
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup

# 현재 디렉토리를 path에 추가
sys.path.insert(0, os.path.dirname(__file__))
from scraper_utils import get_next_file_number, generate_numbered_filename, save_content_to_file

class StarterStoryScraper:
    def __init__(self, cookies=None):
        """
        cookies: Chrome에서 복사한 쿠키 딕셔너리
        예: {'name': '_starterstory_session', 'value': 'xxx', 'domain': '.starterstory.com'}
        """
        self.cookies = cookies
        self.driver = None
        self.case_studies = []

    def setup_driver(self):
        """Chrome 드라이버 설정"""
        chrome_options = Options()
        # chrome_options.add_argument('--headless')  # 백그라운드 실행 (디버깅시 주석처리)
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

        self.driver = webdriver.Chrome(options=chrome_options)
        print("✅ Chrome 드라이버 초기화 완료")

    def login_with_cookies(self):
        """쿠키로 로그인"""
        self.driver.get('https://www.starterstory.com')
        time.sleep(2)

        if self.cookies:
            for cookie in self.cookies:
                self.driver.add_cookie(cookie)
            print("✅ 쿠키 추가 완료")

        # 로그인 확인
        self.driver.get('https://www.starterstory.com/explore')
        time.sleep(3)
        print("✅ Explore 페이지 로드 완료")

    def manual_login(self, email, password):
        """수동 로그인 (쿠키 없을 때)"""
        self.driver.get('https://www.starterstory.com/login')
        time.sleep(2)

        # 이메일 입력
        email_input = self.driver.find_element(By.NAME, 'email')
        email_input.send_keys(email)

        # 비밀번호 입력
        password_input = self.driver.find_element(By.NAME, 'password')
        password_input.send_keys(password)

        # 로그인 버튼 클릭
        login_button = self.driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
        login_button.click()

        time.sleep(5)
        print("✅ 로그인 완료")

    def scroll_and_load_all(self):
        """페이지 스크롤하며 모든 케이스 스터디 로드"""
        print("📜 페이지 스크롤 시작...")

        last_height = self.driver.execute_script("return document.body.scrollHeight")

        while True:
            # 페이지 끝까지 스크롤
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(3)  # 로딩 대기

            # 새로운 높이 확인
            new_height = self.driver.execute_script("return document.body.scrollHeight")

            if new_height == last_height:
                print("✅ 모든 콘텐츠 로드 완료")
                break

            last_height = new_height

    def extract_case_study_cards(self):
        """케이스 스터디 카드 정보 추출"""
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')

        # 실제 HTML 구조 (확인 완료!)
        cards = soup.find_all('a', class_='database-story-result')

        print(f"📊 발견된 케이스 스터디: {len(cards)}개")

        for card in cards:
            try:
                case_study = {
                    'title': card.find('h3').text.strip() if card.find('h3') else None,
                    'founder': card.find('span', class_='founder-name').text.strip() if card.find('span', class_='founder-name') else None,
                    'revenue': card.find('span', class_='revenue').text.strip() if card.find('span', class_='revenue') else None,
                    'url': card.find('a')['href'] if card.find('a') else None,
                    'description': card.find('p', class_='description').text.strip() if card.find('p', class_='description') else None,
                }

                self.case_studies.append(case_study)

            except Exception as e:
                print(f"⚠️  카드 파싱 에러: {e}")
                continue

        return self.case_studies

    def scrape_individual_story(self, url):
        """개별 케이스 스터디 상세 페이지 스크래핑"""
        print(f"📖 스크래핑: {url}")

        self.driver.get(url)
        time.sleep(3)

        soup = BeautifulSoup(self.driver.page_source, 'html.parser')

        # 실제 HTML 구조에 맞게 수정 필요
        story_data = {
            'url': url,
            'title': soup.find('h1').text.strip() if soup.find('h1') else None,
            'byline': soup.find('span', class_='byline').text.strip() if soup.find('span', class_='byline') else None,
            'content': soup.find('div', class_='story-content').text.strip() if soup.find('div', class_='story-content') else None,
            'metrics': {},
            'quotes': []
        }

        # Rate limiting (중요!)
        time.sleep(5)  # 5초 대기

        return story_data

    def save_to_json(self, filename='case_studies.json'):
        """JSON 파일로 저장"""
        output_dir = '../raw-content'
        os.makedirs(output_dir, exist_ok=True)

        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.case_studies, f, ensure_ascii=False, indent=2)

        print(f"✅ 저장 완료: {filepath}")
        print(f"📊 총 {len(self.case_studies)}개 케이스 스터디")

    def close(self):
        """드라이버 종료"""
        if self.driver:
            self.driver.quit()
            print("✅ 브라우저 종료")


def main():
    """메인 실행 함수"""

    print("=" * 60)
    print("🚀 Starter Story Scraper")
    print("=" * 60)
    print()

    # 방법 1: 쿠키로 로그인 (권장)
    cookies = [
        {
            'name': 'remember_user_token',
            'value': 'eyJfcmFpbHMiOnsibWVzc2FnZSI6IlcxczNNVFUyTXpKZExDSWtNbUVrTVRFa1RHUlhOR0pGTlM5QmVqbGpaV05TZWt4eGNtcFRkU0lzSWpFM056UXhNemd6TnprdU1ERTRORE0xTWlKZCIsImV4cCI6IjIwMjgtMDMtMjJUMDA6MTI6NTkuMDE4WiIsInB1ciI6bnVsbH19--fd0407cf98076037facdded070b5e1f4fac487ee',
            'domain': '.starterstory.com'
        },
    ]

    scraper = StarterStoryScraper(cookies=cookies)

    try:
        # 1. 드라이버 설정
        scraper.setup_driver()

        # 2. 로그인
        if cookies:
            scraper.login_with_cookies()
        else:
            # 방법 2: 수동 로그인
            email = input("이메일: ")
            password = input("비밀번호: ")
            scraper.manual_login(email, password)

        # 3. 모든 케이스 스터디 로드
        scraper.scroll_and_load_all()

        # 4. 케이스 스터디 카드 정보 추출
        case_studies = scraper.extract_case_study_cards()

        # 5. (선택) 개별 스토리 상세 스크래핑
        print("\n개별 스토리를 스크래핑하시겠습니까? (y/n): ", end='')
        choice = input().lower()

        if choice == 'y':
            print(f"\n몇 개까지 스크래핑하시겠습니까? (최대 {len(case_studies)}): ", end='')
            limit = int(input())

            for i, case in enumerate(case_studies[:limit]):
                if case.get('url'):
                    full_url = case['url'] if case['url'].startswith('http') else f"https://www.starterstory.com{case['url']}"
                    story_data = scraper.scrape_individual_story(full_url)
                    case_studies[i].update(story_data)

                    print(f"✅ {i+1}/{limit} 완료")

        # 6. JSON 저장
        scraper.save_to_json()

        print("\n" + "=" * 60)
        print("✅ 스크래핑 완료!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ 에러 발생: {e}")
        import traceback
        traceback.print_exc()

    finally:
        scraper.close()


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Supademo 전체 스토리 스크래핑
"""

import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup

def scrape_supademo():
    print("🎯 Supademo 스토리 스크래핑 시작\n")

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

        # 3. Supademo 스토리 페이지 이동
        driver.get('https://www.starterstory.com/stories/supademo')
        time.sleep(5)
        print("✅ Supademo 페이지 로드 완료")

        # 4. 페이지 스크롤 (모든 콘텐츠 로드)
        last_height = driver.execute_script("return document.body.scrollHeight")
        scroll_count = 0
        while scroll_count < 5:  # 최대 5번 스크롤
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height
            scroll_count += 1

        print("✅ 페이지 스크롤 완료")

        # 5. HTML 파싱
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # 6. 콘텐츠 추출
        story_data = {
            'url': 'https://www.starterstory.com/stories/supademo',
            'title': '',
            'subtitle': '',
            'founder': '',
            'revenue': '',
            'metrics': {},
            'content_sections': []
        }

        # 제목 추출
        title_elem = soup.find('h1')
        if title_elem:
            story_data['title'] = title_elem.text.strip()
            print(f"제목: {story_data['title']}")

        # 메트릭 추출
        metric_cards = soup.find_all('div', class_='metric-card')
        for card in metric_cards:
            label = card.find('div', class_='label')
            value = card.find('div', class_='value')
            if label and value:
                story_data['metrics'][label.text.strip()] = value.text.strip()

        # 본문 콘텐츠 추출 - 다양한 셀렉터 시도
        content_container = (
            soup.find('div', class_='story-content') or
            soup.find('article') or
            soup.find('div', {'id': 'story-content'}) or
            soup.find('main')
        )

        if content_container:
            # 모든 텍스트 블록 추출
            paragraphs = content_container.find_all(['p', 'h2', 'h3', 'h4', 'li', 'blockquote'])

            for elem in paragraphs:
                text = elem.text.strip()
                if text and len(text) > 20:  # 의미있는 길이의 텍스트만
                    story_data['content_sections'].append({
                        'type': elem.name,
                        'text': text
                    })

        print(f"\n📊 추출된 콘텐츠:")
        print(f"- 메트릭: {len(story_data['metrics'])}개")
        print(f"- 콘텐츠 섹션: {len(story_data['content_sections'])}개")

        # 7. 전체 페이지 텍스트도 저장 (백업용)
        story_data['full_html'] = driver.page_source

        # 8. JSON 저장
        with open('supademo_raw.json', 'w', encoding='utf-8') as f:
            json.dump(story_data, f, ensure_ascii=False, indent=2)

        # 9. 읽기 쉬운 텍스트 파일로도 저장
        with open('supademo_content.txt', 'w', encoding='utf-8') as f:
            f.write(f"Title: {story_data['title']}\n\n")
            f.write("=" * 80 + "\n\n")

            if story_data['metrics']:
                f.write("Metrics:\n")
                for key, value in story_data['metrics'].items():
                    f.write(f"- {key}: {value}\n")
                f.write("\n" + "=" * 80 + "\n\n")

            f.write("Content:\n\n")
            for section in story_data['content_sections']:
                if section['type'] in ['h2', 'h3']:
                    f.write(f"\n## {section['text']}\n\n")
                else:
                    f.write(f"{section['text']}\n\n")

        print("\n✅ 저장 완료:")
        print("- supademo_raw.json (구조화된 데이터)")
        print("- supademo_content.txt (읽기 쉬운 텍스트)")

    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        import traceback
        traceback.print_exc()

    finally:
        driver.quit()
        print("\n✅ 브라우저 종료")

if __name__ == '__main__':
    scrape_supademo()

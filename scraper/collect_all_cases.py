#!/usr/bin/env python3
"""
Starter Story 전체 케이스 스터디 수집
- 모든 페이지 순회 (약 375페이지)
- 제목, URL, 매출, 설명 수집
- 진행상황 실시간 표시
"""

import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from datetime import datetime

def collect_all_cases():
    print("="*70, flush=True)
    print("🚀 Starter Story 전체 케이스 스터디 수집 시작", flush=True)
    print("="*70, flush=True)
    print(f"시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
    print(flush=True)

    # Chrome 설정
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # 백그라운드 실행
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')

    driver = webdriver.Chrome(options=chrome_options)

    all_cases = []
    page_num = 1
    total_pages = 375  # 예상 총 페이지 수

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
        print("✅ 쿠키 설정 완료\n", flush=True)

        # 페이지 순회
        while True:
            url = f'https://www.starterstory.com/explore?page={page_num}'
            driver.get(url)
            time.sleep(2)  # 로딩 대기

            # HTML 파싱
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            cards = soup.find_all('a', class_='database-story-result')

            # 카드가 없으면 종료
            if not cards:
                print(f"\n✅ 페이지 {page_num}에 더 이상 케이스가 없습니다. 수집 완료!")
                break

            # 각 케이스 정보 추출
            page_cases = []
            for card in cards:
                try:
                    # 제목
                    title_elem = card.find('div', class_='text-xl')
                    title = title_elem.text.strip() if title_elem else "제목 없음"

                    # URL
                    url_path = card.get('href', '')
                    full_url = f"https://www.starterstory.com{url_path}" if url_path.startswith('/') else url_path

                    # 매출 정보 (다양한 패턴)
                    revenue = "정보 없음"
                    revenue_patterns = [
                        card.find('div', class_='revenue'),
                        card.find('span', class_='revenue'),
                        card.find(text=lambda t: t and ('$' in t or 'K' in t or 'M' in t))
                    ]
                    for pattern in revenue_patterns:
                        if pattern:
                            revenue = pattern.text.strip() if hasattr(pattern, 'text') else str(pattern).strip()
                            break

                    # 설명
                    desc_elem = card.find('p') or card.find('div', class_='description')
                    description = desc_elem.text.strip() if desc_elem else "설명 없음"
                    # 설명 길이 제한
                    if len(description) > 200:
                        description = description[:200] + "..."

                    case_data = {
                        'title': title,
                        'url': full_url,
                        'revenue': revenue,
                        'description': description,
                        'page': page_num
                    }

                    page_cases.append(case_data)

                except Exception as e:
                    print(f"  ⚠️  케이스 파싱 에러: {e}")
                    continue

            # 페이지 케이스 추가
            all_cases.extend(page_cases)

            # 진행상황 출력
            progress = (page_num / total_pages) * 100
            print(f"[페이지 {page_num:3d}/{total_pages}] "
                  f"수집: {len(page_cases):2d}개 | "
                  f"총합: {len(all_cases):4d}개 | "
                  f"진행률: {progress:5.1f}%", flush=True)

            # 중간 저장 (50페이지마다)
            if page_num % 50 == 0:
                with open('all_cases_backup.json', 'w', encoding='utf-8') as f:
                    json.dump(all_cases, f, ensure_ascii=False, indent=2)
                print(f"  💾 백업 저장 완료 ({len(all_cases)}개)")

            page_num += 1

            # Rate limiting (너무 빠르면 차단될 수 있음)
            time.sleep(1)

            # 안전장치: 500페이지 이상이면 중단
            if page_num > 500:
                print("\n⚠️  500페이지 도달. 안전을 위해 중단합니다.")
                break

    except KeyboardInterrupt:
        print("\n\n⚠️  사용자가 중단했습니다.")
        print(f"현재까지 수집: {len(all_cases)}개")

    except Exception as e:
        print(f"\n❌ 에러 발생: {e}")
        import traceback
        traceback.print_exc()

    finally:
        driver.quit()

        # 최종 저장
        if all_cases:
            # JSON 저장
            with open('all_cases_complete.json', 'w', encoding='utf-8') as f:
                json.dump(all_cases, f, ensure_ascii=False, indent=2)

            # 읽기 쉬운 텍스트 저장
            with open('all_cases_list.txt', 'w', encoding='utf-8') as f:
                for i, case in enumerate(all_cases, 1):
                    f.write(f"{i}. {case['title']}\n")
                    f.write(f"   매출: {case['revenue']}\n")
                    f.write(f"   URL: {case['url']}\n")
                    f.write(f"   설명: {case['description']}\n")
                    f.write("\n")

            # CSV 저장 (스프레드시트용)
            import csv
            with open('all_cases.csv', 'w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=['title', 'revenue', 'url', 'description', 'page'])
                writer.writeheader()
                writer.writerows(all_cases)

            print("\n" + "="*70)
            print("✅ 수집 완료!")
            print("="*70)
            print(f"종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"총 수집: {len(all_cases)}개 케이스 스터디")
            print()
            print("저장된 파일:")
            print("  - all_cases_complete.json (전체 데이터)")
            print("  - all_cases_list.txt (읽기 쉬운 형식)")
            print("  - all_cases.csv (스프레드시트용)")
            print("="*70)

        return all_cases

if __name__ == '__main__':
    cases = collect_all_cases()
    print(f"\n🎯 최종 결과: {len(cases)}개의 케이스 스터디 수집 완료")

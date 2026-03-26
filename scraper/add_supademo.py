#!/usr/bin/env python3
"""
Supademo를 case-studies.json에 추가
"""

import json

# Supademo 데이터
supademo_entry = {
    "id": "supademo",
    "title": "데모 앱으로 월 2억 4천만원 만드는 법",
    "koreanTitle": "PPT는 지루하고, 영상은 며칠 걸리고: AI 데모 플랫폼 Supademo의 Product-Led Growth 전략",
    "byline": "By Joseph Lee",
    "url": "https://supademo.com/",
    "mrr": "월 2억 4천만원",
    "launchDate": "2023년 5월",
    "thumbnailImage": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop",
    "tags": [
        "소프트웨어",
        "B2B SaaS",
        "AI"
    ],
    "metrics": [
        {
            "label": "Difficulty",
            "value": "3/5",
            "insight": "NextJS + Prisma 기반 기본 스택으로 MVP 가능. AI 음성 해설 및 현지화는 외부 API 활용"
        },
        {
            "label": "AI Leverage",
            "value": "80%",
            "insight": "음성 해설, 데모 데이터 생성, 현지화 버전 자동 생성 등 핵심 기능 대부분 AI 기반"
        },
        {
            "label": "Market Advantage",
            "value": "Product-Led Virality",
            "insight": "모든 데모 공유가 미니 광고판. 광고비 0원으로 100,000+ 사용자 확보"
        }
    ],
    "executiveSummary": [
        "6년간 복잡한 B2B 제품을 설명하며 겪었던 고통. PPT는 지루하고, 영상은 제작에 며칠이 걸리고, 제품 업데이트하면 처음부터 다시. 하지만 라이브로 클릭 단위로 보여주면 고객의 눈빛이 달라졌다.",
        "NextJS + Prisma로 첫 MVP 개발. 광고비 0원으로 시작해 제품 자체가 광고판이 되는 바이럴 루프 설계. Reddit에 '무료로 데모 만들어드립니다' 포스팅 하나로 11,000 조회수, 수백 댓글, 유료 전환.",
        "월 $12에 5석 제공하는 실수를 깨닫고 가격 재조정. 경쟁사 분석보다 고객 지원에 올인. 지원팀을 비용이 아닌 차별화 무기로. 이제 연 매출 mid-7-figure ARR, 100개국 10만+ 사용자, G2 선정 5위 가장 빠르게 성장하는 소프트웨어."
    ],
    "content": "raw-content/supademo.txt 파일 참조"
}

# JSON 파일 읽기
json_path = '../site/src/data/case-studies.json'

with open(json_path, 'r', encoding='utf-8') as f:
    case_studies = json.load(f)

# Supademo 추가
case_studies.append(supademo_entry)

# JSON 파일 저장
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(case_studies, f, ensure_ascii=False, indent=2)

print(f"✅ Supademo 추가 완료!")
print(f"📊 총 케이스 스터디: {len(case_studies)}개")

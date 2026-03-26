#!/usr/bin/env python3
"""
스크래퍼 공통 유틸리티 함수
"""

import os
import re


def get_next_file_number(content_dir='../raw-content'):
    """
    raw-content 디렉토리에서 가장 높은 번호를 찾아 다음 번호 반환

    Args:
        content_dir: 파일이 저장된 디렉토리 경로

    Returns:
        int: 다음 파일 번호 (기존 파일 없으면 1부터 시작)

    Example:
        >>> get_next_file_number('../raw-content')
        29  # 28개 파일이 있으면 29를 반환
    """
    if not os.path.exists(content_dir):
        os.makedirs(content_dir, exist_ok=True)
        return 1

    max_num = 0
    try:
        for filename in os.listdir(content_dir):
            # "01-", "02-" 같은 패턴에서 숫자 추출
            match = re.match(r'^(\d+)-', filename)
            if match:
                num = int(match.group(1))
                max_num = max(max_num, num)
    except Exception as e:
        print(f"⚠️  파일 번호 확인 중 에러: {e}")
        return 1

    return max_num + 1


def generate_numbered_filename(base_name, file_number, extension='.txt'):
    """
    번호가 포함된 파일명 생성

    Args:
        base_name: 기본 파일명 (URL slug 등)
        file_number: 파일 번호
        extension: 파일 확장자 (기본값: .txt)

    Returns:
        str: 번호가 포함된 파일명

    Example:
        >>> generate_numbered_filename('my-blog-post', 5)
        '05-my-blog-post.txt'
    """
    # 기존 파일명에서 번호 제거 (이미 있는 경우)
    base_name = re.sub(r'^\d+-', '', base_name)

    # 확장자 제거 (이미 있는 경우)
    base_name = base_name.replace(extension, '')

    # 번호 포맷 (2자리 숫자)
    return f"{file_number:02d}-{base_name}{extension}"


def save_content_to_file(content, filename, content_dir='../raw-content'):
    """
    콘텐츠를 파일로 저장

    Args:
        content: 저장할 콘텐츠 (문자열 또는 리스트)
        filename: 파일명
        content_dir: 저장 디렉토리

    Returns:
        str: 저장된 파일 경로
    """
    os.makedirs(content_dir, exist_ok=True)
    filepath = os.path.join(content_dir, filename)

    # 리스트면 join
    if isinstance(content, list):
        content = '\n'.join(content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    return filepath


if __name__ == '__main__':
    # 테스트
    print("현재 다음 파일 번호:", get_next_file_number('../raw-content'))
    print("생성된 파일명:", generate_numbered_filename('test-blog-post', 29))

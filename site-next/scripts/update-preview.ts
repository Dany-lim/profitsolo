import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = resolve(import.meta.dirname || __dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  process.env[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { error } = await supabase
    .from('case_studies')
    .update({
      product_preview: {
        title: 'Lancer AI 에이전트 체험하기',
        localImage: '',
        steps: [
          { label: '일자리 검색', desc: 'Upwork에 쏟아지는 수만 개 일자리 자동 탐색' },
          { label: '조건 확인', desc: '스킬과 자격에 맞는 공고만 AI가 선별' },
          { label: '입찰 자동화', desc: '맞춤형 제안서 생성 및 자동 입찰 전송' },
        ],
      },
    })
    .eq('id', 'lancer-ai-10k-bootstrapped-success');

  if (error) {
    console.error('업데이트 실패:', error);
  } else {
    console.log('product_preview 업데이트 완료');
  }
}
main();

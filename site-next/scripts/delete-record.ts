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

const targetId = process.argv[2];
if (!targetId) {
  console.error('Usage: npx tsx scripts/delete-record.ts <id>');
  process.exit(1);
}

async function main() {
  const { error } = await supabase.from('case_studies').delete().eq('id', targetId);
  if (error) {
    console.error('삭제 실패:', error);
  } else {
    console.log('삭제 완료:', targetId);
  }
}
main();

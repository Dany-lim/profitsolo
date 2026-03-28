import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = resolve(import.meta.dirname || __dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  process.env[t.substring(0, eq)] = t.substring(eq + 1);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const id = process.argv[2];
if (!id) { console.error('Usage: npx tsx scripts/fetch-post.ts <id>'); process.exit(1); }

async function main() {
  const { data } = await sb.from('case_studies').select('id, title, category, source_url, content').eq('id', id).single();
  if (!data) { console.log('NOT FOUND'); return; }
  console.log('ID:', data.id);
  console.log('Title:', data.title);
  console.log('Category:', data.category);
  console.log('Source URL:', data.source_url);
  console.log('Content length:', data.content?.length);
  console.log('---');
  console.log(data.content?.substring(0, 500));
}
main();

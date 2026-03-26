import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { data, error } = await supabase
    .from('case_studies')
    .select('id')
    .eq('published', true)
    .limit(3);

  return NextResponse.json({
    env: { hasUrl, hasKey },
    query: { count: data?.length ?? 0, error: error?.message ?? null },
  });
}

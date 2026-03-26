import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// .env.local 로드
dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../data/case-studies.json');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL 또는 Key가 .env.local에 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('🚀 마이그레이션 시작: JSON -> Supabase');

  try {
    const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
    const caseStudies = JSON.parse(rawData);

    console.log(`📊 총 ${caseStudies.length}개의 데이터를 처리합니다...`);

    for (const study of caseStudies) {
      const { error } = await supabase
        .from('case_studies')
        .upsert({
          id: study.id,
          title: study.title,
          korean_title: study.koreanTitle,
          byline: study.byline,
          url: study.url,
          mrr: study.mrr,
          launch_date: study.launchDate,
          thumbnail_image: study.thumbnailImage,
          tags: study.tags,
          metrics: study.metrics,
          executive_summary: study.executiveSummary,
          product_preview: study.productPreview,
          k_market_strategy: study.kMarketStrategy,
          enriched_content: study.enrichedContent,
          published: study.published ?? false,
          seo: study.seo,
          content: study.content,
        });

      if (error) {
        console.error(`❌ 에러 발생 (ID: ${study.id}):`, error.message);
      } else {
        console.log(`✅ 성공: ${study.title}`);
      }
    }

    console.log('\n✨ 마이그레이션 완료!');
  } catch (err) {
    console.error('💥 치명적 에러:', err);
  }
}

migrate();

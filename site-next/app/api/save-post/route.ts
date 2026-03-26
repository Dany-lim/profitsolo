import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const updatedPost = await request.json();
    let currentId = updatedPost.id;
    const isNewPost = currentId.startsWith('new-');

    if (isNewPost) {
      // Generate a proper ID from the title
      const baseSlug = updatedPost.title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);

      // Check for uniqueness
      const { data: existing } = await supabaseAdmin
        .from('case_studies')
        .select('id')
        .ilike('id', `${baseSlug}%`);
      
      let finalId = baseSlug;
      if (existing && existing.length > 0) {
        finalId = `${baseSlug}-${existing.length + 1}`;
      }
      currentId = finalId;
    }

    const supabaseData = {
      id: currentId,
      title: updatedPost.title,
      korean_title: updatedPost.koreanTitle,
      byline: updatedPost.byline,
      url: updatedPost.url,
      mrr: updatedPost.mrr,
      launch_date: updatedPost.launchDate,
      thumbnail_image: updatedPost.thumbnailImage,
      tags: updatedPost.tags,
      metrics: updatedPost.metrics,
      executive_summary: updatedPost.executiveSummary,
      product_preview: updatedPost.productPreview,
      k_market_strategy: updatedPost.kMarketStrategy,
      enriched_content: updatedPost.enrichedContent,
      published: updatedPost.published ?? false,
      seo: updatedPost.seo,
      content: updatedPost.content,
    };

    const { error } = await supabaseAdmin
      .from('case_studies')
      .upsert(supabaseData);

    if (error) throw error;

    return NextResponse.json({ success: true, data: { ...updatedPost, id: currentId }, isNew: isNewPost });
  } catch (error) {
    console.error('Error saving post:', error);
    return NextResponse.json(
      { error: 'Failed to save post' },
      { status: 500 }
    );
  }
}


import { supabase } from './supabase';
import { CaseStudy } from '@/types/case-study';

const mapCaseStudy = (item: any): CaseStudy => ({
  id: item.id,
  title: item.title,
  koreanTitle: item.korean_title,
  byline: item.byline,
  url: item.url,
  mrr: item.mrr,
  launchDate: item.launch_date,
  thumbnailImage: item.thumbnail_image,
  tags: item.tags || [],
  category: item.category || 'case-study',
  metrics: item.metrics || [],
  executiveSummary: item.executive_summary || [],
  productPreview: item.product_preview || {},
  kMarketStrategy: item.k_market_strategy || {},
  sourceTitle: item.source_title,
  sourceUrl: item.source_url,
  enrichedContent: item.enriched_content,
  published: item.published,
  seo: item.seo || {},
  content: item.content,
});

export async function getAllCaseStudies(): Promise<CaseStudy[]> {
  const { data, error } = await supabase
    .from('case_studies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching case studies:', error.message);
    return [];
  }

  return (data || []).map(mapCaseStudy);
}

export async function getPublishedCaseStudies(): Promise<CaseStudy[]> {
  const { data, error } = await supabase
    .from('case_studies')
    .select('*')
    .eq('published', true)
    .or('category.is.null,category.eq.case-study')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching published case studies:', error.message);
    return [];
  }

  return (data || []).map(mapCaseStudy);
}

export async function getPublishedIdeas(): Promise<CaseStudy[]> {
  const { data, error } = await supabase
    .from('case_studies')
    .select('*')
    .eq('published', true)
    .eq('category', 'idea')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching published ideas:', error.message);
    return [];
  }

  return (data || []).map(mapCaseStudy);
}

export async function getCaseStudyById(id: string): Promise<CaseStudy | null> {
  const { data, error } = await supabase
    .from('case_studies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found error code
       console.error(`Error fetching case study (ID: ${id}):`, error.message);
    }
    return null;
  }

  return data ? mapCaseStudy(data) : null;
}

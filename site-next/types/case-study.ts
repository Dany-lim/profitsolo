export interface Metric {
  label: string;
  value: string;
  insight: string;
}

export interface ProductStep {
  label: string;
  desc: string;
}

export interface ProductPreview {
  title: string;
  localImage: string;
  steps: ProductStep[];
}

export interface MarketStrategy {
  why: string;
  willItWork: string;
}

export interface SeoData {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  focusKeyword?: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  koreanTitle: string;
  byline: string;
  url: string;
  mrr: string;
  launchDate: string;
  thumbnailImage: string;
  tags: string[];
  metrics?: Metric[];
  executiveSummary?: string[];
  productPreview?: ProductPreview;
  kMarketStrategy?: MarketStrategy;
  sourceTitle?: string;
  sourceUrl?: string;
  enrichedContent?: string;
  published?: boolean;
  seo?: SeoData;
  content: string;
}

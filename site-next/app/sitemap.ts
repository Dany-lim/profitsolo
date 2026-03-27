import { MetadataRoute } from 'next';
import { getPublishedCaseStudies, getPublishedIdeas } from '@/lib/data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://profitsolo.net';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const studies = await getPublishedCaseStudies();
  const ideas = await getPublishedIdeas();

  const casePages = studies.map((study) => ({
    url: `${SITE_URL}/case/${study.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const ideaPages = ideas.map((idea) => ({
    url: `${SITE_URL}/ideas/${idea.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/ideas`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/projects`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...casePages,
    ...ideaPages,
  ];
}

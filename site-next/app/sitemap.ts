import { MetadataRoute } from 'next';
import { getPublishedCaseStudies } from '@/lib/data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://profitsolo.net';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const studies = await getPublishedCaseStudies();


  const casePages = studies.map((study) => ({
    url: `${SITE_URL}/case/${study.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...casePages,
  ];
}

import { MetadataRoute } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { CaseStudy } from '@/types/case-study';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://profitsolo.net';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const filePath = path.join(process.cwd(), 'data', 'case-studies.json');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const allStudies = JSON.parse(fileContent) as CaseStudy[];
  const studies = allStudies.filter(s => s.published !== false);

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

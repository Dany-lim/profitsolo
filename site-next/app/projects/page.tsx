import type { Metadata } from 'next';
import { ProjectsContent } from '@/components/projects-content';

export const metadata: Metadata = {
  title: '우리가 만든 것들 | Startup Radar',
  description:
    '케이스 스터디에서 발견한 인사이트로 직접 만든 서비스들. 아이디어를 현실로 바꾼 프로젝트를 소개합니다.',
  openGraph: {
    title: '우리가 만든 것들 | Startup Radar',
    description:
      '케이스 스터디에서 발견한 인사이트로 직접 만든 서비스들.',
    type: 'website',
  },
};

export default function ProjectsPage() {
  return <ProjectsContent />;
}

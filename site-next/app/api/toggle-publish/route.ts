import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'data', 'case-studies.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const caseStudies = JSON.parse(fileContent);

    const study = caseStudies.find((s: any) => s.id === id);

    if (!study) {
      return NextResponse.json(
        { error: 'Case study not found' },
        { status: 404 }
      );
    }

    study.published = !study.published;

    await fs.writeFile(filePath, JSON.stringify(caseStudies, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      published: study.published,
    });
  } catch (error) {
    console.error('Error toggling publish:', error);
    return NextResponse.json(
      { error: 'Failed to toggle publish status' },
      { status: 500 }
    );
  }
}

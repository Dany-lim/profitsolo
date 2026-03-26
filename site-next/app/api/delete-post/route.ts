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

    // Read current case studies
    const filePath = path.join(process.cwd(), 'data', 'case-studies.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const caseStudies = JSON.parse(fileContent);

    // Find the index
    const index = caseStudies.findIndex((study: any) => study.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Case study not found' },
        { status: 404 }
      );
    }

    // Remove the study
    caseStudies.splice(index, 1);

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(caseStudies, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}

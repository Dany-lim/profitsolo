import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const updatedPost = await request.json();

    // Read current case studies
    const filePath = path.join(process.cwd(), 'data', 'case-studies.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const caseStudies = JSON.parse(fileContent);

    // Check if this is a new post (ID starts with "new-")
    const isNewPost = updatedPost.id.startsWith('new-');

    if (isNewPost) {
      // Generate a proper ID from the title
      const newId = updatedPost.title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);

      // Make sure the ID is unique
      let finalId = newId;
      let counter = 1;
      while (caseStudies.some((s: any) => s.id === finalId)) {
        finalId = `${newId}-${counter}`;
        counter++;
      }

      updatedPost.id = finalId;
      if (updatedPost.published === undefined) {
        updatedPost.published = false;
      }

      // Add the new post to the beginning of the array
      caseStudies.unshift(updatedPost);
    } else {
      // Find and update existing post
      const index = caseStudies.findIndex((study: any) => study.id === updatedPost.id);

      if (index === -1) {
        return NextResponse.json(
          { error: 'Case study not found' },
          { status: 404 }
        );
      }

      // Update the study
      caseStudies[index] = { ...caseStudies[index], ...updatedPost };
    }

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(caseStudies, null, 2), 'utf-8');

    return NextResponse.json({ success: true, data: updatedPost, isNew: isNewPost });
  } catch (error) {
    console.error('Error saving post:', error);
    return NextResponse.json(
      { error: 'Failed to save post' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();

    // Vercel Blob 토큰이 있으면 클라우드 업로드, 없으면 로컬 저장
    if (process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN !== '여기에_토큰_입력') {
      const filename = `startup-radar/${timestamp}-${file.name}`;
      const blob = await put(filename, file, { access: 'public' });
      return NextResponse.json({ success: true, url: blob.url });
    }

    // 로컬 폴백
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const extension = path.extname(file.name) || '.png';
    const filename = `${timestamp}${extension}`;
    const filepath = path.join(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    return NextResponse.json({ success: true, url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

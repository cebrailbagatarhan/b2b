import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/authorization';
import { AuthorizationError } from '@/lib/session';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 64 * 1024;
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === 'image/webp') {
    return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(['SUPERADMIN', 'WAREHOUSE']);

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
      return NextResponse.json(
        { success: false, error: 'İstek multipart/form-data olmalıdır.' },
        { status: 415 }
      );
    }

    const contentLengthHeader = request.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
        return NextResponse.json(
          { success: false, error: 'Geçersiz istek boyutu.' },
          { status: 400 }
        );
      }
      if (contentLength > MAX_REQUEST_SIZE) {
        return NextResponse.json(
          { success: false, error: 'Yükleme isteği boyut sınırını aşıyor.' },
          { status: 413 }
        );
      }
    }

    const data = await request.formData();
    const file = data.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Dosya bulunamadı.' }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Görsel boyutu 5 MB sınırını aşamaz.' },
        { status: 413 }
      );
    }

    const extension = ALLOWED_IMAGE_TYPES[file.type as keyof typeof ALLOWED_IMAGE_TYPES];
    if (!extension) {
      return NextResponse.json(
        { success: false, error: 'Yalnızca JPEG, PNG veya WebP görsel yüklenebilir.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!hasValidImageSignature(buffer, file.type)) {
      return NextResponse.json(
        { success: false, error: 'Dosya içeriği geçerli bir görsel değil.' },
        { status: 400 }
      );
    }

    const filename = `${randomUUID()}.${extension}`;
    
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    await mkdir(uploadDir, { recursive: true });

    const path = join(uploadDir, filename);
    await writeFile(path, buffer, { flag: 'wx' });

    return NextResponse.json({ 
      success: true, 
      url: `/uploads/${filename}` 
    });
    
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: 'Dosya yükleme hatası.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireVerifiedSession } from '@/lib/authorization';
import { AuthorizationError } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await requireVerifiedSession();
    if (session.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Yalnızca müşteri hesapları bu listeyi kullanabilir.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const productId = typeof body.productId === 'string' ? body.productId : '';
    const customerId = session.userId;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Eksik bilgi' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Ürün bulunamadı' }, { status: 404 });
    }

    if (product.stockQuantity > 0) {
      return NextResponse.json(
        { success: false, error: 'Ürün şu anda stokta.' },
        { status: 409 }
      );
    }

    const existing = await prisma.waitlist.findFirst({
      where: { productId, customerId }
    });

    if (existing) {
      return NextResponse.json({ success: true, message: 'Zaten listeye eklisiniz.' });
    }

    await prisma.waitlist.create({
      data: {
        productId,
        customerId
      }
    });

    return NextResponse.json({ success: true, message: 'Başarıyla listeye eklendi.' });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: true, message: 'Zaten listeye eklisiniz.' });
    }
    console.error('Waitlist API error:', error);
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}

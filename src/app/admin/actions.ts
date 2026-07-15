'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/authorization';
import { AuthorizationError } from '@/lib/session';
import { hasOrderIntegritySchema } from '@/lib/customer-schema-compat';
import {
  canRoleSetStatus,
  cancellationEffects,
  isTransitionAllowed,
  parseOrderStatus,
} from '@/lib/order-status';

class AdminActionError extends Error {}

function isSafeWebPathOrUrl(value: string) {
  if (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !/[\r\n]/.test(value)
  ) return true;

  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function adminActionError(error: unknown, operation: string) {
  if (error instanceof AuthorizationError) return error.message;

  console.error(`${operation} failed:`, error);
  return 'İşlem tamamlanamadı.';
}

export async function getBanners() {
  await requireAdmin(['SUPERADMIN']);
  return await prisma.banner.findMany({
    orderBy: { orderIndex: 'asc' },
  });
}

export async function createBanner(data: {
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
}) {
  try {
    await requireAdmin(['SUPERADMIN']);
    const title = data.title?.trim();
    const subtitle = data.subtitle?.trim();
    const imageUrl = data.imageUrl?.trim();
    const linkUrl = data.linkUrl?.trim();

    if (
      !title ||
      title.length > 160 ||
      (subtitle && subtitle.length > 500) ||
      !imageUrl ||
      imageUrl.length > 2_048 ||
      !isSafeWebPathOrUrl(imageUrl) ||
      (linkUrl && (linkUrl.length > 2_048 || !isSafeWebPathOrUrl(linkUrl)))
    ) {
      return { success: false, error: 'Afiş bilgileri geçersiz.' };
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle,
        imageUrl,
        linkUrl,
        isActive: true,
      },
    });
    revalidatePath('/');
    revalidatePath('/admin/gorseller');
    return { success: true, banner };
  } catch (error: unknown) {
    return { success: false, error: adminActionError(error, 'Create banner') };
  }
}

export async function deleteBanner(id: string) {
  try {
    await requireAdmin(['SUPERADMIN']);
    if (typeof id !== 'string' || !id.trim() || id.length > 128) {
      return { success: false, error: 'Afiş kimliği geçersiz.' };
    }
    await prisma.banner.delete({ where: { id } });
    revalidatePath('/');
    revalidatePath('/admin/gorseller');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: adminActionError(error, 'Delete banner') };
  }
}

export async function updateOrderStatus(orderId: string, nextStatusRaw: string) {
  try {
    const admin = await requireAdmin(['SUPERADMIN', 'WAREHOUSE', 'ACCOUNTING']);

    if (typeof orderId !== 'string' || !orderId.trim() || orderId.length > 128) {
      return { success: false as const, error: 'Sipariş kimliği geçersiz.' };
    }

    const nextStatus = parseOrderStatus(nextStatusRaw);
    if (!nextStatus) {
      return { success: false as const, error: 'Sipariş durumu geçersiz.' };
    }
    if (!canRoleSetStatus(admin.adminRole, nextStatus)) {
      return { success: false as const, error: 'Bu durum değişikliği için yetkiniz yok.' };
    }
    if (!(await hasOrderIntegritySchema())) {
      return {
        success: false as const,
        error: 'Sipariş altyapısı için veritabanı geçişi henüz tamamlanmadı.',
      };
    }

    await prisma.$transaction(
      async (transaction) => {
        const order = await transaction.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            status: true,
            paymentMethod: true,
            totalAmount: true,
            customerId: true,
            items: {
              select: { productId: true, quantity: true, unitMultiplier: true },
            },
          },
        });

        if (!order) {
          throw new AdminActionError('Sipariş bulunamadı.');
        }

        const currentStatus = parseOrderStatus(order.status);
        if (!currentStatus) {
          throw new AdminActionError('Siparişin mevcut durumu tanınmıyor.');
        }
        if (!isTransitionAllowed(currentStatus, nextStatus)) {
          throw new AdminActionError(
            'Bu sipariş mevcut durumundan seçilen duruma geçirilemez.'
          );
        }

        if (nextStatus === 'CANCELLED') {
          // Legacy orders carry no item snapshots, so their stock and balance
          // cannot be reversed automatically. Refuse instead of guessing.
          if (order.items.length === 0) {
            throw new AdminActionError(
              'Kalem snapshot’ı olmayan eski sipariş otomatik iptal edilemez; manuel düzeltme gerekir.'
            );
          }

          for (const item of order.items) {
            if (!item.productId) continue;
            await transaction.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  increment: item.quantity * item.unitMultiplier,
                },
              },
            });
          }

          const effects = cancellationEffects(order);
          if (effects.balanceDelta !== 0) {
            await transaction.customer.update({
              where: { id: order.customerId },
              data: { balance: { increment: effects.balanceDelta } },
            });
          }
        }

        // Status filter guards against a concurrent transition on the same order.
        const updated = await transaction.order.updateMany({
          where: { id: order.id, status: order.status },
          data: { status: nextStatus },
        });
        if (updated.count !== 1) {
          throw new AdminActionError(
            'Sipariş bu sırada başka bir işlem tarafından değiştirildi. Sayfayı yenileyin.'
          );
        }
      },
      { isolationLevel: 'Serializable' }
    );

    revalidatePath('/admin/siparisler');
    revalidatePath('/siparis-takip');
    return { success: true as const, status: nextStatus };
  } catch (error: unknown) {
    if (error instanceof AdminActionError) {
      return { success: false as const, error: error.message };
    }
    return {
      success: false as const,
      error: adminActionError(error, 'Update order status'),
    };
  }
}

export async function deleteProduct(id: string) {
  try {
    await requireAdmin(['SUPERADMIN', 'WAREHOUSE']);
    if (typeof id !== 'string' || !id.trim() || id.length > 128) {
      return { success: false, error: 'Ürün kimliği geçersiz.' };
    }
    await prisma.$transaction(async (tx) => {
      await tx.productPrice.deleteMany({ where: { productId: id } });
      await tx.productUnit.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
    revalidatePath('/');
    revalidatePath('/admin/urunler');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: adminActionError(error, 'Delete product') };
  }
}

export async function createFullProduct(data: {
  stockCode: string;
  name: string;
  description?: string;
  categoryId: string;
  imageUrl?: string;
  price: number;
  unitName: string;
  multiplier: number;
  stockQuantity: number;
  minStockLevel: number;
}) {
  try {
    await requireAdmin(['SUPERADMIN', 'WAREHOUSE']);

    if (
      !data.stockCode.trim() ||
      data.stockCode.trim().length > 64 ||
      !data.name.trim() ||
      data.name.trim().length > 240 ||
      (data.description?.trim().length ?? 0) > 5_000 ||
      !data.categoryId?.trim() ||
      data.categoryId.length > 128 ||
      !data.unitName?.trim() ||
      data.unitName.trim().length > 80 ||
      !Number.isFinite(data.price) ||
      data.price < 0 ||
      data.price > 100_000_000 ||
      !Number.isInteger(data.multiplier) ||
      data.multiplier < 1 ||
      data.multiplier > 1_000_000 ||
      !Number.isInteger(data.stockQuantity) ||
      data.stockQuantity < 0 ||
      data.stockQuantity > 2_000_000_000 ||
      !Number.isInteger(data.minStockLevel) ||
      data.minStockLevel < 0 ||
      data.minStockLevel > 2_000_000_000 ||
      (data.imageUrl &&
        (data.imageUrl.length > 2_048 || !isSafeWebPathOrUrl(data.imageUrl)))
    ) {
      return { success: false, error: 'Ürün bilgileri geçersiz.' };
    }

    const product = await prisma.$transaction(async (tx) => {
      // Create base product
      const newProduct = await tx.product.create({
        data: {
          stockCode: data.stockCode.trim(),
          name: data.name.trim(),
          description: data.description?.trim(),
          categoryId: data.categoryId,
          imageUrl: data.imageUrl,
          stockQuantity: data.stockQuantity,
          minStockLevel: data.minStockLevel,
        },
      });

      // Create price
      await tx.productPrice.create({
        data: {
          productId: newProduct.id,
          price: data.price,
          currency: 'TRY',
        },
      });

      // Create unit
      await tx.productUnit.create({
        data: {
          productId: newProduct.id,
          unitName: data.unitName.trim(),
          multiplier: data.multiplier,
        },
      });

      return newProduct;
    });

    revalidatePath('/');
    revalidatePath('/admin/urunler');
    return { success: true, product };
  } catch (error: unknown) {
    return { success: false, error: adminActionError(error, 'Create product') };
  }
}

'use server';

import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { generateForecast, MonthlySales } from '@/lib/forecast';
import { requireAdmin } from '@/lib/authorization';

export async function getDashboardStats() {
  await requireAdmin(['SUPERADMIN']);
  const [totalProducts, totalCustomers, totalOrders, orders] = await Promise.all([
    prisma.product.count(),
    prisma.customer.count(),
    prisma.order.count(),
    prisma.order.findMany({
      where: {
        status: { in: ['PAID', 'COMPLETED', 'APPROVED'] }
      },
      select: { totalAmount: true }
    })
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return {
    totalProducts,
    totalCustomers,
    totalOrders,
    totalRevenue
  };
}

export async function getSalesForecastData() {
  await requireAdmin(['SUPERADMIN']);
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['PAID', 'COMPLETED', 'APPROVED'] }
    },
    select: {
      createdAt: true,
      totalAmount: true
    },
    orderBy: { createdAt: 'asc' }
  });

  // Group by YYYY-MM
  const monthlyMap: Record<string, number> = {};
  
  orders.forEach(o => {
    const monthKey = format(o.createdAt, 'yyyy-MM');
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + o.totalAmount;
  });

  const historicalData: MonthlySales[] = Object.keys(monthlyMap)
    .sort()
    .map(month => ({
      month,
      amount: monthlyMap[month]
    }));

  const forecast = generateForecast(historicalData, 3); // Predict next 3 months

  // Format month names for display (e.g. "Oca 2024")
  return forecast.map(f => {
    const d = new Date(f.month + "-01");
    return {
      name: format(d, 'MMM yyyy', { locale: tr }),
      Gerçekleşen: f.actual ? Math.round(f.actual) : null,
      Tahmin: f.predicted ? Math.round(f.predicted) : null,
    };
  });
}

export async function getTopCustomers() {
  await requireAdmin(['SUPERADMIN']);
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['PAID', 'COMPLETED', 'APPROVED'] }
    },
    select: {
      customerId: true,
      totalAmount: true,
      customer: {
        select: { name: true }
      }
    }
  });

  const customerMap: Record<string, { name: string, total: number }> = {};

  orders.forEach(o => {
    if (o.customerId) {
      if (!customerMap[o.customerId]) {
        customerMap[o.customerId] = { name: o.customer?.name || 'Bilinmeyen', total: 0 };
      }
      customerMap[o.customerId].total += o.totalAmount;
    }
  });

  return Object.values(customerMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5); // Top 5
}

export async function getLowStockProducts() {
  await requireAdmin(['SUPERADMIN']);
  return await prisma.product.findMany({
    where: {
      stockQuantity: {
        lte: 10
      }
    },
    select: {
      id: true,
      name: true,
      stockCode: true,
      stockQuantity: true,
      minStockLevel: true
    },
    take: 10,
    orderBy: { stockQuantity: 'asc' }
  });
}

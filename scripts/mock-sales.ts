import { PrismaClient } from '@prisma/client';
import { subMonths } from 'date-fns';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Generating mock sales data...');
  
  // Find a customer
  const customer = await prisma.customer.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, discountRate: true },
  });
  if (!customer) {
    console.log('No active customer found. Run seed.ts and approve the demo customer first.');
    return;
  }

  const product = await prisma.product.findFirst({
    where: {
      prices: { some: { currency: 'TRY' } },
      units: { some: {} },
    },
    select: {
      id: true,
      stockCode: true,
      name: true,
      prices: {
        where: { currency: 'TRY' },
        orderBy: { id: 'asc' },
        take: 1,
        select: { price: true, currency: true },
      },
      units: {
        orderBy: { id: 'asc' },
        take: 1,
        select: { id: true, unitName: true, multiplier: true },
      },
    },
  });
  if (!product || product.prices.length !== 1 || product.units.length !== 1) {
    console.log('No product with a TRY price and order unit found. Run seed.ts first.');
    return;
  }

  const price = product.prices[0];
  const unit = product.units[0];
  if (
    !Number.isFinite(price.price) ||
    price.price <= 0 ||
    !Number.isSafeInteger(unit.multiplier) ||
    unit.multiplier < 1
  ) {
    console.log('The selected product price or unit multiplier is invalid.');
    return;
  }
  const discountRate =
    Number.isFinite(customer.discountRate) &&
    customer.discountRate >= 0 &&
    customer.discountRate <= 1
      ? customer.discountRate
      : 0;
  const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

  // Create 24 months of data (last 2 years) to show a good trend and forecast
  const today = new Date();
  
  for (let i = 24; i >= 0; i--) {
    const targetDate = subMonths(today, i);
    // Base amount between 10k and 30k
    let amount = 10000 + Math.random() * 20000;
    
    // Add some trend (increase over time)
    amount += (24 - i) * 1500;

    // Add some seasonality (bump in summer months e.g., month 5,6,7)
    const month = targetDate.getMonth();
    if (month >= 5 && month <= 7) {
      amount *= 1.4;
    }
    // Dip in winter
    if (month >= 11 || month <= 1) {
      amount *= 0.7;
    }

    const unitPrice = roundCurrency(price.price * unit.multiplier);
    const quantity = Math.max(1, Math.round(amount / unitPrice));
    const subtotalAmount = roundCurrency(unitPrice * quantity);
    const discountAmount = roundCurrency(subtotalAmount * discountRate);
    const totalAmount = roundCurrency(subtotalAmount - discountAmount);

    // Historical analytics fixtures do not reserve current stock. They still use
    // the same immutable financial and product snapshots as a real order.
    await prisma.order.create({
      data: {
        customerId: customer.id,
        idempotencyKey: randomUUID(),
        status: 'PAID',
        paymentMethod: 'TRANSFER',
        subtotalAmount,
        discountRate,
        discountAmount,
        totalAmount,
        currency: price.currency,
        createdAt: targetDate,
        updatedAt: targetDate,
        items: {
          create: {
            productId: product.id,
            unitId: unit.id,
            stockCode: product.stockCode,
            productName: product.name,
            unitName: unit.unitName,
            quantity,
            unitMultiplier: unit.multiplier,
            unitPrice,
            subtotalAmount,
            discountAmount,
            totalAmount,
            currency: price.currency,
            createdAt: targetDate,
          },
        },
      }
    });
  }

  console.log('Mock sales data inserted successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

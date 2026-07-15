'use client';

import { useEffect, useState } from 'react';
import { Package, Users, ShoppingCart, TrendingUp } from 'lucide-react';
import { getDashboardStats, getSalesForecastData, getTopCustomers, getLowStockProducts } from './dashboard-actions';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

type ForecastPoint = Awaited<ReturnType<typeof getSalesForecastData>>[number];
type TopCustomer = Awaited<ReturnType<typeof getTopCustomers>>[number];
type LowStockProduct = Awaited<ReturnType<typeof getLowStockProducts>>[number];

export default function AdminDashboardClient() {
  const [stats, setStats] = useState({ totalProducts: 0, totalCustomers: 0, totalOrders: 0, totalRevenue: 0 });
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [s, f, t, l] = await Promise.all([
        getDashboardStats(),
        getSalesForecastData(),
        getTopCustomers(),
        getLowStockProducts()
      ]);
      setStats(s);
      setForecastData(f);
      setTopCustomers(t);
      setLowStock(l);
      setLoading(false);
    }
    loadData();
  }, []);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

  if (loading) return <div style={{ padding: '2rem' }}>Dashboard yükleniyor...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Genel Bakış</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Toplam Ciro</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{formatPrice(stats.totalRevenue)}</p>
          </div>
        </div>
        
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
            <ShoppingCart size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Toplam Sipariş</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{stats.totalOrders}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <Package size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Aktif Ürünler</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{stats.totalProducts}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', backgroundColor: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d946ef' }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Kayıtlı Müşteri</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{stats.totalCustomers}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>Aylık Satış Trendi & Gelecek Tahmini</h2>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${value / 1000}k ₺`} />
                <Tooltip 
                  formatter={(value) => [formatPrice(Number(value)), '']}
                  contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="Gerçekleşen" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 0}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="Tahmin" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" dot={{r: 4, fill: '#10b981', strokeWidth: 0}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>En İyi Müşteriler</h2>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomers} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${value / 1000}k`} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontSize: 12}} width={100} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  formatter={(value) => [formatPrice(Number(value)), 'Ciro']}
                  contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>Kritik Stoktaki Ürünler</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {lowStock.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Kritik stokta ürün bulunmuyor.</p>
            ) : (
              lowStock.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#fff', border: '1px solid #fee2e2', borderRadius: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: 500, color: '#0f172a' }}>{item.name}</p>
                    <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Stok Kodu: {item.stockCode}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>
                      Kalan: {item.stockQuantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

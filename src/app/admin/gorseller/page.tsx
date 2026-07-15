'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Upload, Trash2 } from 'lucide-react';
import { getBanners, createBanner, deleteBanner } from '../actions';

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const loadBanners = useCallback(async () => {
    const data = await getBanners();
    setBanners(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function initialLoad() {
      await loadBanners();
    }
    initialLoad();
  }, [loadBanners]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload file
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (uploadData.success) {
        // Create banner
        await createBanner({
          title,
          subtitle,
          imageUrl: uploadData.url,
          linkUrl,
        });

        // Reset form
        setTitle('');
        setSubtitle('');
        setLinkUrl('');
        setFile(null);
        
        // Reload
        await loadBanners();
      } else {
        alert('Dosya yükleme başarısız oldu.');
      }
    } catch (error) {
      console.error(error);
      alert('Bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu afişi silmek istediğinize emin misiniz?')) {
      await deleteBanner(id);
      await loadBanners();
    }
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', color: '#0f172a' }}>Afiş Yönetimi</h1>

      {/* Add New Banner */}
      <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Yeni Afiş Ekle</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Başlık *</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Alt Başlık</label>
              <input 
                type="text" 
                value={subtitle} 
                onChange={e => setSubtitle(e.target.value)} 
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Görsel Dosyası *</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                required
                style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Hedef Link (İsteğe Bağlı)</label>
              <input 
                type="text" 
                value={linkUrl} 
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="/kategori/ornek"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={uploading}
            style={{ 
              alignSelf: 'flex-start',
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#2563eb', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: uploading ? 'not-allowed' : 'pointer'
            }}
          >
            <Upload size={18} />
            {uploading ? 'Yükleniyor...' : 'Afişi Kaydet'}
          </button>
        </form>
      </div>

      {/* Banner List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {banners.map(banner => (
          <div key={banner.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ height: '160px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
              <Image
                src={banner.imageUrl}
                alt={banner.title}
                fill
                sizes="(max-width: 640px) 100vw, 300px"
                style={{ objectFit: 'cover' }}
                unoptimized
              />
            </div>
            <div style={{ padding: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{banner.title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>{banner.subtitle}</p>
              
              <button 
                onClick={() => handleDelete(banner.id)}
                style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', padding: 0 }}
              >
                <Trash2 size={16} /> Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

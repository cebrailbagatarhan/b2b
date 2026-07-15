'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import Link from 'next/link';
import styles from './HeroSlider.module.css';

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
};

export default function HeroSlider({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;

  return (
    <div className={styles.sliderWrapper}>
      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation
        loop={true}
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div className={styles.slide}>
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${banner.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: -1
                }}
              />
              {/* Optional overlay for better text readability */}
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: -1 }} />
              
              <div className={styles.slideContent}>
                <h2 className={styles.slideTitle} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{banner.title}</h2>
                {banner.subtitle && (
                  <p className={styles.slideDesc} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{banner.subtitle}</p>
                )}
                {banner.linkUrl && (
                  <Link href={banner.linkUrl} className={styles.slideBtn}>
                    Kampanyaya Git
                  </Link>
                )}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

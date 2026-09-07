import { useState } from 'react';

export default function HomeHeroBanner() {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <header className="home-hero" aria-label="Digital Swasthya Setu banner">
        <div style={{
          width: '100%',
          height: 180,
          background: 'linear-gradient(135deg, var(--primary, #0F4C81), var(--accent, #E8741A))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '1.5rem',
          fontWeight: 700,
          letterSpacing: '0.5px'
        }}>
          डिजिटल स्वास्थ्य सेतु
        </div>
      </header>
    );
  }

  return (
    <header className="home-hero" aria-label="Digital Swasthya Setu banner">
      <img
        src="/hero/dss-banner.png"
        alt="मुख्यमंत्री डिजिटल हेल्थ मिशन, डिजिटल स्वास्थ्य सेतु — BSNL, Government of Jharkhand, Ayushman Bharat Digital Mission"
        className="home-hero-img"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onError={() => setImgError(true)}
      />
    </header>
  );
}

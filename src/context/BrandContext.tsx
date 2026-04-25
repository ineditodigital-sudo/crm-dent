import React, { createContext, useContext, useEffect, useState } from 'react';

export type BrandConfig = {
  clinic_name: string;
  tagline: string;
  giro: string;
  primary_color: string;
  font_family: string;
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
};

const defaultBrand: BrandConfig = {
  clinic_name: 'Dra. Stephanie Ortega',
  tagline: 'Tu sonrisa, nuestra pasión',
  giro: 'Clínica Dental',
  primary_color: '#007aff',
  font_family: 'Inter',
  logo_url: '',
  logo_dark_url: '',
  favicon_url: '',
};

type BrandContextType = {
  brand: BrandConfig;
  setBrand: (b: Partial<BrandConfig>) => void;
  reload: () => void;
};

const BrandContext = createContext<BrandContextType>({
  brand: defaultBrand,
  setBrand: () => {},
  reload: () => {},
});

/** Apply brand CSS variables + favicon + font to the entire document */
function applyBrandToDOM(brand: BrandConfig) {
  // Primary color
  if (brand.primary_color) {
    document.documentElement.style.setProperty('--primary', brand.primary_color);
    // Derive a light shadow version
    document.documentElement.style.setProperty('--primary-light', `${brand.primary_color}40`);
  }

  // Font family (load from Google Fonts if needed)
  if (brand.font_family && brand.font_family !== 'Inter') {
    const existingLink = document.getElementById('brand-font-link');
    const fontSlug = brand.font_family.replace(/ /g, '+');
    const href = `https://fonts.googleapis.com/css2?family=${fontSlug}:wght@400;500;600;700;800&display=swap`;
    if (existingLink) {
      (existingLink as HTMLLinkElement).href = href;
    } else {
      const link = document.createElement('link');
      link.id = 'brand-font-link';
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
    document.documentElement.style.setProperty('--font-body', `'${brand.font_family}', sans-serif`);
    document.body.style.fontFamily = `'${brand.font_family}', sans-serif`;
  }

  // Favicon
  if (brand.favicon_url) {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = brand.favicon_url;
    link.type = 'image/x-icon';
  }

  // Page title
  if (brand.clinic_name) {
    document.title = `${brand.clinic_name} — CRM`;
  }
}

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brand, setBrandState] = useState<BrandConfig>(defaultBrand);

  const reload = async () => {
    try {
      const token = localStorage.getItem('crm_token') || '';
      const res = await fetch('/api/brand', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      const merged: BrandConfig = { ...defaultBrand, ...data };
      setBrandState(merged);
      applyBrandToDOM(merged);
    } catch {
      // silently fail — use defaults
    }
  };

  useEffect(() => {
    reload();
    // Re-apply on token availability (after login)
    const interval = setInterval(() => {
      const token = localStorage.getItem('crm_token');
      if (token) {
        reload();
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const setBrand = (partial: Partial<BrandConfig>) => {
    const next = { ...brand, ...partial };
    setBrandState(next);
    applyBrandToDOM(next);
  };

  return (
    <BrandContext.Provider value={{ brand, setBrand, reload }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => useContext(BrandContext);

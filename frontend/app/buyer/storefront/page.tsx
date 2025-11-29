'use client';

import dynamic from 'next/dynamic';

const StorefrontContent = dynamic(() => import('./storefront-content'), { ssr: false });

export default function StorefrontPage() {
  return <StorefrontContent />;
}

'use client';

import dynamic from 'next/dynamic';

const CreateListingContent = dynamic(() => import('./create-listing-content'), { ssr: false });

export default function CreateListingPage() {
  return <CreateListingContent />;
}

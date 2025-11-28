'use client';

import { Suspense } from 'react';
import SignUpContent from './signup-content';

export default function SignUp() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}

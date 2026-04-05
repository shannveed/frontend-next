'use client';

import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import DrawerContext from '../context/DrawerContext';

const ProvidersRuntime = dynamic(() => import('./ProvidersRuntime'), {
  ssr: false,
});

export default function Providers({ children }) {
  return (
    <DrawerContext>
      {children}
      <Toaster position="top-center" />
      <ProvidersRuntime />
    </DrawerContext>
  );
}

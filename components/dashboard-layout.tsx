'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePersistedState } from '@/hooks/use-persisted-state';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {


  const [reduceAnimations] = usePersistedState<boolean>('reduceAnimations', false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return (
    <div className={isHydrated && reduceAnimations ? '' : 'animate-in fade-in duration-700'}>
      {children}
    </div>
  );
}
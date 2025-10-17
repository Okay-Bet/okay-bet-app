'use client';

import React, { createContext, useContext, ReactNode } from 'react';

interface DemoModeContextType {
  isDemoMode: boolean;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  // Set to true for demo mode, false for production
  const isDemoMode = true;

  return (
    <DemoModeContext.Provider value={{ isDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}

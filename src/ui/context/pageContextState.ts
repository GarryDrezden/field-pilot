import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { FormField } from '../../shared/types/form';

export interface PageContextValue {
  fields: FormField[];
  isScanning: boolean;
  scanError: string | null;
  hasScanned: boolean;
  scanGeneration: number;
  pageStale: boolean;
  pageUrl: string;
  focusMappingPropertyId: string | null;
  scanPage: () => void;
  rescanPage: () => void;
  clearPageFields: () => void;
  requestMappingFocus: (propertyId: string) => void;
  clearMappingFocus: () => void;
}

export const PageContext = createContext<PageContextValue | null>(null);

export function usePageContext(): PageContextValue {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePageContext must be used within PageProvider');
  }
  return context;
}

export function PageContextProvider({ children, value }: { children: ReactNode; value: PageContextValue }) {
  return createElement(PageContext.Provider, { value }, children);
}

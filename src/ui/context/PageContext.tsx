import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { detectStalePageFields } from '../../form/pageFieldStale';
import { scanPageFormFields } from '../../form/formScanner';
import type { FormField } from '../../shared/types/form';
import { PageContextProvider } from './pageContextState';

export function PageProvider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanGeneration, setScanGeneration] = useState(0);
  const [pageUrl, setPageUrl] = useState(() => window.location.href);
  const [pageStale, setPageStale] = useState(false);
  const [focusMappingPropertyId, setFocusMappingPropertyId] = useState<string | null>(null);

  const scanPage = useCallback(() => {
    setIsScanning(true);
    setScanError(null);
    setPageStale(false);

    try {
      const result = scanPageFormFields(document);
      setFields(result.fields);
      setScanGeneration(result.scanGeneration);
      setPageUrl(result.pageUrl);
      setHasScanned(true);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Не удалось просканировать страницу.');
      setFields([]);
      setHasScanned(true);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const rescanPage = useCallback(() => {
    scanPage();
  }, [scanPage]);

  const clearPageFields = useCallback(() => {
    setFields([]);
    setScanError(null);
    setHasScanned(false);
    setScanGeneration(0);
    setPageStale(false);
    setFocusMappingPropertyId(null);
  }, []);

  const requestMappingFocus = useCallback((propertyId: string) => {
    setFocusMappingPropertyId(propertyId);
  }, []);

  const clearMappingFocus = useCallback(() => {
    setFocusMappingPropertyId(null);
  }, []);

  useEffect(() => {
    if (!hasScanned || fields.length === 0) {
      return;
    }

    const checkStale = () => {
      const snapshot = {
        pageUrl,
        pageTitle: document.title,
        scanGeneration,
        fieldIds: fields.map((field) => field.id),
      };
      const result = detectStalePageFields(fields, snapshot, document);
      setPageStale(result.stale);
    };

    const onNavigation = () => {
      if (window.location.href !== pageUrl) {
        setPageStale(true);
      } else {
        checkStale();
      }
    };

    window.addEventListener('popstate', onNavigation);
    window.addEventListener('hashchange', onNavigation);
    const timer = window.setInterval(checkStale, 4000);

    return () => {
      window.removeEventListener('popstate', onNavigation);
      window.removeEventListener('hashchange', onNavigation);
      window.clearInterval(timer);
    };
  }, [fields, hasScanned, pageUrl, scanGeneration]);

  const value = useMemo(
    () => ({
      fields,
      isScanning,
      scanError,
      hasScanned,
      scanGeneration,
      pageStale,
      pageUrl,
      focusMappingPropertyId,
      scanPage,
      rescanPage,
      clearPageFields,
      requestMappingFocus,
      clearMappingFocus,
    }),
    [
      fields,
      isScanning,
      scanError,
      hasScanned,
      scanGeneration,
      pageStale,
      pageUrl,
      focusMappingPropertyId,
      scanPage,
      rescanPage,
      clearPageFields,
      requestMappingFocus,
      clearMappingFocus,
    ],
  );

  return <PageContextProvider value={value}>{children}</PageContextProvider>;
}

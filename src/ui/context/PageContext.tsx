import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { scanPageFormFields } from '../../form/formScanner';
import { PageContextProvider } from './pageContextState';

export function PageProvider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<import('../../shared/types/form').FormField[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [focusMappingPropertyId, setFocusMappingPropertyId] = useState<string | null>(null);

  const scanPage = useCallback(() => {
    setIsScanning(true);
    setScanError(null);

    try {
      const result = scanPageFormFields(document);
      setFields(result.fields);
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
    setFocusMappingPropertyId(null);
  }, []);

  const requestMappingFocus = useCallback((propertyId: string) => {
    setFocusMappingPropertyId(propertyId);
  }, []);

  const clearMappingFocus = useCallback(() => {
    setFocusMappingPropertyId(null);
  }, []);

  const value = useMemo(
    () => ({
      fields,
      isScanning,
      scanError,
      hasScanned,
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

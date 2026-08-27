import { useContext } from 'react';
import { DocumentContext } from '../context/documentContextState';

export function useDocument() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within DocumentProvider');
  }
  return context;
}

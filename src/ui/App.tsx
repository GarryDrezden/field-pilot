import { PanelHeader } from './components/PanelHeader';
import { DocumentSection } from './components/DocumentSection';
import { PageFieldsSection } from './components/PageFieldsSection';

interface AppProps {
  onClose: () => void;
}

export function App({ onClose }: AppProps) {
  return (
    <>
      <PanelHeader onClose={onClose} />
      <main className="fp-content">
        <DocumentSection />
        <PageFieldsSection />
      </main>
    </>
  );
}

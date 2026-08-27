import { useState } from 'react';
import { ProfileProvider } from './context/ProfileContext';
import { PanelHeader } from './components/PanelHeader';
import { DocumentSection } from './components/DocumentSection';
import { PageFieldsSection } from './components/PageFieldsSection';
import { ProfileBar, type PanelScreen } from './components/ProfileBar';
import { ProfileManagePanel } from './components/ProfileManagePanel';
import { ProfilePropertiesPanel } from './components/ProfilePropertiesPanel';
import { ProfileImportPanel } from './components/ProfileImportPanel';

interface AppProps {
  onClose: () => void;
}

function AppContent({ screen, onOpenScreen }: { screen: PanelScreen; onOpenScreen: (screen: PanelScreen) => void }) {
  if (screen === 'profile-manage') {
    return <ProfileManagePanel onBack={() => onOpenScreen('main')} />;
  }
  if (screen === 'profile-properties') {
    return <ProfilePropertiesPanel onBack={() => onOpenScreen('main')} />;
  }
  if (screen === 'profile-import') {
    return <ProfileImportPanel onBack={() => onOpenScreen('main')} />;
  }

  return (
    <>
      <DocumentSection />
      <PageFieldsSection />
    </>
  );
}

export function App({ onClose }: AppProps) {
  const [screen, setScreen] = useState<PanelScreen>('main');

  return (
    <ProfileProvider>
      <PanelHeader onClose={onClose} />
      {screen === 'main' && <ProfileBar onOpenScreen={setScreen} />}
      <main className="fp-content">
        <AppContent screen={screen} onOpenScreen={setScreen} />
      </main>
    </ProfileProvider>
  );
}

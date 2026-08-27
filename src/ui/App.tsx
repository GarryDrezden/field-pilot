import { useState } from 'react';
import { DocumentProvider } from './context/DocumentContext';
import { ProfileProvider } from './context/ProfileContext';
import { PanelHeader } from './components/PanelHeader';
import { DocumentSection } from './components/DocumentSection';
import { DocumentCharacteristicsSection } from './components/DocumentCharacteristicsSection';
import { DocumentDebugSection } from './components/DocumentDebugSection';
import { PageFieldsSection } from './components/PageFieldsSection';
import { ProfileMatchingSection } from './components/ProfileMatchingSection';
import { ProfileBar, type PanelScreen } from './components/ProfileBar';
import { ProfileManagePanel } from './components/ProfileManagePanel';
import { ProfilePropertiesPanel } from './components/ProfilePropertiesPanel';
import { ProfileImportPanel } from './components/ProfileImportPanel';
import { useDocument } from './hooks/useDocument';

interface AppProps {
  onClose: () => void;
}

function MainScreen() {
  const { extraction } = useDocument();

  return (
    <>
      <DocumentSection />
      {extraction && <DocumentCharacteristicsSection extraction={extraction} />}
      <ProfileMatchingSection />
      <PageFieldsSection />
      <DocumentDebugSection />
    </>
  );
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

  return <MainScreen />;
}

export function App({ onClose }: AppProps) {
  const [screen, setScreen] = useState<PanelScreen>('main');

  return (
    <ProfileProvider>
      <DocumentProvider>
        <PanelHeader onClose={onClose} />
        {screen === 'main' && <ProfileBar onOpenScreen={setScreen} />}
        <main className="fp-content">
          <AppContent screen={screen} onOpenScreen={setScreen} />
        </main>
      </DocumentProvider>
    </ProfileProvider>
  );
}

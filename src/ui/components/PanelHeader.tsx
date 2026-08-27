interface PanelHeaderProps {
  onClose: () => void;
}

export function PanelHeader({ onClose }: PanelHeaderProps) {
  const pageTitle = document.title || 'Без названия';
  const pageHost = window.location.hostname || 'локальная страница';

  return (
    <header className="fp-header">
      <div className="fp-title-block">
        <h1>FieldPilot</h1>
        <p>
          {pageHost} · {pageTitle}
        </p>
      </div>
      <button
        type="button"
        className="fp-close-button"
        aria-label="Закрыть FieldPilot"
        onClick={onClose}
      >
        ×
      </button>
    </header>
  );
}

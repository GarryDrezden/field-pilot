import { useDocument } from '../hooks/useDocument';
import { useProfiles } from '../hooks/useProfiles';

export function ProfileMatchingSection() {
  const { extraction } = useDocument();
  const { activeProfile } = useProfiles();

  if (!extraction) {
    return null;
  }

  return (
    <section className="fp-section">
      <h2>Сопоставление с профилем</h2>
      {activeProfile ? (
        <>
          <div className="fp-meta">
            <div className="fp-meta-row">
              <span className="fp-meta-label">Профиль</span>
              <span>{activeProfile.name}</span>
            </div>
            <div className="fp-meta-row">
              <span className="fp-meta-label">Свойств профиля</span>
              <span>{activeProfile.properties.length}</span>
            </div>
          </div>
          <p className="fp-empty">Сопоставление документа с каталогом будет доступно в v0.4.</p>
        </>
      ) : (
        <p className="fp-empty">Выберите профиль для будущего сопоставления с документом.</p>
      )}
    </section>
  );
}

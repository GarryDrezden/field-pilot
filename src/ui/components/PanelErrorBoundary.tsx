import { Component, type ErrorInfo, type ReactNode } from 'react';

interface PanelErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface PanelErrorBoundaryState {
  error: Error | null;
}

export class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  state: PanelErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('FieldPilot UI error', error, info);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <section className="fp-section fp-error-boundary">
          <h2>FieldPilot</h2>
          <p className="fp-status is-error">FieldPilot столкнулся с ошибкой интерфейса.</p>
          <button type="button" className="fp-button" onClick={this.handleReset}>
            Перезапустить интерфейс
          </button>
          <details className="fp-debug-details">
            <summary>Диагностика</summary>
            <pre className="fp-debug-pre">{this.state.error.message}</pre>
          </details>
        </section>
      );
    }

    return this.props.children;
  }
}

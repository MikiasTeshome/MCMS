import React from 'react';

const CHUNK_RELOAD_KEY = 'mcms_chunk_reload';

const isChunkLoadError = (error) => {
  const message = String(error?.message || error || '');
  return (
    message.includes('dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Importing a module script failed')
  );
};

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    if (isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
      window.location.reload();
      return { error: null };
    }
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    return { error };
  }

  componentDidMount() {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-app-bg text-app-primary">
        <div className="surface-card max-w-lg space-y-3">
          <h1 className="page-title">Something went wrong</h1>
          <p className="text-sm text-app-secondary">{this.state.error.message}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              sessionStorage.removeItem(CHUNK_RELOAD_KEY);
              window.location.reload();
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;

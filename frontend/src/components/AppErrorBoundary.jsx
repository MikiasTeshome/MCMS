import React from 'react';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-app-bg text-app-primary">
        <div className="surface-card max-w-lg space-y-3">
          <h1 className="page-title">Something went wrong</h1>
          <p className="text-sm text-app-secondary">{this.state.error.message}</p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;

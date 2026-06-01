import { Component, ReactNode } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './context/ToastContext';
import { AccountsProvider } from './context/AccountsContext';
import { TransactionsProvider } from './context/TransactionsContext';
import { AppLayout } from './components/Layout/AppLayout';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: 'red' }}>
          <h2>Algo salió mal</h2>
          <pre>{(this.state.error as Error).message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AccountsProvider>
            <TransactionsProvider>
              <AppLayout />
            </TransactionsProvider>
          </AccountsProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

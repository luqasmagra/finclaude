import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './context/ToastContext';
import { AccountsProvider } from './context/AccountsContext';
import { TransactionsProvider } from './context/TransactionsContext';
import { AppLayout } from './components/Layout/AppLayout';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AccountsProvider>
          <TransactionsProvider>
            <AppLayout />
          </TransactionsProvider>
        </AccountsProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

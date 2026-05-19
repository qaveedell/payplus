import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import enUS from 'antd/locale/en_US';
import faIR from 'antd/locale/fa_IR';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useDirection } from './hooks/useDirection';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import ReceivedPage from './pages/ReceivedPage';
import RequestsPage from './pages/RequestsPage';
import ContactsPage from './pages/ContactsPage';
import ReportsPage from './pages/ReportsPage';
import PaymentForm from './components/payments/PaymentForm';
import PaymentDetail from './components/payments/PaymentDetail';
import AdminPage from './pages/AdminPage';
import MessagesPage from './pages/MessagesPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

const fontMap: Record<string, string> = {
  fa: 'Vazirmatn, sans-serif',
  ur: 'Vazirmatn, sans-serif',
  ps: 'Vazirmatn, sans-serif',
  en: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

function AppRoutes() {
  const { i18n } = useTranslation();
  const direction = useDirection();

  return (
    <ConfigProvider
      direction={direction === 'rtl' ? 'rtl' : 'ltr'}
      locale={i18n.language === 'fa' ? faIR : enUS}
      theme={{
        token: {
          colorPrimary: '#6366f1',
          colorSuccess: '#10b981',
          colorError: '#ef4444',
          colorWarning: '#f59e0b',
          colorInfo: '#6366f1',
          borderRadius: 8,
          fontFamily: fontMap[i18n.language] || fontMap.en,
          fontSize: 14,
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f9fafb',
        },
        components: {
          Button: {
            controlHeight: 40,
            fontWeight: 500,
          },
          Input: {
            controlHeight: 40,
          },
          Select: {
            controlHeight: 40,
          },
          Card: {
            paddingLG: 24,
          },
          Menu: {
            darkItemBg: '#1e1b4b',
            darkItemHoverBg: '#312e81',
            darkItemSelectedBg: '#4338ca',
            darkSubMenuItemBg: '#1e1b4b',
            itemBorderRadius: 8,
            itemMarginInline: 8,
          },
          Layout: {
            siderBg: '#1e1b4b',
            headerBg: '#ffffff',
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/received" element={<ReceivedPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/payments/new" element={<PaymentForm />} />
            <Route path="/payments/:id" element={<PaymentDetail />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/received" />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

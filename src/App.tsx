import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage, RegisterPage, ForgotPasswordPage } from '@/pages/AuthPages';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { ChatPage } from '@/pages/ChatPage';
import { SecurityCenterPage } from '@/pages/SecurityCenterPage';
import { TestingLabPage } from '@/pages/TestingLabPage';
import { AdminPage } from '@/pages/AdminPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/dashboard" element={<DashboardLayout><DashboardPage /></DashboardLayout>} />
          <Route path="/documents" element={<DashboardLayout><DocumentsPage /></DashboardLayout>} />
          <Route path="/chat" element={<DashboardLayout><ChatPage /></DashboardLayout>} />
          <Route path="/security" element={<DashboardLayout><SecurityCenterPage /></DashboardLayout>} />
          <Route path="/testing-lab" element={<DashboardLayout><TestingLabPage /></DashboardLayout>} />
          <Route path="/admin" element={<DashboardLayout><AdminPage /></DashboardLayout>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

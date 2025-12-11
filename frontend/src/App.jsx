import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { Layout } from "./components/Layout";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CallLogPage from "./pages/CallLogPage";
import CallsListPage from "./pages/CallsListPage";
import ContactsPage from "./pages/ContactsPage";
import AdminPage from "./pages/AdminPage";

// Protected Route wrapper
const ProtectedRoute = ({ children, requiredRoles = null }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    // Check role if required
    if (requiredRoles && !requiredRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }
    
    return <Layout>{children}</Layout>;
};

// Public Route wrapper (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }
    
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }
    
    return children;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={
                <PublicRoute>
                    <LoginPage />
                </PublicRoute>
            } />
            <Route path="/register" element={
                <PublicRoute>
                    <RegisterPage />
                </PublicRoute>
            } />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <DashboardPage />
                </ProtectedRoute>
            } />
            <Route path="/calls/new" element={
                <ProtectedRoute>
                    <CallLogPage />
                </ProtectedRoute>
            } />
            <Route path="/calls" element={
                <ProtectedRoute>
                    <CallsListPage />
                </ProtectedRoute>
            } />
            <Route path="/contacts" element={
                <ProtectedRoute>
                    <ContactsPage />
                </ProtectedRoute>
            } />
            <Route path="/contacts/new" element={
                <ProtectedRoute>
                    <ContactsPage />
                </ProtectedRoute>
            } />
            
            {/* Admin routes - restricted to admin role only */}
            <Route path="/admin" element={
                <ProtectedRoute requiredRoles={['admin']}>
                    <AdminPage />
                </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
                <ProtectedRoute requiredRoles={['admin']}>
                    <AdminPage />
                </ProtectedRoute>
            } />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
                <Toaster position="top-right" richColors />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

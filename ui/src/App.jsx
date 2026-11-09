import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Pages
import NexusGate from './pages/NexusGate';
import Login from './pages/Login';
import Register from './pages/Register';
import OfficialProfiling from './pages/OfficialProfiling';
import OfficialsRegistry from './pages/OfficialsRegistry';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Settings from './pages/Settings';
import NotableAchievements from './pages/NotableAchievements';
import LoadingScreen from './components/LoadingScreen';
import AllVacancies from './pages/AllVacancies';
import ResetPassword from './pages/ResetPassword';

import MainDashboard from './pages/MainDashboard';

// Public Route Component with Return URL Handling
const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <LoadingScreen />;
    if (user) {
        const searchParams = new URLSearchParams(location.search);
        const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect') || location.state?.redirectTo || location.state?.returnUrl;

        // Check if returnUrl is safe and not pointing back to auth pages to prevent loops
        if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.startsWith('/login') && !returnUrl.startsWith('/register') && !returnUrl.startsWith('/reset-password')) {
            return <Navigate to={returnUrl} replace />;
        }

        const roleLower = user.role?.toLowerCase() || '';
        if (['personnel admin', 'super user', 'central office', 'regional office', 'school division office'].includes(roleLower)) {
            return <Navigate to="/home" replace />;
        } else if (['tlo applicant', 'third level applicant'].includes(roleLower)) {
            return <Navigate to="/timon-applications" replace />;
        } else {
            return <Navigate to="/official-profiling" replace />;
        }
    }
    return children;
};

// Protected Route Component with Authentication Guard & Return URL Redirection
const ProtectedRoute = ({ children, redirectPath = '/login' }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <LoadingScreen />;
    if (!user) {
        const currentPath = location.pathname + location.search;
        const encodedUrl = encodeURIComponent(currentPath);
        return (
            <Navigate 
                to={`${redirectPath}?returnUrl=${encodedUrl}&redirect=${encodedUrl}`} 
                state={{ redirectTo: currentPath, returnUrl: currentPath }} 
                replace 
            />
        );
    }
    return children;
};

const App = () => {
    useEffect(() => {
        AOS.init();
    }, []);

    return (
        <Routes>
            {/* Entry Point: Nexus Gate */}
            <Route path="/" element={<PublicRoute><NexusGate /></PublicRoute>} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
            
            {/* Protected Routes */}
            <Route 
                path="/official-profiling" 
                element={
                    <ProtectedRoute>
                        <OfficialProfiling />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/officials-registry" 
                element={
                    <ProtectedRoute>
                        <OfficialsRegistry />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/dashboard" 
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/home" 
                element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/notable-achievements" 
                element={
                    <ProtectedRoute>
                        <NotableAchievements />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/settings" 
                element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/timon-applications" 
                element={
                    <ProtectedRoute>
                        <AllVacancies />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/all-vacancies" 
                element={<Navigate to="/timon-applications" replace />} 
            />
            <Route 
                path="/vacancies" 
                element={<Navigate to="/timon-applications" replace />} 
            />
            <Route 
                path="/admin/records/applications" 
                element={
                    <ProtectedRoute>
                        <Navigate to="/officials-registry?status=Applications" replace />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/main-dashboard" 
                element={<Navigate to="/home" replace />} 
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;

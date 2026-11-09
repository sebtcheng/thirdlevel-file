import React, { createContext, useContext, useState, useEffect } from 'react';
import { normalizeRole } from '../utils/roleUtils';
import { apiUrl } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        if (storedUser && storedToken) {
            try {
                const parsed = JSON.parse(storedUser);
                let modified = false;
                ['passcode', 'password', 'pin', 'password_hash', 'passcode_hash'].forEach(field => {
                    if (field in parsed) {
                        delete parsed[field];
                        modified = true;
                    }
                });
                if (modified) {
                    localStorage.setItem('user', JSON.stringify(parsed));
                }
                setUser(parsed);
                setToken(storedToken);
            } catch (e) {
                setUser(null);
            }
        }

        // Clean up previously persisted sensitive credentials in remembered_user
        const storedRemembered = localStorage.getItem('remembered_user');
        if (storedRemembered) {
            try {
                const rem = JSON.parse(storedRemembered);
                let remModified = false;
                ['passcode', 'password', 'pin', 'password_hash', 'passcode_hash'].forEach(field => {
                    if (field in rem) {
                        delete rem[field];
                        remModified = true;
                    }
                });
                if (remModified) {
                    localStorage.setItem('remembered_user', JSON.stringify(rem));
                }
            } catch (e) {}
        }
        setLoading(false);
    }, []);

    const login = (userData, token) => {
        // Strictly sanitize incoming user data to prevent persisting any credential material
        const sanitized = { ...userData };
        ['passcode', 'password', 'pin', 'password_hash', 'passcode_hash'].forEach(field => {
            delete sanitized[field];
        });

        // Normalize role before storage
        if (sanitized.role) sanitized.role = normalizeRole(sanitized.role);
        if (sanitized.account_category) sanitized.account_category = normalizeRole(sanitized.account_category);

        sessionStorage.removeItem('hasSeenRetireesPrompt');

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(sanitized));

        // Sync secondary storage for main repo logic compatibility
        if (sanitized.uid) localStorage.setItem('uid', sanitized.uid);
        if (sanitized.email) localStorage.setItem('userEmail', sanitized.email);
        if (sanitized.role) localStorage.setItem('userRole', sanitized.role);

        localStorage.setItem('remembered_user', JSON.stringify(sanitized));

        setUser(sanitized);
        setToken(token);
    };

    const loginWithCredentials = async (email, password, isCO) => {
        const targetUrl = apiUrl('/api/auth/login');
        try {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, isCO })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Server Error Detail:`, errorText);
                let parsedError = null;
                try {
                    parsedError = JSON.parse(errorText)?.error;
                } catch {
                    parsedError = null;
                }
                return { success: false, error: parsedError || `Server returned ${response.status}: ${response.statusText}` };
            }

            const data = await response.json();
            if (data.success) {
                login(data.user, data.token);
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            console.error(`🚨 Network/Connection Error:`, err);
            alert(`CONNECTION FAILED: Check if Port 3008 is running. Error: ${err.message}`);
            return { success: false, error: 'Connection failed. Please check server status.' };
        }
    };


    const verifyPin = async (email, passcode, isCO) => {
        try {
            const response = await fetch(apiUrl('/api/auth/pin-login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, passcode, isCO })
            });
            const data = await response.json();
            if (data.success) {
                login(data.user, data.token);
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'PIN verification failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.removeItem('hasSeenRetireesPrompt');
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, loginWithCredentials, logout, verifyPin, setUser, setToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

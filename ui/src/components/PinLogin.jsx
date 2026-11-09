import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';

const PinLogin = ({ rememberedUser, onSwitchAccount, onUsePassword }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleKeyPress = useCallback((num) => {
    if (error) setError('');
    if (pin.length < 6) {
      setPin(prev => prev + num);
      
      // Auto-submit on 6th digit
      if (pin.length === 5) {
        verifyPin(pin + num);
      }
    }
  }, [error, pin.length]);

  const handleDelete = useCallback(() => {
    if (error) setError('');
    setPin(prev => prev.slice(0, -1));
  }, [error]);
  
  // Need wrapper mapping logic for dashboards
  const getDashboardPath = (role, accountCategory) => {
    if (!role) return '/';
    // Normalized check for standalone
    const r = role.toLowerCase().trim();
    if (['personnel admin', 'super user', 'central office', 'regional office', 'school division office'].includes(r)) {
      return '/home';
    }
    return '/official-profiling'; // Fallback for this standalone app
  };

  const verifyPin = async (completedPin) => {
    setLoading(true);
    const identifier = rememberedUser?.school_id || rememberedUser?.schoolId || rememberedUser?.email || rememberedUser?.email_address;
    const isNumericId = /^\d{6,}$/.test(identifier);
    const useSchoolIdField = (rememberedUser?.role?.toLowerCase()?.includes('school head') || isNumericId);

    try {
      const response = await fetch(apiUrl('/api/auth/pin-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [useSchoolIdField ? 'school_id' : 'email']: identifier,
          passcode: completedPin
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success && data.user && data.token) {
        login(data.user, data.token);
        const destPath = getDashboardPath(data.user.role, data.user.account_category);
        navigate(destPath);
      } else {
        setError(data.error || 'Incorrect PIN');
        setPin(''); 
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center shadow-inner mb-4 overflow-hidden outline outline-4 outline-white outline-offset-[-2px]">
        <span className="text-blue-600 text-3xl font-black uppercase tracking-tighter">
            {
              (rememberedUser?.role?.toLowerCase() === 'school head' || 
               rememberedUser?.role?.toLowerCase() === 'school_head')
                ? (rememberedUser?.school_id?.charAt(0) || rememberedUser?.schoolId?.charAt(0) || rememberedUser?.firstName?.charAt(0) || rememberedUser?.first_name?.charAt(0) || 'S')
                : (rememberedUser?.firstName?.charAt(0) || rememberedUser?.first_name?.charAt(0) || rememberedUser?.email?.charAt(0) || 'U')
            }
        </span>
      </div>
      
      <h2 className="text-2xl font-bold mb-1 text-slate-800 text-center">
        Welcome, {
          (rememberedUser?.role?.toLowerCase()?.includes('school head') || 
           rememberedUser?.role?.toLowerCase()?.includes('school_head') ||
           localStorage.getItem('userRole')?.toLowerCase()?.includes('school head') ||
           (rememberedUser?.school_id || localStorage.getItem('schoolId')))
            ? (rememberedUser?.school_id || rememberedUser?.schoolId || localStorage.getItem('schoolId') || 'School Head')
            : (rememberedUser?.firstName || rememberedUser?.first_name || rememberedUser?.email || localStorage.getItem('userEmail')?.split('@')[0] || 'User')
        }!
      </h2>
      <p className="text-slate-500 mb-6 text-sm">
        Enter your 6-digit PIN to continue
      </p>

      <div className="flex justify-center gap-3 mb-8">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              pin.length > i 
                ? 'bg-blue-600 border-blue-600 scale-110' 
                : 'bg-slate-200 border-transparent'
            } ${error ? 'border-red-500 bg-red-500/20' : ''}`}
          />
        ))}
      </div>

      <div className="h-6 mb-2">
          {error && <p className="text-red-500 text-sm font-bold animate-pulse">{error}</p>}
      </div>

      {loading ? (
          <div className="flex justify-center items-center h-64">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
      ) : (
          <div className="grid grid-cols-3 gap-y-6 gap-x-6 mb-8 w-full max-w-[280px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-200 active:bg-slate-300 active:scale-95 text-2xl font-semibold mx-auto flex items-center justify-center transition-all focus:outline-none text-slate-700 shadow-sm"
              >
                {num}
              </button>
            ))}
            <div className="col-start-2">
              <button
                onClick={() => handleKeyPress('0')}
                className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-200 active:bg-slate-300 active:scale-95 text-2xl font-semibold mx-auto flex items-center justify-center transition-all focus:outline-none text-slate-700 shadow-sm"
              >
                0
              </button>
            </div>
            <div className="col-start-3 flex items-center justify-center">
              <button
                onClick={handleDelete}
                className="w-16 h-16 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>
            </div>
          </div>
      )}

      <div className="flex flex-col gap-4 mt-2 mb-2">
        <button
          onClick={onUsePassword}
          className="text-blue-600 font-bold text-sm hover:text-blue-800 transition-colors"
        >
          Use Password Instead
        </button>
        
        <button
          onClick={onSwitchAccount}
          className="text-slate-400 font-medium text-xs hover:text-slate-600 transition-colors uppercase tracking-widest"
        >
          Not you? Switch Account
        </button>
      </div>
    </div>
  );
};

export default PinLogin;

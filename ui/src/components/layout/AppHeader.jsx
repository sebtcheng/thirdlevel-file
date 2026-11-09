import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bank, CaretDown, Gear, Moon, SignOut } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';

const initialsOf = (user) => {
    const first = (user?.first_name || '').trim()[0] || '';
    const last = (user?.last_name || '').trim()[0] || '';
    return (first + last).toUpperCase() || 'U';
};

// Global header: blue/gold/red accent strip, product branding on the left, session user menu on the right.
const AppHeader = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const onDown = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'System Admin';

    return (
        <header className="relative z-[110] shrink-0 border-b border-muted bg-white">
            <div className="flex h-[3px]" aria-hidden="true">
                <span className="flex-1 bg-brand-700" />
                <span className="flex-1 bg-gold" />
                <span className="flex-1 bg-danger-600" />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-800 text-white">
                        <Bank size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-title text-[20px] font-bold leading-tight text-heading">TIMON Dashboard</p>
                        <p className="truncate font-title text-[13px] italic leading-tight text-secondary">Performance &amp; Monitoring Control Center</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <button
                        type="button"
                        disabled
                        title="Dark mode is not available yet"
                        aria-label="Theme toggle (dark mode not available yet)"
                        className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md text-secondary opacity-60"
                    >
                        <Moon size={20} />
                    </button>
                    <div
                        className="relative"
                        ref={menuRef}
                        onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpen(true); }}
                        onPointerLeave={(e) => { if (e.pointerType === "mouse") setOpen(false); }}
                    >
                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            aria-haspopup="menu"
                            aria-expanded={open}
                            className="flex items-center gap-3 rounded-md px-1 py-1 hover:bg-brand-50"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[13px] font-semibold text-brand-800">
                                {initialsOf(user)}
                            </span>
                            <span className="hidden min-w-0 text-left md:block">
                                <span className="block truncate text-[15px] font-medium leading-tight text-heading">{fullName}</span>
                                <span className="block truncate text-[13px] leading-tight text-secondary">{user?.role || 'Central Office'}</span>
                            </span>
                            <CaretDown size={14} className="text-secondary" />
                        </button>
                        {open ? (
                            <div className="absolute right-0 top-full w-48 pt-2">
                            <div role="menu" className="rounded-md border border-muted bg-white py-1 shadow-md">
                                <button type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/settings'); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[15px] text-heading hover:bg-brand-50">
                                    <Gear size={16} /> Settings
                                </button>
                                <button type="button" role="menuitem" onClick={() => { setOpen(false); logout(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[15px] text-danger-700 hover:bg-danger-50">
                                    <SignOut size={16} /> Sign out
                                </button>
                            </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AppHeader;

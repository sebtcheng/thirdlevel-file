import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CaretLeft as FiChevronLeft, User as FiUser, Lock as FiLock, Clipboard as FiClipboard, Clock as FiClock, CalendarBlank as FiCalendar,SpinnerGap as FiLoader, PaperPlaneTilt as FiSend } from '@phosphor-icons/react';
import './ApplicationHistory.css';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/PageTransition';
import { fetchLookupJson } from '../utils/lookupCache';
import { EXECUTIVE_POSITIONS } from '../components/all-vacancies/constants';
import ConfirmDestructiveDialog from '../components/forms/ConfirmDestructiveDialog';
import { apiUrl } from '../utils/api';

const positionTitle = (code) => EXECUTIVE_POSITIONS.find(p => p.code === code)?.title || code;

const statusLabel = (status) => String(status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate =(value) => (value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—');
const formatSubmissionDate = value => value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' }) : 'Not set';

const ApplicationHistory = () => {
    const navigate = useNavigate();
    const { user, token, logout } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [history, setHistory] = useState([]);
    const [activePeriod, setActivePeriod] = useState(null);
    const [intakeOpen, setIntakeOpen] = useState(false);
    const [submissionRange, setSubmissionRange] = useState(null);
    const [withdrawTarget, setWithdrawTarget] = useState(null);
    const [withdrawing, setWithdrawing] = useState(false);
    const [actionError, setActionError] = useState('');
    const [actionMessage, setActionMessage] = useState('');

    const handleWithdraw = async () => {
        if (!withdrawTarget || withdrawing) return;
        setWithdrawing(true);
        setActionError('');
        setActionMessage('');
        try {
            const response = await fetch(apiUrl(`/api/pooling/history/${withdrawTarget.id}/withdraw`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Could not withdraw your application.');
            setHistory(items => items.filter(item => item.id !== result.data.id));
            await Promise.allSettled([
                fetchLookupJson('/api/pooling/history', { token, ttlMs: 0 }),
                fetchLookupJson('/api/pooling/my-application', { token, ttlMs: 0 })
            ]);
            setActionMessage('Application withdrawn and permanently deleted.');
        } catch (err) {
            setActionError(err.message || 'Could not withdraw your application. Please try again.');
        } finally {
            setWithdrawing(false);
            setWithdrawTarget(null);
        }
    };

    useEffect(() => {
        if (!token) return undefined;
        let alive = true;

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const [historyData, stateData] = await Promise.all([
                    fetchLookupJson('/api/pooling/history', { token, ttlMs: 3000 }),
                    fetchLookupJson('/api/pooling/my-application', { token, ttlMs: 3000, returnErrorBody: true })
                ]);
                if (!alive) return;
                setHistory(historyData.data || []);

                if (stateData && stateData.success) {
                    setActivePeriod(stateData.period || null);
                }
            } catch (err) {
                if (!alive) return;
                console.error('[Application History] Load failed:', err);
                setError('Could not load your application history.');
            } finally {
                if (alive) setLoading(false);
            }
        };

        load();
        return () => { alive = false; };
    }, [token]);

    useEffect(() => {
        let alive = true;
        const refresh = async () => {
            try {
                const response = await fetch(apiUrl('/api/pooling/status'), { cache: 'no-store' });
                const data = await response.json();
                if (alive) {
                    setIntakeOpen(Boolean(response.ok && data.success && data.isOpen));
                    setSubmissionRange(response.ok && data.success ? { start: data.intake_start_date, end: data.intake_end_date } : null);
                }
                const state = await fetchLookupJson('/api/pooling/my-application', { token, ttlMs: 0, returnErrorBody: true });
                if (alive) setActivePeriod(state?.success ? state.period : null);
            } catch {
                if (alive) setIntakeOpen(false);
            }
        };
        refresh();
        window.addEventListener('focus', refresh);
        const interval = window.setInterval(refresh, 15000);
        return () => {
            alive = false;
            window.removeEventListener('focus', refresh);
            window.clearInterval(interval);
        };
    }, [token]);

    const canStartNew = intakeOpen && Boolean(activePeriod);

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 text-brand-800 flex flex-col">
                <header className="bg-brand-800 text-white relative overflow-hidden shadow-lg border-b border-brand-700/20 py-8 px-6 lg:px-12 shrink-0">
                    <div className="absolute -top-[100%] right-[-10%] w-[50%] h-[300%] bg-brand-700 rounded-lg opacity-80 pointer-events-none transform rotate-12 z-0"></div>
                    <div className="max-w-[1200px] mx-auto flex flex-col gap-6 relative z-10">
                        <div className="flex justify-between items-center w-full">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-2 text-blue-200 hover:text-white font-black text-xs uppercase tracking-widest transition-all"
                            >
                                <FiChevronLeft size={18} /> Back
                            </button>
                            {user && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-blue-100 bg-white/10 px-3 py-1.5 rounded-full">
                                        <FiUser size={13} className="text-gold" />
                                        <span>{user.first_name || user.email}</span>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="flex items-center gap-1.5 text-rose-300 hover:text-rose-100 font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        <FiLock size={13} /> Sign Out
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-gold">
                                Department of Education • TIMON Official Roster
                            </span>
                            <h1 className="page-title text-2xl md:text-3xl lg:text-4xl text-white tracking-tight leading-tight">
                                Application History
                            </h1>
                            <p className="text-blue-100/80 text-xs md:text-sm font-semibold max-w-2xl leading-relaxed">
                                Your past TIMON Applications submissions. Select one to review it, or start a new application when a period is open.
                            </p>
                        </div>
                    </div>
                </header>

                <main className="flex-1 max-w-[1100px] w-full mx-auto p-6 md:p-10 space-y-8">
                    {/* New application action */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white border-2 border-slate-200 rounded-card shadow-sm">
                        <div className="min-w-0 space-y-2">
                        <p className="text-xs font-semibold text-slate-500">
                            {canStartNew
                                ? `Applications are open for ${activePeriod.name}.`
                                : 'Application submissions are currently closed.'}
                        </p>
                        {submissionRange && (submissionRange.start || submissionRange.end) && (
                            <p className="flex items-start gap-2 text-[15px] text-brand-800">
                                <FiCalendar size={18} className="mt-0.5 shrink-0" />
                                <span><span className="font-semibold">Submission period: </span>{formatSubmissionDate(submissionRange.start)} – {formatSubmissionDate(submissionRange.end)}<span className="block text-[13px] text-secondary">Philippine time · End date included</span></span>
                            </p>
                        )}
                        </div>
                        {canStartNew && <button
                            type="button"
                            disabled={!canStartNew || loading}
                            onClick={() => navigate('/timon-applications/new')}
                            className="w-full sm:w-auto px-6 py-3 bg-brand-800 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-900 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <FiSend size={16} />
                            <span>Start New Application</span>
                        </button>}
                    </div>

                    {loading ? (
                        <div className="bg-white border-2 border-slate-200 rounded-card p-12 text-center shadow-sm">
                            <FiLoader className="animate-spin text-brand-800 mx-auto mb-4" size={36} />
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Loading Your Applications...</h3>
                        </div>
                    ) : error ? (
                        <div role="alert" className="bg-white border-2 border-rose-200 rounded-card p-8 text-center shadow-sm">
                            <p className="text-sm font-bold text-rose-600">{error}</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="bg-white border-2 border-slate-200 rounded-card p-12 text-center space-y-3 shadow-sm">
                            <FiClipboard className="text-slate-400 mx-auto" size={36} />
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-600">No existing applications</h3>
                            <p className="text-xs font-semibold text-slate-500">Applications you submit will appear here.</p>
                        </div>
                    ) : (
                        <div className="app-grid">
                            {history.map((item) => {
                                const status = String(item.status || 'submitted').toLowerCase();
                                return (
                                    <article
                                        key={item.id}
                                        className="app-card"
                                        data-status={status}
                                    >
                                        <div className="app-card__header">
                                             <h3 className="app-card__title"><Link to={`/timon-applications/${item.id}`}>{item.period_name || 'Earlier submission'}</Link></h3>
                                            <span className="app-card__status">{statusLabel(status)}</span>
                                        </div>
                                        {(item.period_start || item.period_end) && (
                                            <p className="app-card__period">
                                                <FiCalendar size={13} />
                                                <span>{formatDate(item.period_start)} – {formatDate(item.period_end)}</span>
                                            </p>
                                        )}
                                        <dl className="app-card__body">
                                            <div>
                                                <dt className="app-card__label">Target Executive Position</dt>
                                                <dd className="app-card__value">{positionTitle(item.applied_position)}</dd>
                                            </div>
                                            <div>
                                                <dt className="app-card__label">Target Region</dt>
                                                <dd className="app-card__value">{item.target_region || '—'}</dd>
                                            </div>
                                        </dl>
                                        <span className="app-card__date">
                                            <FiClock size={13} />
                                            <span>Date Applied: {formatDate(item.submission_timestamp)}</span>
                                        </span>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <Link to={`/timon-applications/${item.id}`} className="text-sm font-bold underline">View Application</Link>
                                            {status === 'submitted' && (
                                                <button type="button" disabled={withdrawing} onClick={() => setWithdrawTarget(item)} className="rounded-md border border-danger-600 px-3 py-2 text-sm font-bold text-danger-600 hover:bg-danger-50 disabled:opacity-50">
                                                    Withdraw Application
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                    {actionError && <p role="alert" className="text-sm font-bold text-danger-600">{actionError}</p>}
                    {actionMessage && <p role="status" className="text-sm font-bold text-success-800">{actionMessage}</p>}
                </main>
                <ConfirmDestructiveDialog
                    open={Boolean(withdrawTarget)}
                    title="Withdraw Application"
                    body={withdrawTarget ? `Permanently delete your ${positionTitle(withdrawTarget.applied_position)} application for ${withdrawTarget.target_region || 'the selected region'} in ${withdrawTarget.period_name || 'this application period'}, including its answers, attachment references, evaluations and NSC scores? No application history will remain. This cannot be undone.` : ''}
                    confirmLabel={withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
                    onConfirm={handleWithdraw}
                    onCancel={() => { if (!withdrawing) setWithdrawTarget(null); }}
                />
            </div>
        </PageTransition>
    );
};

export default ApplicationHistory;

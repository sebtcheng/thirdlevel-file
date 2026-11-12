import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, LockOpen, SpinnerGap } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import AdminLayout from '../components/layout/AdminLayout';
import FloatingLabelInput from '../components/forms/FloatingLabelInput';

const manilaDate = value => value ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)) : '';

export default function ControlCenter() {
    const { user, token } = useAuth();
    const allowed = ['Central Office', 'Admin', 'Super User', 'Personnel Admin'].includes(user?.role);
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dateError, setDateError] = useState('');

    useEffect(() => {
        if (!allowed) return;
        const controller = new AbortController();
        fetch(apiUrl('/api/pooling/status'), { signal: controller.signal })
            .then(async res => {
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error('Unable to load vacancies availability.');
                setStatus(data);
                setStartDate(manilaDate(data.intake_start_date));
                setEndDate(manilaDate(data.intake_end_date));
            })
            .catch(err => { if (err.name !== 'AbortError') setError(err.message); });
        return () => controller.abort();
    }, [allowed]);

    const saveSettings = async (payload, successMessage) => {
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const res = await fetch(apiUrl('/api/pooling/status'), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Unable to update vacancies availability.');
            setStatus(data);
            setMessage(successMessage);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const saveDates = event => {
        event.preventDefault();
        if (!startDate || !endDate || endDate < startDate) {
            setDateError('Choose both dates. The end date must be on or after the start date.');
            return;
        }
        setDateError('');
        saveSettings({ start_date: startDate, end_date: endDate }, 'Submission dates saved. The lock setting is unchanged.');
    };

    if (!allowed) return <Navigate to="/home" replace />;
    return (
        <AdminLayout>
            <main className="p-6 md:p-8">
                <h1 className="text-2xl font-bold text-heading">Control Center</h1>
                <p className="mt-2 text-secondary">Manage public access to vacancies and application submissions.</p>
                <section className="mt-6 max-w-xl rounded-xl border border-muted bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-heading">Vacancies</h2>
                    {error && <p role="alert" className="mt-4 text-red-600">{error}</p>}
                    {message && <p role="status" className="mt-4 text-brand-700">{message}</p>}
                    {!status && !error && <SpinnerGap aria-label="Loading availability" className="mt-4 animate-spin" size={24} />}
                    {status && <>
                        <p className="mt-4 font-semibold text-brand-800">{status.is_intake_active ? 'Unlocked' : 'Locked'} · Public portal: {status.isOpen ? 'Open' : 'Closed'}</p>
                        <p className="mt-2 text-secondary">Locking closes the Vacancies portal and prevents new submissions. Unlocking allows access during the configured application window.</p>
                        <button type="button" disabled={busy} onClick={() => saveSettings({ is_intake_active: !status.is_intake_active }, status.is_intake_active ? 'Vacancies locked. New submissions are blocked.' : 'Vacancies unlocked. Application dates still apply.')} className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-800 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                            {busy ? <SpinnerGap size={20} className="animate-spin" /> : status.is_intake_active ? <Lock size={20} /> : <LockOpen size={20} />}
                            {busy ? 'Saving…' : status.is_intake_active ? 'Lock Vacancies' : 'Unlock Vacancies'}
                        </button>
                        <form onSubmit={saveDates} className="mt-6 border-t border-muted pt-6">
                            <h3 className="font-semibold text-heading">Submission date range</h3>
                            <p className="mt-2 text-secondary">Philippine time (UTC+8). Opens at 12:00 AM on the start date and closes at the end of the end date.</p>
                            {dateError && <p role="alert" className="mt-3 text-red-600">{dateError}</p>}
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <FloatingLabelInput label="Start date" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} required disabled={busy} />
                                <FloatingLabelInput label="End date" type="date" value={endDate} min={startDate || undefined} onChange={event => setEndDate(event.target.value)} error={dateError} required disabled={busy} />
                            </div>
                            <button type="submit" disabled={busy} className="mt-4 rounded-md bg-brand-800 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? 'Saving…' : 'Save Submission Dates'}</button>
                        </form>
                    </>}
                </section>
            </main>
        </AdminLayout>
    );
}

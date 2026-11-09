import { User as FiUser, Medal as FiAward, Briefcase as FiBriefcase, Book as FiBook, FileText as FiFileText, Shield as FiShield, List as FiList, TrendUp as FiTrendingUp, Pulse as FiActivity, Star as FiStar } from '@phosphor-icons/react';

export const TABS = [
    { id: 'personal', label: 'Personal Info', icon: FiUser },
    { id: 'eligibility', label: 'Eligibility', icon: FiAward },
    { id: 'experience', label: 'Experience', icon: FiBriefcase },
    { id: 'education', label: 'Education', icon: FiBook },
    { id: 'performance', label: 'Performance Ratings', icon: FiActivity },
    { id: 'trainings', label: 'Prof. Dev. Trainings', icon: FiStar },
    { id: 'achievements', label: 'Achievements', icon: FiTrendingUp },
    { id: 'documents', label: 'Documents', icon: FiFileText },
    { id: 'legal', label: 'Legal', icon: FiShield },

    { id: 'summary', label: 'Summary & Certify', icon: FiList },
];

// All side tabs whose completion drives the progress bar.
const CONTENT_TABS = ['personal', 'eligibility', 'experience', 'education', 'performance', 'trainings', 'achievements', 'documents', 'legal', 'summary'];

export const inp = 'w-full bg-white border-2 border-slate-200 focus:border-brand-700 focus:ring-1 focus:ring-brand-700 rounded-lg py-2.5 px-4 text-[18px] font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400/80 shadow-none';

export const sel = 'w-full bg-white border-2 border-slate-200 focus:border-brand-700 focus:ring-1 focus:ring-brand-700 rounded-lg py-2.5 px-4 text-[18px] font-semibold text-slate-800 outline-none transition-all shadow-none';

export const PREVIOUS_POSITION_OPTIONS = [
    'Secretary',
    'Undersecretary',
    'Assistant Secretary',
    'Director IV',
    'Director III',
    'Regional Director',
    'Assistant Regional Director',
    'Schools Division Superintendent',
    'Assistant Schools Division Superintendent',
    'Chief Administrative Officer',
    'Supervising Administrative Officer',
    'Administrative Officer V',
    'Education Program Supervisor',
    'Public Schools District Supervisor',
    'Principal IV',
    'Principal III',
    'Principal II',
    'Principal I'
];

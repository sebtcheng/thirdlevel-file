

export const computeAge = (dob) => {
    if (!dob) return '';
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

export const calculateDuration = (start, end) => {
    if (!start) return { years: 0, months: 0 };
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();

    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();

    if (months < 0) {
        years--;
        months += 12;
    }

    return { years, months };
};

export const formatDateStr = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val.split('T')[0];
    if (val instanceof Date) return val.toISOString().split('T')[0];
    return String(val).split('T')[0];
};

export const isSuffixPlaceholder = (suffix) => {
    if (!suffix) return true;
    const s = String(suffix).trim().toLowerCase();
    return s === '' || s === 'not applicable' || s === 'not apllicable' || s === 'na' || s === 'n/a' || s === 'none';
};

export const sanitizeSuffix = (suffix) => {
    if (isSuffixPlaceholder(suffix)) return '';
    return String(suffix).trim();
};

export const buildFullName = (profile) => {
    if (!profile) return '';
    const suffix = sanitizeSuffix(profile.suffix);
    return [profile.first_name, profile.middle_name, profile.last_name, suffix].filter(Boolean).join(' ').trim();
};

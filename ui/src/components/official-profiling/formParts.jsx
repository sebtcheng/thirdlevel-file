

export const SummaryRow = ({ label, value }) => (
    <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest truncate">{label}</span>
        <span className="text-[16px] font-bold text-slate-800 break-words">{value || <span className="text-slate-300 italic font-normal text-[15px]">—</span>}</span>
    </div>
);

export const Field = ({ label, children, className = '' }) => (
    <div className={`flex flex-col justify-end gap-1.5 group h-full ${className}`}>
        {label && (
            <label className="text-[13px] font-semibold leading-4 text-heading transition-colors duration-200 group-focus-within:text-brand-800">
                {label}
            </label>
        )}
        <div className="w-full">
            {children}
        </div>
    </div>
);

export const SectionLabel = ({ children }) => (
    <p className="text-[15px] font-black uppercase tracking-[0.05em] text-brand-800 mb-4">{children}</p>
);

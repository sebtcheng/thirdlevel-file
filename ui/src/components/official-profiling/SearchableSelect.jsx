import React, { useState, useEffect } from 'react';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

export const SearchableSelect = ({ value, onChange, options, placeholder, className, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(value || '');
    const containerRef = React.useRef(null);

    useEffect(() => {
        setSearch(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(search.toLowerCase())
    );

    const handleInputChange = (e) => {
        const val = e.target.value.toUpperCase();
        setSearch(val);
        onChange(val);
        setIsOpen(true);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <FloatingLabelInput label={placeholder} className="w-full" disabled={disabled} type="text" placeholder={placeholder} value={search} onChange={handleInputChange} onFocus={() => setIsOpen(true)} />
            {isOpen && (
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border-2 border-slate-200 rounded-xl shadow-lg z-50 py-1">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(opt => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                    onChange(opt);
                                    setSearch(opt);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-[18px] font-semibold text-slate-700 hover:bg-transparent transition-colors"
                            >
                                {opt}
                            </button>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-[18px] text-slate-400 italic">No matches found. Typing custom position...</div>
                    )}
                </div>
            )}
        </div>
    );
};

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as FiCalendar, CaretLeft as FiChevronLeft, CaretRight as FiChevronRight, X as FiX } from '@phosphor-icons/react';
import { AnimatePresence, motion } from '../utils/staticElements.jsx';

const YearInput = ({
    value,
    onChange,
    min = 1900,
    max = new Date().getFullYear(),
    placeholder = "YYYY",
    required = false,
    label = "",
    errorText = "",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentYear = new Date().getFullYear();
    const selectedYear = value ? parseInt(value, 10) : null;

    // Decade page: show 12 years at a time
    const initialDecadeStart = selectedYear
        ? Math.floor(selectedYear / 12) * 12
        : Math.floor(currentYear / 12) * 12;
    const [decadeStart, setDecadeStart] = useState(initialDecadeStart);

    const containerRef = useRef(null);
    const pickerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Reset decade when opening
    useEffect(() => {
        if (isOpen) {
            const start = selectedYear
                ? Math.floor(selectedYear / 12) * 12
                : Math.floor(currentYear / 12) * 12;
            setDecadeStart(start);
        }
    }, [isOpen]);

    const yearsGrid = [];
    for (let i = 0; i < 12; i++) {
        yearsGrid.push(decadeStart + i);
    }

    const handleSelect = (yr) => {
        onChange(String(yr));
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setIsOpen(false);
    };

    const canGoBack = decadeStart > min;
    const canGoForward = decadeStart + 12 <= max;

    return (
        <div className="w-full relative" ref={containerRef}>
            {/* Trigger */}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full bg-white border-2 ${errorText ? 'border-red-400' : isOpen ? 'border-brand-800 ring-2 ring-brand-800/10' : 'border-slate-200 hover:border-slate-300'} 
                    rounded-xl py-2.5 pl-10 pr-8 text-[21px] transition-all shadow-sm cursor-pointer select-none
                    ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed opacity-70' : 'text-slate-800'}`}
            >
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                <span className={selectedYear ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                    {selectedYear || placeholder}
                </span>
                {selectedYear && !disabled && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                        <FiX size={12} />
                    </button>
                )}
            </div>

            {/* Year Picker Popup */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={pickerRef}
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute z-[100] mt-2 left-0 right-0 bg-white rounded-2xl shadow-xl shadow-slate-200/80 border-2 border-slate-100 overflow-hidden"
                    >
                        {/* Header with navigation */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-800 to-brand-700">
                            <button
                                onClick={(e) => { e.stopPropagation(); if (canGoBack) setDecadeStart(d => d - 12); }}
                                disabled={!canGoBack}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <FiChevronLeft size={16} />
                            </button>
                            <span className="text-[18px] font-black text-white uppercase tracking-widest">
                                {yearsGrid[0]} — {yearsGrid[yearsGrid.length - 1]}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); if (canGoForward) setDecadeStart(d => d + 12); }}
                                disabled={!canGoForward}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <FiChevronRight size={16} />
                            </button>
                        </div>

                        {/* Year grid */}
                        <div className="grid grid-cols-3 gap-1.5 p-3">
                            {yearsGrid.map(yr => {
                                const isSelected = yr === selectedYear;
                                const isCurrent = yr === currentYear;
                                const isDisabled = yr < min || yr > max;

                                return (
                                    <button
                                        key={yr}
                                        onClick={(e) => { e.stopPropagation(); if (!isDisabled) handleSelect(yr); }}
                                        disabled={isDisabled}
                                        className={`relative py-2.5 rounded-xl text-[18px] font-bold transition-all duration-200
                                            ${isSelected
                                                ? 'bg-brand-800 text-white shadow-md shadow-blue-900/20 scale-[1.02]'
                                                : isDisabled
                                                    ? 'text-slate-300 cursor-not-allowed'
                                                    : 'text-slate-600 hover:bg-brand-800/8 hover:text-brand-800 active:scale-95'
                                            }`}
                                    >
                                        {yr}
                                        {isCurrent && !isSelected && (
                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-800" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Quick select footer */}
                        <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t-2 border-slate-100 mt-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSelect(currentYear); }}
                                className="text-[15px] font-bold text-brand-800 uppercase tracking-wider hover:underline transition-all px-2 py-1 rounded-lg hover:bg-brand-800/5"
                            >
                                This Year
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleClear(e); }}
                                className="text-[15px] font-bold text-slate-400 uppercase tracking-wider hover:text-red-500 hover:underline transition-all px-2 py-1 rounded-lg hover:bg-red-50"
                            >
                                Clear
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {errorText && (
                <p className="text-red-500 text-[15px] mt-1 ml-1 font-medium">{errorText}</p>
            )}
        </div>
    );
};

export default YearInput;

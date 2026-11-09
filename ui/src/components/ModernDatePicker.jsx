import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar as FiCalendar, CaretLeft as FiChevronLeft, CaretRight as FiChevronRight } from '@phosphor-icons/react';
import FloatingLabelInput from './forms/FloatingLabelInput.jsx';

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const startYear = 1900;
const YEARS = Array.from({ length: currentYear - startYear + 1 }, (_, i) => currentYear - i);

const ModernDatePicker = ({ value, onChange, placeholder, minDate, maxDate, className, isMonthPicker, isYearPicker, disabled }) => {
    // Convert string to Date object
    let selectedDate = null;
    if (value) {
        if (isYearPicker) {
            selectedDate = new Date(value.toString(), 0, 1);
        } else {
            // If it's just YYYY-MM, we append -01 to make it a valid date object
            selectedDate = isMonthPicker ? new Date(value + '-01') : new Date(value);
        }
    }

    // Handle date change
    const handleChange = (date) => {
        if (!date) {
            onChange('');
            return;
        }

        if (isYearPicker) {
            onChange(date.getFullYear().toString());
            return;
        }

        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));

        if (isMonthPicker) {
            // Return YYYY-MM
            onChange(adjustedDate.toISOString().split('T')[0].substring(0, 7));
        } else {
            // Return YYYY-MM-DD
            onChange(adjustedDate.toISOString().split('T')[0]);
        }
    };

    return (
        <div className="relative w-full">
            <DatePicker
                disabled={disabled}
                selected={selectedDate}
                onChange={handleChange}
                minDate={minDate}
                maxDate={maxDate}
                placeholderText={placeholder || "Select a date"}
                showMonthDropdown={!(isMonthPicker || isYearPicker)}
                showYearDropdown
                dropdownMode="select"
                {...(!(isMonthPicker || isYearPicker) ? {
                    renderCustomHeader: ({
                        date,
                        changeYear,
                        changeMonth,
                        decreaseMonth,
                        increaseMonth,
                        prevMonthButtonDisabled,
                        nextMonthButtonDisabled,
                    }) => (
                        <div className="flex items-center justify-between px-2 py-2">
                            <button
                                onClick={decreaseMonth}
                                disabled={prevMonthButtonDisabled}
                                type="button"
                                className="p-1 hover:bg-slate-100 rounded-md text-slate-600 disabled:opacity-50"
                            >
                                <FiChevronLeft size={16} />
                            </button>

                            <div className="flex items-center space-x-2">
                                <FloatingLabelInput as="select" label="Month" value={MONTHS[date.getMonth()]} onChange={({ target: { value } }) => changeMonth(MONTHS.indexOf(value))}>
                                    {MONTHS.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </FloatingLabelInput>

                                <FloatingLabelInput as="select" label="Year" value={date.getFullYear()} onChange={({ target: { value } }) => changeYear(value)}>
                                    {YEARS.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </FloatingLabelInput>
                            </div>

                            <button
                                onClick={increaseMonth}
                                disabled={nextMonthButtonDisabled}
                                type="button"
                                className="p-1 hover:bg-slate-100 rounded-md text-slate-600 disabled:opacity-50"
                            >
                                <FiChevronRight size={16} />
                            </button>
                        </div>
                    )
                } : {})}
                dateFormat={isYearPicker ? "yyyy" : (isMonthPicker ? "MM/yyyy" : "MM/dd/yy")}
                showMonthYearPicker={isMonthPicker && !isYearPicker}
                showYearPicker={isYearPicker}
                popperPlacement="bottom-start"
                portalId={typeof document !== 'undefined' && document.getElementById('root-portal') ? 'root-portal' : undefined}
                className={`w-full bg-white border-2 border-slate-200 focus:border-brand-700 focus:ring-2 focus:ring-blue-50/50 rounded-xl px-3 py-2 text-[18px] font-semibold text-slate-800 outline-none transition-all pr-10 shadow-sm cursor-pointer ${className || ''}`}
            />
            <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
        </div>
    );
};

export default ModernDatePicker;

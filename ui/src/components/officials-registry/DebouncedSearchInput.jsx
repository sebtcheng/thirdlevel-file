import { useState, useEffect } from 'react';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const DebouncedSearchInput = ({ value, onChange, placeholder }) => {
    const [local, setLocal] = useState(value);

    useEffect(() => {
        setLocal(value);
    }, [value]);

    useEffect(() => {
        const timer = setTimeout(() => {
            onChange(local);
        }, 300);
        return () => clearTimeout(timer);
    }, [local, onChange]);

    return (
        <FloatingLabelInput label={placeholder} className="w-full" value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} autoComplete="off" />
    );
};


export default DebouncedSearchInput;

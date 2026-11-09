import { useState, useEffect } from 'react';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const JustificationInput = ({ value, onChange, placeholder }) => {
    const [local, setLocal] = useState(value);

    useEffect(() => {
        setLocal(value);
    }, [value]);

    return (
        <FloatingLabelInput as="textarea" label="Justification" className="w-full" value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => onChange(local)} placeholder={placeholder} rows={4} />
    );
};


export default JustificationInput;

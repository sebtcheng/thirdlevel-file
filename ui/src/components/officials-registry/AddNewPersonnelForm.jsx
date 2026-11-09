import { useState } from 'react';
import Swal from 'sweetalert2';
import { apiUrl } from '../../utils/api';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const AddNewPersonnelForm = ({ onCancel, onSuccess, token }) => {
    const [newPersonnelData, setNewPersonnelData] = useState({ first_name: '', last_name: '', email: '', employee_number: '' });
    const [addPersonnelLoading, setAddPersonnelLoading] = useState(false);

    const handleAddPersonnel = async () => {
        setAddPersonnelLoading(true);
        try {
            const res = await fetch(apiUrl('/api/third-level/officials-registry/add-unassigned-personnel'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || localStorage.getItem('token')}`
                },
                body: JSON.stringify(newPersonnelData)
            });
            const data = await res.json();
            if (data.success) {
                onSuccess(data.newPersonnel.TLOid);
            } else {
                Swal.fire('Error', data.error || 'Failed to add personnel', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Failed to add personnel: ' + err.message, 'error');
        } finally {
            setAddPersonnelLoading(false);
        }
    };

    return (
        <div className="space-y-4 bg-slate-50 p-6 rounded-lg border-2 border-brand-800/10">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-[21px] font-black text-brand-800 uppercase tracking-widest">Add New Personnel</h3>
                <button onClick={onCancel} className="text-[15px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">Cancel</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <FloatingLabelInput label="First Name" requiredMark className="w-full" type="text" autoComplete="off" value={newPersonnelData.first_name} onChange={(e) => setNewPersonnelData({ ...newPersonnelData, first_name: e.target.value })} />
                </div>
                <div>
                    <FloatingLabelInput label="Last Name" requiredMark className="w-full" type="text" autoComplete="off" value={newPersonnelData.last_name} onChange={(e) => setNewPersonnelData({ ...newPersonnelData, last_name: e.target.value })} />
                </div>
            </div>
            <div>
                <FloatingLabelInput label="Email Address" requiredMark className="w-full" type="email" autoComplete="off" value={newPersonnelData.email} onChange={(e) => setNewPersonnelData({ ...newPersonnelData, email: e.target.value })} />
            </div>
            <div>
                <FloatingLabelInput label="Employee Number" className="w-full" type="text" autoComplete="off" value={newPersonnelData.employee_number} onChange={(e) => setNewPersonnelData({ ...newPersonnelData, employee_number: e.target.value })} />
            </div>
            <button
                onClick={handleAddPersonnel}
                disabled={addPersonnelLoading || !newPersonnelData.first_name || !newPersonnelData.last_name || !newPersonnelData.email}
                className="w-full mt-2 bg-brand-800 hover:bg-brand-700 text-white py-3 rounded-xl text-[18px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex justify-center items-center gap-2 border-2 border-transparent"
            >
                {addPersonnelLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                Save Personnel
            </button>
        </div>
    );
};


export default AddNewPersonnelForm;

import React, { useState, useEffect } from 'react';
import { X as FiX, Check as FiCheck, User as FiUser, Envelope as FiMail, Briefcase as FiBriefcase } from '@phosphor-icons/react';
import Swal from 'sweetalert2';
import { apiUrl } from '../utils/api';
import FloatingLabelInput from './forms/FloatingLabelInput.jsx';
import FormErrorSummary from './forms/FormErrorSummary.jsx';

const THIRD_LEVEL_POSITIONS = [
  'Secretary',
  'Undersecretary',
  'Assistant Secretary',
  'Director IV',
  'Director III',
  'Regional Director',
  'Assistant Regional Director',
  'Schools Division Superintendent',
  'Assistant Schools Division Superintendent',
  'RD',
  'ARD',
  'SDS',
  'ASDS'
];

const RegisterPersonnelModal = ({ isOpen, onClose, onSuccess, token }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    region: '',
    division: '',
    email: ''
  });
  const [positions, setPositions] = useState([]);
  const [options, setOptions] = useState({
    strands: [],
    regions: [],
    offices: [],
    divisions: [],
    regionDivisions: {}
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const fieldError = (id) => errors.find((er) => er.id === id)?.message;
  const [emailStatus, setEmailStatus] = useState('idle'); // 'idle' | 'checking' | 'duplicate' | 'valid'

  useEffect(() => {
    if (isOpen) {
      setFormData({
        first_name: '', middle_name: '', last_name: '',
        region: '', division: '', email: ''
      });
      setEmailStatus('idle');
      fetchPositions();
    }
  }, [isOpen]);

  const fetchPositions = async () => {
    try {
      const res = await fetch(apiUrl('/api/third-level/official-profiling/positions'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Merge fetched distinct positions with standard positions
        const fetchedPositions = data.positions || [];
        const mergedPositions = [...new Set([...THIRD_LEVEL_POSITIONS, ...fetchedPositions])].sort();
        setPositions(mergedPositions);

        setOptions({
          strands: data.strands || [],
          regions: data.regions || [],
          offices: data.offices || [],
          divisions: data.divisions || [],
          regionDivisions: data.regionDivisions || {}
        });
      }
    } catch (err) {
      console.error('Failed to fetch positions', err);
    }
  };

  useEffect(() => {
    if (!formData.email) {
      setEmailStatus('idle');
      return;
    }
    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    if (!isValidFormat) {
      setEmailStatus('idle');
      return;
    }

    if (!formData.email.toLowerCase().endsWith('@deped.gov.ph')) {
      setEmailStatus('invalid_domain');
      return;
    }

    const checkDuplicate = async () => {
      setEmailStatus('checking');
      try {
        const res = await fetch(apiUrl(`/api/auth/check-masterlist-email?email=${encodeURIComponent(formData.email.trim())}`));
        if (res.ok) {
          const data = await res.json();
          if (data.inMasterlist) {
            setEmailStatus('duplicate');
          } else {
            setEmailStatus('valid');
          }
        } else {
          setEmailStatus('idle');
        }
      } catch (err) {
        console.error('Duplicate check failed', err);
        setEmailStatus('idle');
      }
    };

    const timer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timer);
  }, [formData.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = formData.email.toLowerCase().trim();
    const found = [];
    if (!normalizedEmail.endsWith('@deped.gov.ph')) {
      found.push({ id: 'personnel-email', message: 'Only @deped.gov.ph emails are allowed for DepEd Email.' });
    } else if (emailStatus === 'duplicate') {
      found.push({ id: 'personnel-email', message: 'This email already exists in the masterlist.' });
    }
    if (!formData.first_name) found.push({ id: 'personnel-first-name', message: 'First name is required.' });
    if (!formData.last_name) found.push({ id: 'personnel-last-name', message: 'Last name is required.' });
    if (!formData.email && !found.some((er) => er.id === 'personnel-email')) found.push({ id: 'personnel-email', message: 'DepEd email is required.' });
    setErrors(found);
    if (found.length > 0) {
      document.getElementById(found[0].id)?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/third-level/officials-registry/register-personnel'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Success', data.message || 'Personnel registered successfully', 'success');
        onSuccess();
        onClose();
      } else {
        Swal.fire('Error', data.error || 'Failed to register personnel', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const availableDivisions = React.useMemo(() => {
    if (!formData.region) return (options.divisions || []);
    if (formData.region.toUpperCase() === 'CENTRAL OFFICE') {
      const coDivs = (options.regionDivisions?.['Central Office'] || options.regionDivisions?.['CENTRAL OFFICE'] || ['Central Office']);
      return coDivs.length > 0 ? coDivs : ['Central Office'];
    }
    const regionKey = options.regionDivisions ? Object.keys(options.regionDivisions).find(r => r.toUpperCase() === formData.region.toUpperCase()) : null;
    const raw = regionKey ? options.regionDivisions[regionKey] : (options.divisions || []);
    return (raw || []).filter(d => {
      if (!d) return false;
      const up = String(d).trim().toUpperCase();
      if (formData.region && up === formData.region.trim().toUpperCase()) return false;
      if ((options.regions || []).some(r => r.toUpperCase() !== 'CENTRAL OFFICE' && r.toUpperCase() === up)) return false;
      return !/^REGION\s+/i.test(up) && up !== 'REGIONAL OFFICE' && up !== 'N/A';
    });
  }, [formData.region, options.regionDivisions, options.divisions, options.regions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-card w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-6 text-white flex justify-between items-center shrink-0 border-b-2 border-white/10">
          <div>
            <h2 className="text-[30px] font-bold">Register Third Level Personnel</h2>
            <p className="text-blue-100 text-[21px] mt-1">Add a new official to the masterlist</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <FiX size={26} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <FormErrorSummary errors={errors} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FloatingLabelInput id="personnel-first-name" error={fieldError('personnel-first-name')} label="First Name" icon={<FiUser size={18} />} className="w-full" inputClassName="uppercase" type="text" required value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value.toUpperCase() })} placeholder="JUAN" />
            </div>
            <div>
              <FloatingLabelInput label="Middle Name" icon={<FiUser size={18} />} className="w-full" inputClassName="uppercase" type="text" value={formData.middle_name} onChange={(e) => setFormData({ ...formData, middle_name: e.target.value.toUpperCase() })} placeholder="SANTOS" />
            </div>
            <div>
              <FloatingLabelInput id="personnel-last-name" error={fieldError('personnel-last-name')} label="Last Name" icon={<FiUser size={18} />} className="w-full" inputClassName="uppercase" type="text" required value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value.toUpperCase() })} placeholder="DELA CRUZ" />
            </div>
            <div>
              <FloatingLabelInput as="select" label="Region" className="w-full" value={formData.region} onChange={(e) => {
                  const newRegion = e.target.value;
                  setFormData(prev => {
                    if (newRegion.toUpperCase() === 'CENTRAL OFFICE') {
                      return {
                        ...prev,
                        region: newRegion,
                        division: 'Central Office'
                      };
                    }
                    const regionKey = options.regionDivisions ? Object.keys(options.regionDivisions).find(r => r.toUpperCase() === newRegion.toUpperCase()) : null;
                    const validDivs = regionKey ? options.regionDivisions[regionKey] : options.divisions;
                    const keepDivision = prev.division && validDivs && validDivs.includes(prev.division);
                    return {
                      ...prev,
                      region: newRegion,
                      division: keepDivision ? prev.division : ''
                    };
                  });
                }}>
                <option value="" disabled>Select Region</option>
                {options.regions.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
              </FloatingLabelInput>
            </div>
          </div>

          <div>
            <FloatingLabelInput as="select" label="Division" className="w-full" value={formData.division} onChange={(e) => setFormData({ ...formData, division: e.target.value })} disabled={!formData.region}>
              <option value="" disabled>Select Division</option>
              {availableDivisions.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
            </FloatingLabelInput>
          </div>

          <div>
            <label className="block text-[18px] font-bold text-slate-500 uppercase tracking-wide mb-2">DepEd Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <FloatingLabelInput label="juan.delacruz@deped.gov.ph" className="w-full" id="personnel-email" aria-invalid={fieldError('personnel-email') ? 'true' : undefined} type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="juan.delacruz@deped.gov.ph" />
              {emailStatus === 'valid' && (
                <FiCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
              )}
              {emailStatus === 'checking' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            {emailStatus === 'invalid_domain' && (
              <p className="text-red-500 text-[18px] font-bold mt-2">Email must end with @deped.gov.ph.</p>
            )}
            {emailStatus === 'duplicate' && (
              <p className="text-red-500 text-[18px] font-bold mt-2">This email already exists in the masterlist.</p>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white/90 backdrop-blur pb-2 border-t-2 border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-[18px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || emailStatus === 'duplicate' || emailStatus === 'checking' || emailStatus === 'invalid_domain'}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-[18px]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Registering...
                </>
              ) : 'Register Personnel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPersonnelModal;

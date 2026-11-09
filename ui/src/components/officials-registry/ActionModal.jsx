import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from '../../utils/staticElements.jsx';
import { MagnifyingGlass as FiSearch, X as FiX } from '@phosphor-icons/react';
import ModernDatePicker from '../ModernDatePicker';
import JustificationInput from './JustificationInput';
import AddNewPersonnelForm from './AddNewPersonnelForm';
import DebouncedSearchInput from './DebouncedSearchInput';
import FloatingLabelInput from '../forms/FloatingLabelInput.jsx';

const ActionModal = ({ SearchableSelect, actionLoading, actionOfficial, activeOfficials, adminAction, assigneeSlot, effectivityDate, fetchUnassignedPersonnel, filteredVacantSlots, handleAdminAction, handleCancelVacate, isAddingPersonnel, justification, selectedOffice, setAssigneeSlot, setEffectivityDate, setIsAddingPersonnel, setJustification, setSelectedOffice, setShowActionModal, setSuccessorSlot, setTargetSlot, setUnassignedSearch, setVacateReason, showActionModal, successorSlot, targetSlot, token, unassignedCacheRef, unassignedLoading, unassignedPersonnel, unassignedSearch, uniqueOffices, user, vacateReason }) => {
  return (
    <>
                    {createPortal(
                        <AnimatePresence>
                            {showActionModal && (
                                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                                        className="bg-white rounded-card w-full max-w-xl shadow-2xl border-2 border-white/50 overflow-hidden flex flex-col max-h-[90vh]"
                                    >
                                        <div className="overflow-y-auto custom-scrollbar w-full h-full">
                                            <div className="p-10">
                                                <div className="flex justify-between items-start mb-8">
                                                    <div>
                                                        <span className="text-[15px] font-black text-brand-700 uppercase tracking-widest mb-2 block">Administrative Action</span>
                                                        <h2 className="modal-title text-[45px] text-brand-800 tracking-tighter uppercase leading-none">
                                                            {adminAction === 'reassign'
                                                                ? ((!actionOfficial?.first_name || actionOfficial?.first_name === 'VACANT') ? 'ASSIGN PERSONNEL' : 'REASSIGN OFFICIAL')
                                                                : `${adminAction === 'vacate' ? 'VACATING' : `${adminAction.toUpperCase()}ING`} OFFICIAL`}
                                                        </h2>
                                                        <p className="text-slate-400 font-bold text-[21px] mt-2">
                                                            {adminAction === 'reassign'
                                                                ? ((!actionOfficial?.first_name || actionOfficial?.first_name === 'VACANT') ? actionOfficial?.position_title : `${actionOfficial?.first_name || ''} ${actionOfficial?.last_name || ''}`)
                                                                : `${actionOfficial?.first_name || ''} ${actionOfficial?.last_name || ''}`}
                                                        </p>
                                                    </div>
                                                    <button onClick={() => setShowActionModal(false)} className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-600 transition-all border-2 border-slate-200">
                                                        <FiX size={20} />
                                                    </button>
                                                </div>

                                                <div className="space-y-6">
                                                    {adminAction === 'reassign' && (
                                                        <div className="space-y-4">
                                                            {(!actionOfficial?.first_name || actionOfficial?.first_name === 'VACANT') ? (
                                                                isAddingPersonnel ? (
                                                                    <AddNewPersonnelForm
                                                                        token={token || localStorage.getItem('token')}
                                                                        onCancel={() => setIsAddingPersonnel(false)}
                                                                        onSuccess={async (newId) => {
                                                                            unassignedCacheRef.current.clear();
                                                                            await fetchUnassignedPersonnel();
                                                                            setAssigneeSlot(newId);
                                                                            setIsAddingPersonnel(false);
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <>
                                                                        <div>
                                                                            <div className="flex justify-between items-end mb-3">
                                                                                <label className="text-[15px] font-black text-slate-400 uppercase tracking-widest block mb-0">Search Personnel Without Position</label>
                                                                                {user?.role === 'Central Office' && (
                                                                                    <button onClick={() => setIsAddingPersonnel(true)} className="text-[15px] font-black text-brand-800 hover:text-brand-700 uppercase tracking-widest transition-colors">+ Add New</button>
                                                                                )}
                                                                            </div>
                                                                            <div className="relative">
                                                                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                                                <DebouncedSearchInput
                                                                                    value={unassignedSearch}
                                                                                    onChange={setUnassignedSearch}
                                                                                    placeholder="Search by name or employee number..."
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <SearchableSelect
                                                                            label="Reassign To"
                                                                            info={unassignedLoading ? 'Loading available personnel...' : 'Showing personnel without an active position. Search to narrow the list.'}
                                                                            placeholder={unassignedLoading ? 'Loading personnel...' : 'Choose personnel...'}
                                                                            value={assigneeSlot}
                                                                            onChange={setAssigneeSlot}
                                                                            options={unassignedPersonnel.map(p => ({
                                                                                value: p.TLOid,
                                                                                label: `${p.first_name} ${p.last_name || ''}`.trim(),
                                                                                sublabel: [p.employee_number || p.TLOid, p.email].filter(Boolean).join(' - ')
                                                                            }))}
                                                                        />
                                                                        {!unassignedLoading && unassignedPersonnel.length === 0 && (
                                                                            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                                                                <p className="text-[15px] font-black text-slate-400 uppercase tracking-widest">No unassigned personnel found</p>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )
                                                            ) : (
                                                                <>
                                                                    <SearchableSelect
                                                                        label="Select Target Office"
                                                                        placeholder="Choose Office..."
                                                                        value={selectedOffice}
                                                                        onChange={(val) => {
                                                                            setSelectedOffice(val);
                                                                            setTargetSlot('');
                                                                        }}
                                                                        options={uniqueOffices.map(o => ({ value: o, label: o }))}
                                                                    />

                                                                    {selectedOffice ? (
                                                                        <SearchableSelect
                                                                            label="Select Vacant Position"
                                                                            placeholder="Choose vacant position..."
                                                                            value={targetSlot}
                                                                            onChange={setTargetSlot}
                                                                            options={filteredVacantSlots.map(slot => ({
                                                                                value: slot.TLOid,
                                                                                label: slot.is_oic ? `${slot.position_title} (OIC)` : slot.position_title,
                                                                                sublabel: slot.strand ? `Strand: ${slot.strand}` : 'No Strand'
                                                                            }))}
                                                                        />
                                                                    ) : (
                                                                        <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                                                            <p className="text-[15px] font-black text-slate-400 uppercase tracking-widest">Please select an office first to view vacant positions</p>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {adminAction === 'succeed' && (
                                                        <SearchableSelect
                                                            label="Select Successor"
                                                            info="If selected, the successor will take this position and their old slot becomes vacant."
                                                            placeholder="No successor (leave vacant)..."
                                                            value={successorSlot}
                                                            onChange={setSuccessorSlot}
                                                            options={[
                                                                { value: '', label: 'No successor', sublabel: 'Position will stay vacant' },
                                                                ...activeOfficials.map(o => ({
                                                                    value: o.TLOid,
                                                                    label: `${o.first_name} ${o.last_name}`,
                                                                    sublabel: `${o.position_title} — ${o.office}`
                                                                }))
                                                            ]}
                                                        />
                                                    )}

                                                    {(adminAction === 'reassign' || adminAction === 'vacate') && (
                                                        <div className="mb-4">
                                                            <label className="text-[15px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Date of Effectivity</label>
                                                            <ModernDatePicker
                                                                value={effectivityDate}
                                                                onChange={(val) => setEffectivityDate(val)}
                                                                className="w-full bg-white border-2 border-slate-200 focus:border-brand-800/20 rounded-2xl py-4 px-5 text-[21px] font-bold text-slate-700 outline-none transition-all"
                                                            />
                                                        </div>
                                                    )}

                                                    {adminAction === 'vacate' && (
                                                        <div className="mb-4">
                                                            <FloatingLabelInput as="select" label="Reason for Vacating" className="w-full" value={vacateReason} onChange={(e) => setVacateReason(e.target.value)}>
                                                                <option value="">Select a reason...</option>
                                                                <option value="Resignation">Resignation</option>
                                                                <option value="Retirement">Retirement</option>
                                                                <option value="Reassignment">Reassignment</option>
                                                                <option value="Promotion">Promotion</option>
                                                                <option value="Demotion">Demotion</option>
                                                                <option value="Dismissal">Dismissal</option>
                                                            </FloatingLabelInput>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="text-[15px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Justification / Remarks</label>
                                                        <JustificationInput
                                                            value={justification}
                                                            onChange={setJustification}
                                                            placeholder={adminAction === 'reassign' ? 'Optional reassignment note...' : 'Please provide additional remarks...'}
                                                        />
                                                    </div>

                                                    <div className="flex gap-4">
                                                        <button
                                                            disabled={actionLoading}
                                                            onClick={handleAdminAction}
                                                            className="flex-1 py-5 bg-brand-800 text-white rounded-lg font-black text-[16.5px] uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 border-2 border-transparent"
                                                        >
                                                            {actionLoading ? 'Processing...' : `Confirm ${adminAction}`}
                                                        </button>
                                                        {['Vacating', 'Resigning', 'Inactive', 'Reassigning', 'Pending Assignment'].includes(actionOfficial?.status) && (adminAction === 'vacate' || adminAction === 'reassign') && (
                                                            <button
                                                                disabled={actionLoading}
                                                                onClick={handleCancelVacate}
                                                                className="flex-1 py-5 bg-rose-50 text-rose-600 border-2 border-rose-200 rounded-lg font-black text-[16.5px] uppercase tracking-[0.2em] shadow-sm hover:bg-rose-100 hover:border-rose-300 transition-all active:scale-95 disabled:opacity-50"
                                                            >
                                                                {actionLoading ? 'Processing...' : 'Cancel Action'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>,
                        document.body
                    )}
    </>
  );
};

export default ActionModal;

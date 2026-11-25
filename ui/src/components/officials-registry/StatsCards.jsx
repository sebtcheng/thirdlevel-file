

const StatsCards = ({ activeTab, kpiCounts, setActiveTab, setLevelFilter, setOfficeFilter, setPositionFilter, setRegionFilter, setStatusTab, setStrandFilter, statusTab }) => {
  return (
    <>
                        {statusTab !== 'For Approval' && statusTab !== 'Rejected' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 w-full ui-stagger">
                                {/* Card 1: Total Third Level Officials */}
                                <div
                                    onClick={() => {
                                        setActiveTab(prev => prev === 'Third Level Officials' ? 'All' : 'Third Level Officials');
                                        setStatusTab('Active');
                                        setPositionFilter('All');
                                        setStrandFilter('All');
                                        setOfficeFilter('All');
                                        setLevelFilter('All');
                                        setRegionFilter('All');
                                    }}
                                    className={`min-h-[100px] p-5 card-surface card-interactive border-l-4 overflow-hidden cursor-pointer flex flex-col justify-between ${activeTab === 'Third Level Officials' && statusTab !== 'Vacant' ? 'border-l-brand-600 shadow-md ring-1 ring-brand-200' : 'border-l-brand-300'}`}
                                >
                                    <div className="order-1 font-ui font-semibold text-[14px] text-heading">Total Third Level Officials</div>
                                    <div className="order-3 mt-3 num font-bold text-[32px] text-brand-800 leading-tight mb-2">{kpiCounts.totalThirdLevel}</div>
                                    <div className="order-2 text-[12.5px] text-secondary leading-snug">Sum of active in view</div>
                                </div>

                                {/* Card 2: Total Vacant Positions */}
                                <div
                                    onClick={() => {
                                        setStatusTab(prev => prev === 'Vacant' ? 'Active' : 'Vacant');
                                        setActiveTab('All');
                                        setPositionFilter('All');
                                        setStrandFilter('All');
                                        setOfficeFilter('All');
                                        setLevelFilter('All');
                                        setRegionFilter('All');
                                    }}
                                    className={`min-h-[100px] p-5 card-surface card-interactive border-l-4 overflow-hidden cursor-pointer flex flex-col justify-between ${statusTab === 'Vacant' ? 'border-l-rose-500 shadow-md ring-1 ring-rose-200' : 'border-l-rose-400'}`}
                                >
                                    <div className="order-1 font-ui font-semibold text-[14px] text-heading">Total Vacant Positions</div>
                                    <div className="order-3 mt-3 num font-bold text-[32px] text-brand-800 leading-tight mb-2">{kpiCounts.totalVacant}</div>
                                    <div className="order-2 text-[12.5px] text-secondary leading-snug">Sum of vacant in view</div>
                                </div>

                                {/* Card 3: Total Officers-in-Charge */}
                                <div
                                    onClick={() => {
                                        setActiveTab(prev => prev === 'Officer in Charge' ? 'All' : 'Officer in Charge');
                                        setStatusTab('Active');
                                        setPositionFilter('All');
                                        setStrandFilter('All');
                                        setOfficeFilter('All');
                                        setLevelFilter('All');
                                        setRegionFilter('All');
                                    }}
                                    className={`min-h-[100px] p-5 card-surface card-interactive border-l-4 overflow-hidden cursor-pointer flex flex-col justify-between ${activeTab === 'Officer in Charge' && statusTab !== 'Vacant' ? 'border-l-amber-500 shadow-md ring-1 ring-amber-200' : 'border-l-amber-400'}`}
                                >
                                    <div className="order-1 font-ui font-semibold text-[14px] text-heading">Total Officers-in-Charge</div>
                                    <div className="order-3 mt-3 num font-bold text-[32px] text-brand-800 leading-tight mb-2">{kpiCounts.totalOic}</div>
                                    <div className="order-2 text-[12.5px] text-secondary leading-snug">Sum of active in view</div>
                                </div>

                                {/* Card 4: Total Concurrent Position Holders */}
                                <div
                                    onClick={() => {
                                        setActiveTab(prev => prev === 'Concurrent Positions' ? 'All' : 'Concurrent Positions');
                                        setStatusTab('Active');
                                        setPositionFilter('All');
                                        setStrandFilter('All');
                                        setOfficeFilter('All');
                                        setLevelFilter('All');
                                        setRegionFilter('All');
                                    }}
                                    className={`min-h-[100px] p-5 card-surface card-interactive border-l-4 overflow-hidden cursor-pointer flex flex-col justify-between ${activeTab === 'Concurrent Positions' && statusTab !== 'Vacant' ? 'border-l-indigo-500 shadow-md ring-1 ring-indigo-200' : 'border-l-indigo-400'}`}
                                >
                                    <div className="order-1 font-ui font-semibold text-[14px] text-heading">Total Concurrent Position Holders</div>
                                    <div className="order-3 mt-3 num font-bold text-[32px] text-brand-800 leading-tight mb-2">{kpiCounts.totalConcurrent}</div>
                                    <div className="order-2 text-[12.5px] text-secondary leading-snug">Sum of active in view</div>
                                </div>
                            </div>
                        )}
    </>
  );
};

export default StatsCards;

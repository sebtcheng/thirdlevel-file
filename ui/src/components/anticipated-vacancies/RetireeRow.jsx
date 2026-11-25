import React from 'react';

// The popup title already says this, so only other reasons are worth a badge.
const DEFAULT_REASON = 'Anticipated Retirement';

const formatDate = (value) => (value
  ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : 'N/A');

const Badge = ({ className, children }) => (
  <span className={`text-[13px] font-semibold px-2.5 py-0.5 rounded-full ${className}`}>{children}</span>
);

const RetireeRow = ({ official, onSelect }) => {
  const { separationReason, separationDate, isTurning65 } = official;
  const showReason = separationReason && separationReason !== DEFAULT_REASON;
  const isCompleted = separationDate && new Date(separationDate) <= new Date();

  return (
    <button
      type="button"
      onClick={() => onSelect(official)}
      className="w-full text-left px-4 sm:px-6 py-3.5 flex items-start gap-4 hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700 transition-colors"
    >
      <span aria-hidden="true" className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-heading font-bold text-[15px] flex-shrink-0">
        {official.first_name?.[0] || ''}{official.last_name?.[0] || ''}
      </span>
      <span className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start sm:gap-6">
        <span className="flex-1 min-w-0 break-words">
          <span className="block font-heading font-bold text-slate-800 text-[17px] leading-snug">
            {official.first_name} {official.last_name}
          </span>
          <span className="block text-[15px] text-slate-700 mt-0.5 leading-snug">{official.position_title || 'Unassigned'}</span>
          <span className="block text-[15px] text-slate-500 mt-0.5 leading-snug">{official.office || 'No Office'}</span>
          {(showReason || isTurning65) && (
            <span className="flex flex-wrap gap-2 mt-2">
              {showReason && <Badge className="bg-red-50 text-red-700">{separationReason}</Badge>}
              {isTurning65 && <Badge className="bg-yellow-50 text-yellow-700">Turns 65</Badge>}
            </span>
          )}
        </span>
        <span className="flex-shrink-0 mt-1.5 sm:mt-0 sm:text-right text-[15px] font-semibold text-blue-800 whitespace-nowrap tabular-nums">
          {formatDate(separationDate)}
          {isCompleted && <span className="ml-2 sm:ml-0 sm:block text-[13px] text-green-700">Completed</span>}
        </span>
      </span>
    </button>
  );
};

export default RetireeRow;

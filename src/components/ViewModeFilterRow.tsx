import React from 'react';
import { User, Calendar } from 'lucide-react';
import { GroupByMode } from '../types';

interface ViewModeFilterRowProps {
  selectedMode: GroupByMode;
  onModeSelected: (mode: GroupByMode) => void;
}

export const ViewModeFilterRow: React.FC<ViewModeFilterRowProps> = ({
  selectedMode,
  onModeSelected
}) => {
  return (
    <div className="px-3.5 py-1 flex justify-end items-center space-x-2">
      <button
        onClick={() => onModeSelected(GroupByMode.BY_USER_DETAILS)}
        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 transition-all border ${
          selectedMode === GroupByMode.BY_USER_DETAILS
            ? 'bg-[#1B5E20] text-white border-[#1B5E20] shadow-xs'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <User size={13} />
        <span>গ্রাহক অনুযায়ী</span>
      </button>

      <button
        onClick={() => onModeSelected(GroupByMode.BY_DATE_WORK)}
        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 transition-all border ${
          selectedMode === GroupByMode.BY_DATE_WORK
            ? 'bg-[#1B5E20] text-white border-[#1B5E20] shadow-xs'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <Calendar size={13} />
        <span>তারিখ ও কাজ</span>
      </button>
    </div>
  );
};

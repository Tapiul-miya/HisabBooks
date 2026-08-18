import React from 'react';
import { User, Calendar, Briefcase } from 'lucide-react';
import { GroupByMode } from '../types';

interface ViewModeFilterRowProps {
  selectedMode: GroupByMode;
  selectedWorkDetails: string;
  workDetailsOptions: string[];
  onModeSelected: (mode: GroupByMode) => void;
  onWorkDetailsFilterChange: (workDetails: string) => void;
}

export const ViewModeFilterRow: React.FC<ViewModeFilterRowProps> = ({
  selectedMode,
  selectedWorkDetails,
  workDetailsOptions = [],
  onModeSelected,
  onWorkDetailsFilterChange
}) => {
  const uniqueWorkDetailsOptions = React.useMemo(() => {
    const set = new Set<string>();
    (workDetailsOptions || []).forEach((work) => {
      if (work && work.trim()) {
        const normalized = work.split('|').map(s => s.trim()).filter(Boolean).join(' | ');
        if (normalized) set.add(normalized);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'bn'));
  }, [workDetailsOptions]);

  return (
    <div className="px-3.5 py-1 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
      {/* 1. workDetails dropdown filter */}
      <div className="relative flex items-center shrink-0 min-w-[130px] max-w-[190px]">
        <Briefcase size={13} className="absolute left-2.5 text-[#1565C0] pointer-events-none z-10" />
        <select
          value={selectedWorkDetails}
          onChange={(e) => onWorkDetailsFilterChange(e.target.value)}
          className={`text-xs rounded-full pl-7 pr-3 py-1 font-medium transition-all outline-none border cursor-pointer w-full truncate ${
            selectedWorkDetails
              ? 'bg-blue-50 text-[#0D47A1] border-blue-300 font-bold shadow-2xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <option value="">সকল কাজ</option>
          {uniqueWorkDetailsOptions.map((work) => (
            <option key={work} value={work}>
              {work}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Group By: Customer */}
      <button
        onClick={() => onModeSelected(GroupByMode.BY_USER_DETAILS)}
        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 transition-all border shrink-0 ${
          selectedMode === GroupByMode.BY_USER_DETAILS
            ? 'bg-[#1B5E20] text-white border-[#1B5E20] shadow-xs font-semibold'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <User size={13} />
        <span>গ্রাহক অনুযায়ী</span>
      </button>

      {/* 3. Group By: Date & Work */}
      <button
        onClick={() => onModeSelected(GroupByMode.BY_DATE_WORK)}
        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 transition-all border shrink-0 ${
          selectedMode === GroupByMode.BY_DATE_WORK
            ? 'bg-[#1B5E20] text-white border-[#1B5E20] shadow-xs font-semibold'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <Calendar size={13} />
        <span>তারিখ ও কাজ</span>
      </button>
    </div>
  );
};


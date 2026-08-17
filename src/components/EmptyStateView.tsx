import React from 'react';
import { Receipt } from 'lucide-react';

export const EmptyStateView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
      <div className="w-20 h-20 bg-slate-200/60 rounded-full flex items-center justify-center text-[#90A4AE] mb-4 shadow-inner">
        <Receipt size={40} />
      </div>
      <h3 className="text-lg font-bold text-[#546E7A] mb-1">
        কোন হিসাব পাওয়া যায়নি!
      </h3>
      <p className="text-xs text-[#78909C] max-w-xs leading-relaxed">
        নতুন হিসাব যোগ করতে নীচের বাটনে ট্যাপ করুন
      </p>
    </div>
  );
};

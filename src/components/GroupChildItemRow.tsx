import React, { useState } from 'react';
import { Edit2, Trash2, AlertTriangle, Phone, MapPin, Filter } from 'lucide-react';
import { VehicleHisab, GroupByMode, CustomerFilter } from '../types';
import { Utils } from '../util/utils';

interface GroupChildItemRowProps {
  item: VehicleHisab;
  mode: GroupByMode;
  isHighlighted?: boolean;
  onDelete: (id: number) => void;
  onEdit: (item: VehicleHisab) => void;
  onCustomerClick?: (filter: CustomerFilter) => void;
}

export const GroupChildItemRow: React.FC<GroupChildItemRowProps> = ({
  item,
  mode,
  isHighlighted,
  onDelete,
  onEdit,
  onCustomerClick
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Dynamic measurement summary
  const getMeasurementText = () => {
    const type = item.hisabType.toLowerCase();
    const hasJoinEnd = Utils.hasJoinEndDateBlocks(item.stm || '');
    if (type.includes('trip')) {
      return `ট্রিপ: ${Math.round(item.qty)} × ৳${Utils.toCleanString(item.rate)} = ৳${Utils.toCleanString(item.amount)}`;
    } else if (type.includes('hour')) {
      return `ঘণ্টা: ${item.unit} × ৳${Utils.toCleanString(item.rate)} = ৳${Utils.toCleanString(item.amount)}`;
    } else if (type.includes('bigha')) {
      return `কাঠা: ${Math.round(item.qty)} বিঘা:${item.unit} × ৳${Utils.toCleanString(item.rate)} = ৳${Utils.toCleanString(item.amount)}`;
    } else if (type.includes('monthly') || type.includes('month') || hasJoinEnd) {
      return `বছর: ${item.unit || item.qty} × ৳${Utils.toCleanString(item.rate)} = ৳${Utils.toCleanString(item.amount)}`;
    } else {
      return `পরিমাণ: ${item.qty} × ৳${Utils.toCleanString(item.rate)} = ৳${Utils.toCleanString(item.amount)}`;
    }
  };

  const isDue = (item.due || 0) > 0;

  // Rich, attractive gradient styling for child card
  const childCardTheme = isHighlighted
    ? 'animate-blur-float ring-4 ring-blue-400 bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-blue-400 shadow-md'
    : isDue
    ? 'bg-gradient-to-br from-[#FFFFFF] via-[#FFF9F9] to-[#FFE4E6]/50 border-rose-300/80 shadow-[0_2px_10px_-2px_rgba(244,63,94,0.14)] hover:border-rose-400 hover:shadow-md'
    : 'bg-gradient-to-br from-[#FFFFFF] via-[#F6FCF8] to-[#DCFCE7]/50 border-emerald-300/80 shadow-[0_2px_10px_-2px_rgba(16,185,129,0.14)] hover:border-emerald-400 hover:shadow-md';

  return (
    <div
      className={`w-full rounded-xl border p-3 sm:p-3.5 transition-all duration-300 ${childCardTheme}`}
    >
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <div className="min-w-0 flex-1">
          {mode === GroupByMode.BY_DATE_WORK && item.name ? (
            <button
              type="button"
              onClick={() => onCustomerClick?.({
                name: item.name,
                mobile: item.mobile,
                address: item.address,
                hisabType: item.hisabType
              })}
              className="inline-flex items-center space-x-1 text-xs font-bold text-slate-800 hover:text-emerald-800 hover:underline cursor-pointer group text-left break-words whitespace-normal"
              title="একই নাম, মোবাইল, ঠিকানা ও হিসাবের ধরন অনুযায়ী ফিল্টার করুন"
            >
              <span className="break-words">👤 {item.name}</span>
              <Filter size={10} className="text-slate-400 group-hover:text-emerald-700 transition-colors shrink-0" />
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-800 break-words whitespace-normal inline-flex items-center gap-1.5">
              <span>{mode === GroupByMode.BY_DATE_WORK ? '👤 নাম ছাড়া' : `📅 ${item.date}`}</span>
              {item.hisabType && (
                <span className="text-[10px] font-bold text-teal-800 bg-gradient-to-r from-teal-50 to-emerald-100/90 px-2 py-0.5 rounded-md border border-teal-300/70 shadow-2xs">
                  {item.hisabType}
                </span>
              )}
            </span>
          )}
          {mode === GroupByMode.BY_DATE_WORK && (item.mobile || item.address) && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[11px] text-[#455A64]">
              {item.mobile && (
                <a
                  href={`tel:${item.mobile}`}
                  className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 hover:underline active:opacity-75 font-medium cursor-pointer shrink-0"
                  title="সরাসরি কল করুন"
                >
                  <Phone size={10} className="text-emerald-600 shrink-0" />
                  <span>{item.mobile}</span>
                </a>
              )}
              {item.address && (
                <span className="flex items-center space-x-1 text-slate-500 break-words whitespace-normal">
                  <MapPin size={10} className="text-slate-400 shrink-0" />
                  <span className="break-words">{item.address}</span>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => onEdit(item)}
            className="p-1 text-blue-600 hover:bg-blue-100/70 rounded-md transition-colors"
            title="সম্পাদনা করুন"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="p-1 text-red-600 hover:bg-red-100/70 rounded-md transition-colors"
            title="মুছে ফেলুন"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {item.workDetails && (
        <div className="text-[11px] font-medium text-[#0D47A1] bg-gradient-to-r from-blue-50 via-indigo-50/80 to-sky-50 border border-blue-200/80 px-2.5 py-1.5 rounded-lg my-1.5 break-words whitespace-normal leading-relaxed shadow-2xs">
          {item.workDetails}
        </div>
      )}

      {/* Measurement / Calculation Box with smooth translucent gradient */}
      <div className="text-xs font-semibold text-slate-800 break-words whitespace-normal mt-1 bg-white/85 px-2.5 py-1.5 rounded-lg border border-slate-200/70 shadow-2xs">
        {getMeasurementText()}
      </div>

      <div className={`flex items-center justify-between text-xs font-semibold text-slate-800 mt-2.5 pt-2 border-t ${isDue ? 'border-rose-100' : 'border-emerald-100'} px-0.5`}>
        <span>
          বিল: <span className="font-bold text-slate-900">৳{Utils.toCleanString(item.bill)}</span>
        </span>
        <span className="text-[#15803D]">
          জমা: <span className="font-bold text-[#15803D]">৳{Utils.toCleanString(item.paid)}</span>
        </span>
        <span>
          {isDue ? (
            <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md whitespace-nowrap inline-block shadow-2xs">
              বকেয়া: ৳{Utils.toCleanString(item.due)}
            </span>
          ) : (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md whitespace-nowrap inline-block shadow-2xs">
              পরিশোধিত: ৳{Utils.toCleanString(item.due)}
            </span>
          )}
        </span>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-slate-900">মুছে ফেলার নিশ্চিতকরণ</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              আপনি কি নিশ্চিত যে এই হিসাবটি মুছে ফেলতে চান?
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                বাতিল
              </button>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  onDelete(item.id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

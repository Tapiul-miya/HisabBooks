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

  return (
    <div
      className={`w-full rounded-xl border p-2.5 sm:p-3 shadow-2xs transition-all duration-300 ${
        isHighlighted
          ? 'animate-blur-float ring-4 ring-blue-400 bg-blue-50/70 border-blue-300'
          : 'bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#EDF2F7] border-[#CBD5E1]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div>
          {mode === GroupByMode.BY_DATE_WORK && item.name ? (
            <button
              type="button"
              onClick={() => onCustomerClick?.({
                name: item.name,
                mobile: item.mobile,
                address: item.address,
                hisabType: item.hisabType
              })}
              className="inline-flex items-center space-x-1 text-xs font-bold text-slate-800 hover:text-emerald-800 hover:underline cursor-pointer group"
              title="একই নাম, মোবাইল, ঠিকানা ও হিসাবের ধরন অনুযায়ী ফিল্টার করুন"
            >
              <span>👤 {item.name}</span>
              <Filter size={10} className="text-slate-400 group-hover:text-emerald-700 transition-colors" />
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-700">
              {mode === GroupByMode.BY_DATE_WORK ? '👤 নাম ছাড়া' : `📅 ${item.date}`}
            </span>
          )}
          {mode === GroupByMode.BY_DATE_WORK && (item.mobile || item.address) && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[11px] text-[#455A64]">
              {item.mobile && (
                <a
                  href={`tel:${item.mobile}`}
                  className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 hover:underline active:opacity-75 font-medium cursor-pointer"
                  title="সরাসরি কল করুন"
                >
                  <Phone size={10} className="text-emerald-600 shrink-0" />
                  <span>{item.mobile}</span>
                </a>
              )}
              {item.address && (
                <span className="flex items-center space-x-1 text-slate-500">
                  <MapPin size={10} className="text-slate-400 shrink-0" />
                  <span>{item.address}</span>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => onEdit(item)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="সম্পাদনা করুন"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="মুছে ফেলুন"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="text-xs font-medium text-slate-800">
        {getMeasurementText()}
      </div>

      {item.optional && (
        <div className="text-xs font-semibold text-[#00796B] mt-0.5">
          বেড: {item.optional}
        </div>
      )}

      <div className="flex items-center justify-between text-xs font-medium text-slate-800 mt-1">
        <span>
          বিল: <span className="font-bold text-slate-900">৳{Utils.toCleanString(item.bill)}</span>
        </span>
        <span className="text-[#15803D]">
          জমা: <span className="font-bold text-[#15803D]">৳{Utils.toCleanString(item.paid)}</span>
        </span>
      </div>

      <div className="text-right mt-1">
        {item.due > 0 ? (
          <span className="text-xs font-bold text-red-600 bg-red-50/80 px-1.5 py-0.5 rounded whitespace-nowrap inline-block">
            বকেয়া: ৳{Utils.toCleanString(item.due)}
          </span>
        ) : (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50/80 px-1.5 py-0.5 rounded whitespace-nowrap inline-block">
            পরিশোধিত: ৳{Utils.toCleanString(item.due)}
          </span>
        )}
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

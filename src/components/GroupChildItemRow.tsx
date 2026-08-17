import React, { useState } from 'react';
import { Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { VehicleHisab, GroupByMode } from '../types';
import { Utils } from '../util/utils';

interface GroupChildItemRowProps {
  item: VehicleHisab;
  mode: GroupByMode;
  isHighlighted?: boolean;
  onDelete: (id: number) => void;
  onEdit: (item: VehicleHisab) => void;
}

export const GroupChildItemRow: React.FC<GroupChildItemRowProps> = ({
  item,
  mode,
  isHighlighted,
  onDelete,
  onEdit
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

  const childTitleText =
    mode === GroupByMode.BY_DATE_WORK
      ? item.name ? `👤 ${item.name}` : '👤 নাম ছাড়া'
      : `📅 ${item.date}`;

  return (
    <div
      className={`rounded-xl border p-2.5 shadow-2xs transition-all duration-300 ${
        isHighlighted
          ? 'animate-blur-float ring-4 ring-blue-400 bg-blue-50/70 border-blue-300'
          : 'bg-[#F8FAFC] border-[#E2E8F0]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-700">
          {childTitleText}
        </span>
        <div className="flex items-center space-x-1">
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

      <div className="text-xs font-medium text-slate-800 mt-1">
        বিল: ৳{Utils.toCleanString(item.bill)} | জমা: ৳{Utils.toCleanString(item.paid)}
      </div>

      <div className="text-right mt-0.5">
        {item.due > 0 ? (
          <span className="text-xs font-bold text-red-600">
            বকেয়া: ৳{Utils.toCleanString(item.due)}
          </span>
        ) : (
          <span className="text-xs font-bold text-emerald-600">
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

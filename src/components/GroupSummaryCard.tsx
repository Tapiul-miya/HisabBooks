import React, { useState } from 'react';
import { Copy, ChevronDown, ChevronUp, Phone, MapPin, FileText } from 'lucide-react';
import { GroupedHisab, GroupByMode, VehicleHisab } from '../types';
import { GroupChildItemRow } from './GroupChildItemRow';
import { Utils } from '../util/utils';
import { SingleGroupPdfPreviewModal } from './SingleGroupPdfPreviewModal';

interface GroupSummaryCardProps {
  groupedHisab: GroupedHisab;
  mode: GroupByMode;
  expanded: boolean;
  isHighlighted?: boolean;
  highlightedItemId?: number | null;
  onExpandToggle: () => void;
  onDeleteHisab: (id: number) => void;
  onEditClick: (item: VehicleHisab) => void;
  onCopyClick: (grouped: GroupedHisab) => void;
}

export const GroupSummaryCard: React.FC<GroupSummaryCardProps> = React.memo(({
  groupedHisab,
  mode,
  expanded,
  isHighlighted,
  highlightedItemId,
  onExpandToggle,
  onDeleteHisab,
  onEditClick,
  onCopyClick
}) => {
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const isDue = groupedHisab.totalDue > 0;
  const borderColor = isDue ? 'border-[#EF5350]' : 'border-[#66BB6A]';

  const shouldHighlightParent = isHighlighted && groupedHisab.items.length === 1;

  const type = groupedHisab.hisabType.toLowerCase();
  let qtyText = `পরিমাণ: ${groupedHisab.totalQty}`;
  if (type.includes('trip')) {
    qtyText = `ট্রিপ: ${Math.round(groupedHisab.totalQty)}`;
  } else if (type.includes('hour')) {
    qtyText = `ঘণ্টা: ${Utils.minuteToHour(groupedHisab.totalQty)}`;
  } else if (type.includes('bigha')) {
    qtyText = `বিঘা: ${Utils.formatKathaToBigha(groupedHisab.totalQty)}`;
  } else if (type.includes('monthly') || type.includes('month')) {
    qtyText = `বছর: ${Utils.formatDaysToYMD(groupedHisab.totalQty)}`;
  }

  const getHisabTypeLabel = (typeKey: string) => {
    const k = (typeKey || '').toLowerCase();
    if (k.includes('bigha')) return 'জমির হিসাব (বিঘা)';
    if (k.includes('trip')) return 'ট্রিপ হিসাব';
    if (k.includes('hour')) return 'ঘণ্টা হিসাব';
    if (k.includes('monthly') || k.includes('month')) return 'মাসিক হিসাব';
    if (k.includes('contract')) return 'চুক্তি হিসাব';
    if (k.includes('fuel')) return 'ফুয়েল / জ্বালানি';
    if (k.includes('rent')) return 'ভাড়া';
    if (k.includes('other')) return 'অন্যান্য';
    return typeKey || 'সাধারণ';
  };

  const cardTitle =
    mode === GroupByMode.BY_USER_DETAILS && groupedHisab.name.trim()
      ? `👤 ${groupedHisab.name}`
      : `📅 ${groupedHisab.date}`;

  return (
    <>
      <div
        className={`bg-white rounded-xl border-2 ${borderColor} shadow-xs overflow-hidden transition-all duration-300 ${
          shouldHighlightParent ? 'animate-blur-float ring-4 ring-blue-400 bg-blue-50/50' : ''
        }`}
      >
        <div
          onClick={onExpandToggle}
          className="p-3 cursor-pointer select-none"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-[#0D1B2A] leading-snug break-words">
                {cardTitle}
              </h3>
              {mode === GroupByMode.BY_USER_DETAILS && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-[#455A64]">
                  {groupedHisab.mobile && (
                    <span className="flex items-center space-x-1">
                      <Phone size={11} className="text-slate-500" />
                      <span>{groupedHisab.mobile}</span>
                    </span>
                  )}
                  {groupedHisab.address && (
                    <span className="flex items-center space-x-1">
                      <MapPin size={11} className="text-slate-500" />
                      <span>{groupedHisab.address}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-0.5 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPdfPreview(true);
                }}
                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                title="PDF প্রাকদর্শন"
              >
                <FileText size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyClick(groupedHisab);
                }}
                className="p-1.5 text-[#0D47A1] hover:bg-blue-50 rounded-lg transition-colors"
                title="কপি করুন"
              >
                <Copy size={16} />
              </button>
              <div className="text-slate-500 p-1">
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 text-xs">
            <div className="min-w-0 pr-2 space-y-1">
              {groupedHisab.workDetails ? (
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="bg-[#E3F2FD] text-[#1565C0] text-[11px] font-semibold px-2 py-0.5 rounded truncate inline-block max-w-full">
                    {groupedHisab.workDetails}
                  </span>
                </div>
              ) : null}
              <div className="text-[11px] font-semibold text-slate-600 flex items-center space-x-1">
                <span>এন্ট্রি সংখ্যা:</span>
                <span className="bg-blue-100 text-[#0D47A1] px-1.5 py-0.2 rounded font-bold">
                  {groupedHisab.itemCount || groupedHisab.items.length} টি
                </span>
              </div>
            </div>

            <div className="font-medium text-[#2C3E50] shrink-0 text-right">
              {qtyText}
            </div>
          </div>

          <div className="my-2 border-t border-[#CFD8DC]"></div>

          <div className="flex items-center justify-between text-xs font-semibold text-[#2C3E50]">
            <div>
              বিল: ৳{Utils.toCleanString(groupedHisab.totalBill)} | জমা: ৳{Utils.toCleanString(groupedHisab.totalPaid)}
            </div>
            <div>
              {isDue ? (
                <span className="font-bold text-[#DC2626]">
                  বকেয়া: ৳{Utils.toCleanString(groupedHisab.totalDue)}
                </span>
              ) : (
                <span className="font-bold text-[#16A34A]">
                  পরিশোধিত: ৳{Utils.toCleanString(groupedHisab.totalDue)}
                </span>
              )}
            </div>
          </div>
        </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100 max-h-[300px] overflow-y-auto">
          <div className="text-xs font-bold text-[#0D47A1] mb-2 py-1">
            বিস্তারিত লেনদেন সমূহ:
          </div>
          <div className="space-y-2">
            {groupedHisab.items.map((item) => (
              <GroupChildItemRow
                key={item.id}
                item={item}
                mode={mode}
                isHighlighted={highlightedItemId === item.id}
                onDelete={onDeleteHisab}
                onEdit={onEditClick}
              />
            ))}
          </div>
        </div>
      )}
      </div>

      {showPdfPreview && (
        <SingleGroupPdfPreviewModal
          group={groupedHisab}
          mode={mode}
          onClose={() => setShowPdfPreview(false)}
        />
      )}
    </>
  );
});

import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Phone, MapPin, FileText, Pencil, Filter } from 'lucide-react';
import { GroupedHisab, GroupByMode, VehicleHisab, CustomerFilter } from '../types';
import { GroupChildItemRow } from './GroupChildItemRow';
import { Utils } from '../util/utils';
import { SingleGroupPdfPreviewModal } from './SingleGroupPdfPreviewModal';
import { GroupInfoEditModal } from './GroupInfoEditModal';

interface GroupSummaryCardProps {
  groupedHisab: GroupedHisab;
  mode: GroupByMode;
  expanded: boolean;
  isHighlighted?: boolean;
  highlightedItemId?: number | null;
  activeCustomerFilter?: CustomerFilter | null;
  onExpandToggle: () => void;
  onDeleteHisab: (id: number) => void;
  onEditClick: (item: VehicleHisab) => void;
  onCopyClick: (grouped: GroupedHisab) => void;
  onCustomerClick?: (filter: CustomerFilter) => void;
  onReloadData?: () => void;
}

export const GroupSummaryCard: React.FC<GroupSummaryCardProps> = React.memo(({
  groupedHisab,
  mode,
  expanded,
  isHighlighted,
  highlightedItemId,
  activeCustomerFilter,
  onExpandToggle,
  onDeleteHisab,
  onEditClick,
  onCopyClick,
  onCustomerClick,
  onReloadData
}) => {
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isDue = groupedHisab.totalDue > 0;
  const borderColor = isDue ? 'border-[#EF5350]' : 'border-[#66BB6A]';

  const shouldHighlightParent = isHighlighted && groupedHisab.items.length === 1;

  const isCustomerFilterActive = Boolean(
    activeCustomerFilter &&
    (activeCustomerFilter.name || '').trim().toLowerCase() === (groupedHisab.name || '').trim().toLowerCase() &&
    (activeCustomerFilter.mobile || '').trim() === (groupedHisab.mobile || '').trim() &&
    (activeCustomerFilter.address || '').trim().toLowerCase() === (groupedHisab.address || '').trim().toLowerCase() &&
    (activeCustomerFilter.hisabType || '').trim().toLowerCase() === (groupedHisab.hisabType || '').trim().toLowerCase()
  );

  const type = groupedHisab.hisabType.toLowerCase();
  let qtyText = `পরিমাণ: ${groupedHisab.totalQty}`;
  if (type.includes('trip')) {
    qtyText = `ট্রিপ: ${Math.round(groupedHisab.totalQty)}`;
  } else if (type.includes('hour')) {
    qtyText = `ঘণ্টা: ${Utils.minuteToHour(groupedHisab.totalQty)}`;
  } else if (type.includes('bigha')) {
    qtyText = `বিঘা: ${Utils.formatKathaToBigha(groupedHisab.totalQty)}`;
  } else if (type.includes('monthly') || type.includes('month')) {
    const ymdVal = groupedHisab.ymd && groupedHisab.ymd !== '00D' 
      ? groupedHisab.ymd 
      : Utils.formatDaysToYMD(groupedHisab.totalQty);
    qtyText = `বছর: ${ymdVal}`;
  }

  const getHisabTypeLabel = (typeKey: string) => {
    return Utils.getHisabTypeLabel(typeKey);
  };

  const cardTitle =
    mode === GroupByMode.BY_USER_DETAILS && groupedHisab.name.trim()
      ? `👤 ${groupedHisab.name}`
      : `📅 ${groupedHisab.date}`;

  // Premium, rich gradient depending on Due status and active selection
  const cardGradient = isDue
    ? 'bg-gradient-to-b from-[#FFFFFF] via-[#FFFDFD] to-[#FFF5F5] border-rose-400/90 shadow-[0_3px_12px_-2px_rgba(244,63,94,0.12)]'
    : 'bg-gradient-to-b from-[#FFFFFF] via-[#F8FCF9] to-[#EFFBF4] border-emerald-400/90 shadow-[0_3px_12px_-2px_rgba(16,185,129,0.12)]';

  return (
    <>
      <div
        className={`w-full rounded-2xl border-2 ${cardGradient} overflow-hidden transition-all duration-300 ${
          shouldHighlightParent ? 'animate-blur-float ring-4 ring-blue-400 bg-blue-50/70' : ''
        } ${
          isCustomerFilterActive ? 'ring-3 ring-emerald-600 shadow-lg' : ''
        }`}
      >
        <div
          onClick={onExpandToggle}
          className="p-3.5 sm:p-4 cursor-pointer select-none"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {mode === GroupByMode.BY_USER_DETAILS && groupedHisab.name.trim() ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCustomerClick?.({
                      name: groupedHisab.name,
                      mobile: groupedHisab.mobile,
                      address: groupedHisab.address,
                      hisabType: groupedHisab.hisabType
                    });
                  }}
                  className={`inline-flex items-center space-x-1.5 px-2 py-0.5 -ml-1 rounded-lg text-base font-bold text-left transition-all duration-150 group cursor-pointer ${
                    isCustomerFilterActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-[#0D1B2A] hover:text-emerald-800 hover:bg-emerald-100/70 active:scale-98'
                  }`}
                  title="একই নাম, মোবাইল, ঠিকানা ও হিসাবের ধরন অনুযায়ী ফিল্টার করতে ক্লিক করুন"
                >
                  <span className="leading-snug break-words whitespace-normal">👤 {groupedHisab.name}</span>
                  <Filter
                    size={13}
                    className={`shrink-0 transition-opacity ${
                      isCustomerFilterActive
                        ? 'text-white opacity-100'
                        : 'text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-emerald-700'
                    }`}
                  />
                </button>
              ) : (
                <h3 className="text-base font-bold text-[#0D1B2A] leading-snug break-words whitespace-normal">
                  {cardTitle}
                </h3>
              )}
              {mode === GroupByMode.BY_USER_DETAILS && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-[#455A64]">
                  {groupedHisab.mobile && (
                    <a
                      href={`tel:${groupedHisab.mobile}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 hover:underline active:opacity-75 font-medium cursor-pointer transition-colors break-words"
                      title="সরাসরি কল করুন"
                    >
                      <Phone size={11} className="text-emerald-600 shrink-0" />
                      <span className="break-all">{groupedHisab.mobile}</span>
                    </a>
                  )}
                  {groupedHisab.address && (
                    <span className="flex items-center space-x-1 break-words whitespace-normal">
                      <MapPin size={11} className="text-slate-500 shrink-0" />
                      <span className="break-words">{groupedHisab.address}</span>
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
                className="w-3.5 h-3.5 text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 rounded-sm shadow-sm hover:shadow active:scale-90 transition-all duration-200 flex items-center justify-center ring-1 ring-blue-500/20"
                title="নতুন এন্ট্রি যোগ করুন"
              >
                <Plus size={8} className="stroke-[2.5]" />
              </button>
              {mode === GroupByMode.BY_USER_DETAILS && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditModal(true);
                  }}
                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title="গ্রুপের তথ্য সম্পাদন করুন"
                >
                  <Pencil size={16} />
                </button>
              )}
              <div className="text-slate-500 p-1">
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between mt-1.5 pt-1.5 border-t border-slate-100 text-xs gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              {groupedHisab.workDetails ? (
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="bg-[#E3F2FD] text-[#1565C0] text-[11px] font-semibold px-2 py-1 rounded-md break-words whitespace-normal inline-block max-w-full leading-relaxed border border-blue-100">
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

            <div className="bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-bold shrink-0 text-right shadow-2xs whitespace-normal break-words">
              {qtyText}
            </div>
          </div>

          <div className="my-2 border-t border-[#CFD8DC]"></div>

          <div className="flex items-center justify-between text-xs font-semibold text-[#2C3E50]">
            <span className="text-slate-700">
              বিল: <span className="font-bold text-slate-900">৳{Utils.toCleanString(groupedHisab.totalBill)}</span>
            </span>
            <span className="text-[#15803D]">
              জমা: <span className="font-bold text-[#15803D]">৳{Utils.toCleanString(groupedHisab.totalPaid)}</span>
            </span>
          </div>

          <div className="flex justify-end mt-1.5">
            {isDue ? (
              <span className="text-xs font-bold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                বকেয়া: ৳{Utils.toCleanString(groupedHisab.totalDue)}
              </span>
            ) : (
              <span className="text-xs font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                পরিশোধিত: ৳{Utils.toCleanString(groupedHisab.totalDue)}
              </span>
            )}
          </div>
        </div>

      {expanded && (
        <div className="px-2.5 sm:px-3.5 pb-3.5 pt-2 bg-gradient-to-b from-[#F1F5F9] to-[#E2E8F0] border-t border-slate-300/80 max-h-[360px] overflow-y-auto">
          <div className="text-xs font-bold text-[#0D47A1] mb-2 px-1 py-0.5 flex items-center justify-between">
            <span>বিস্তারিত লেনদেন সমূহ:</span>
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
                onCustomerClick={onCustomerClick}
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

      {showEditModal && (
        <GroupInfoEditModal
          group={groupedHisab}
          mode={mode}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            if (onReloadData) {
              onReloadData();
            }
          }}
        />
      )}
    </>
  );
});

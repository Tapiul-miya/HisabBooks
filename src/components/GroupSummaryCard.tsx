import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Phone, MapPin, FileText, Pencil, Filter } from 'lucide-react';
import { GroupedHisab, GroupByMode, VehicleHisab, CustomerFilter, DateWorkFilter, AdvancedFilterState } from '../types';
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
  activeDateFilter?: DateWorkFilter | null;
  selectedWorkDetails?: string;
  advancedFilter?: AdvancedFilterState | null;
  onExpandToggle: () => void;
  onDeleteHisab: (id: number) => void;
  onEditClick: (item: VehicleHisab) => void;
  onCopyClick: (grouped: GroupedHisab) => void;
  onCustomerClick?: (filter: CustomerFilter) => void;
  onDateClick?: (filter: DateWorkFilter) => void;
  onReloadData?: () => void;
  selectedItemIds?: Set<number>;
  onToggleItemSelection?: (id: number) => void;
}

export const GroupSummaryCard: React.FC<GroupSummaryCardProps> = React.memo(({
  groupedHisab,
  mode,
  expanded,
  isHighlighted,
  highlightedItemId,
  activeCustomerFilter,
  activeDateFilter,
  selectedWorkDetails,
  advancedFilter,
  onExpandToggle,
  onDeleteHisab,
  onEditClick,
  onCopyClick,
  onCustomerClick,
  onDateClick,
  onReloadData,
  selectedItemIds,
  onToggleItemSelection
}) => {
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const selectedMainWork = (
    (advancedFilter?.mainWork && advancedFilter.mainWork.trim() && advancedFilter.mainWork !== 'ALL')
      ? advancedFilter.mainWork.trim()
      : ((selectedWorkDetails || '').trim() ? Utils.parseWorkDetails(selectedWorkDetails || '').work.trim() : '')
  );
  const hasWorkFilter = Boolean(selectedMainWork);
  const isCustomerGroupWithoutWorkFilter = mode === GroupByMode.BY_USER_DETAILS && !hasWorkFilter;
  const isDateGroupWithoutWorkFilter = mode === GroupByMode.BY_DATE_WORK && !hasWorkFilter;
  const hideWorkAndQtyBadges = isCustomerGroupWithoutWorkFilter || isDateGroupWithoutWorkFilter;

  const isDue = groupedHisab.totalDue > 0;
  const borderColor = isDue ? 'border-[#EF5350]' : 'border-[#66BB6A]';

  const shouldHighlightParent = isHighlighted && groupedHisab.items.length === 1;

  const isCustomerFilterActive = Boolean(
    activeCustomerFilter &&
    (activeCustomerFilter.name || '').trim().toLowerCase() === (groupedHisab.name || '').trim().toLowerCase() &&
    (activeCustomerFilter.mobile || '').trim() === (groupedHisab.mobile || '').trim() &&
    (activeCustomerFilter.address || '').trim().toLowerCase() === (groupedHisab.address || '').trim().toLowerCase()
  );

  const isDateFilterActive = Boolean(
    activeDateFilter &&
    (activeDateFilter.date || '').trim() === (groupedHisab.date || '').trim() &&
    (activeDateFilter.hisabType === undefined || (activeDateFilter.hisabType || '').trim().toLowerCase() === (groupedHisab.hisabType || '').trim().toLowerCase()) &&
    (activeDateFilter.workDetails === undefined || (activeDateFilter.workDetails || '').trim().toLowerCase() === (groupedHisab.workDetails || '').trim().toLowerCase())
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
  const isGroupSelected = groupedHisab.items.length > 0 && groupedHisab.items.every(item => selectedItemIds?.has(item.id));
  const isAnyItemSelected = groupedHisab.items.some(item => selectedItemIds?.has(item.id));
  
  const cardGradient = isAnyItemSelected
    ? 'bg-gradient-to-b from-amber-50 via-amber-50/80 to-amber-100/50 border-amber-400 shadow-md ring-3 ring-amber-500/40'
    : isDue
    ? 'bg-gradient-to-b from-[#FFFFFF] via-[#FFFDFD] to-[#FFF5F5] border-rose-400/90 shadow-[0_3px_12px_-2px_rgba(244,63,94,0.12)]'
    : 'bg-gradient-to-b from-[#FFFFFF] via-[#F8FCF9] to-[#EFFBF4] border-emerald-400/90 shadow-[0_3px_12px_-2px_rgba(16,185,129,0.12)]';

  return (
    <>
      <div
        className={`w-full rounded-2xl border-2 ${cardGradient} overflow-hidden transition-all duration-300 ${
          shouldHighlightParent ? 'animate-blur-float ring-4 ring-blue-400 bg-blue-50/70' : ''
        } ${
          isCustomerFilterActive ? 'ring-3 ring-emerald-600 shadow-lg' : ''
        } ${
          isDateFilterActive ? 'ring-3 ring-blue-600 shadow-lg' : ''
        }`}
      >
        <div
          onClick={onExpandToggle}
          className="p-2.5 sm:p-3 cursor-pointer select-none"
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
              ) : mode === GroupByMode.BY_DATE_WORK && groupedHisab.date.trim() ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateClick?.({
                      date: groupedHisab.date,
                    });
                  }}
                  className={`inline-flex items-center space-x-1.5 px-2 py-0.5 -ml-1 rounded-lg text-base font-bold text-left transition-all duration-150 group cursor-pointer ${
                    isDateFilterActive
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-[#0D1B2A] hover:text-blue-800 hover:bg-blue-100/70 active:scale-98'
                  }`}
                  title="এই তারিখ, কাজ ও ডিটেইলস অনুযায়ী ফিল্টার করতে ক্লিক করুন"
                >
                  <span className="leading-snug break-words whitespace-normal">📅 {groupedHisab.date}</span>
                  <Filter
                    size={13}
                    className={`shrink-0 transition-opacity ${
                      isDateFilterActive
                        ? 'text-white opacity-100'
                        : 'text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-700'
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
              {/* Select All Checkbox for Group */}
              <div className="flex items-center px-1 mr-1">
                <input
                  type="checkbox"
                  checked={isGroupSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (onToggleItemSelection) {
                      const allSelected = groupedHisab.items.every(item => selectedItemIds?.has(item.id));
                      groupedHisab.items.forEach(item => {
                        const isSelected = selectedItemIds?.has(item.id);
                        if (allSelected && isSelected) {
                          onToggleItemSelection(item.id);
                        } else if (!allSelected && !isSelected) {
                          onToggleItemSelection(item.id);
                        }
                      });
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                  title="এই গ্রুপের সব আইটেম সিলেক্ট করুন"
                />
              </div>
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
              <div className="text-slate-500 p-1">
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between mt-1 pt-1 border-t border-slate-100 text-xs gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              {!hideWorkAndQtyBadges && groupedHisab.workDetails ? (
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

            <div className="flex flex-col items-end space-y-1 shrink-0">
              <div className="text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md text-[11px] font-bold shadow-2xs">
                বিল: <span className="text-slate-900">৳{Utils.toCleanString(groupedHisab.totalBill)}</span>
              </div>
              {!hideWorkAndQtyBadges && (
                <div className="bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-bold text-right shadow-2xs whitespace-normal break-words">
                  {qtyText}
                </div>
              )}
            </div>
          </div>

          <div className="mt-0.5 mb-0.5 border-t border-[#CFD8DC]"></div>

          {/* Financial Details Row */}
          <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-500 px-0.5 py-1">
            <span>Spend: <span className="text-rose-600">৳{Utils.toCleanString(groupedHisab.totalSpend)}</span></span>
            <span>Profit: <span className="text-blue-600">৳{Utils.toCleanString(groupedHisab.totalProfit)}</span></span>
            <span>Out: <span className="text-slate-600">৳{Utils.toCleanString(groupedHisab.totalCashout)}</span></span>
            <span>Cash: <span className="text-[#15803D]">৳{Utils.toCleanString(groupedHisab.totalProfit - groupedHisab.totalCashout)}</span></span>
          </div>

          <div className="border-t border-slate-100 mb-1"></div>

          <div className="flex items-start justify-between text-xs font-semibold py-0">
            <div className="flex flex-col">
              <span className="text-[#15803D]">
                পরিশোধিত: <span className="font-bold">৳{Utils.toCleanString(groupedHisab.totalPaid)}</span>
              </span>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className={isDue ? 'text-[#DC2626]' : 'text-[#15803D]'}>
                বকেয়া: <span className="font-bold">৳{Utils.toCleanString(groupedHisab.totalDue)}</span>
              </span>
            </div>
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
                onDateClick={onDateClick}
                isSelected={selectedItemIds?.has(item.id)}
                onToggleSelection={onToggleItemSelection}
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

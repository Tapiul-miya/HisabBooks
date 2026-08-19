import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, UserCheck, X, Filter } from 'lucide-react';
import { GroupedHisab, GroupByMode, VehicleHisab, getGroupKey, DatabaseTotals, CustomerFilter } from '../types';
import { HeaderSummary } from '../components/HeaderSummary';
import { DashboardSearchBar } from '../components/DashboardSearchBar';
import { ViewModeFilterRow } from '../components/ViewModeFilterRow';
import { GroupSummaryCard } from '../components/GroupSummaryCard';
import { EmptyStateView } from '../components/EmptyStateView';
import { Utils } from '../util/utils';

const INITIAL_BATCH_SIZE = 25;
const BATCH_INCREMENT = 25;

interface HisabListScreenProps {
  groupedList: GroupedHisab[];
  totals?: DatabaseTotals;
  selectedGroupByMode: GroupByMode;
  selectedWorkDetails: string;
  workDetailsOptions: string[];
  expandedGroups: Set<string>;
  highlightedGroupKey?: string | null;
  highlightedItemId?: number | null;
  customerFilter?: CustomerFilter | null;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onGroupByModeSelected: (mode: GroupByMode) => void;
  onWorkDetailsFilterChange: (workDetails: string) => void;
  onCustomerClick?: (filter: CustomerFilter) => void;
  onClearCustomerFilter?: () => void;
  onToggleGroup: (key: string) => void;
  onAddNewClick: () => void;
  onEditClick: (item: VehicleHisab) => void;
  onCopyClick: (grouped: GroupedHisab) => void;
  onDeleteHisab: (id: number) => void;
  onExportPdf: () => void;
  onShowBackup: () => void;
  onShowAbout: () => void;
  onReloadData?: () => void;
}

export const HisabListScreen: React.FC<HisabListScreenProps> = ({
  groupedList,
  totals,
  selectedGroupByMode,
  selectedWorkDetails,
  workDetailsOptions = [],
  expandedGroups,
  highlightedGroupKey,
  highlightedItemId,
  customerFilter,
  searchQuery,
  onSearchQueryChange,
  onGroupByModeSelected,
  onWorkDetailsFilterChange,
  onCustomerClick,
  onClearCustomerFilter,
  onToggleGroup,
  onAddNewClick,
  onEditClick,
  onCopyClick,
  onDeleteHisab,
  onExportPdf,
  onShowBackup,
  onShowAbout,
  onReloadData
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  const isSearchOpen = showSearch || searchQuery.length > 0;

  // Reset pagination when filter or search changes
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [searchQuery, selectedGroupByMode, customerFilter]);

  // If a group is highlighted or expanded, ensure it is within visible items
  useEffect(() => {
    if (highlightedGroupKey) {
      const idx = groupedList.findIndex(
        g => getGroupKey(g, selectedGroupByMode) === highlightedGroupKey
      );
      if (idx >= 0 && idx >= visibleCount) {
        setVisibleCount(idx + 10);
      }
    }
  }, [highlightedGroupKey, groupedList, selectedGroupByMode, visibleCount]);

  const handleToggleSearch = () => {
    setShowSearch((prev) => !prev);
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    if (searchQuery) {
      onSearchQueryChange('');
    }
  };

  // Overall sums directly from Database Query or fallback
  const totalBill = totals?.totalBill ?? groupedList.reduce((acc, g) => acc + g.totalBill, 0);
  const totalPaid = totals?.totalPaid ?? groupedList.reduce((acc, g) => acc + g.totalPaid, 0);
  const totalDue = totals?.totalDue ?? groupedList.reduce((acc, g) => acc + g.totalDue, 0);
  const totalQty = totals?.totalQty ?? groupedList.reduce((acc, g) => acc + (g.totalQty || 0), 0);

  // Progressive infinite scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 300) {
      setVisibleCount(prev => {
        if (prev < groupedList.length) {
          return Math.min(prev + BATCH_INCREMENT, groupedList.length);
        }
        return prev;
      });
    }
  }, [groupedList.length]);

  const visibleItems = useMemo(() => {
    return groupedList.slice(0, visibleCount);
  }, [groupedList, visibleCount]);

  return (
    <div className="h-screen h-[100dvh] bg-[#E1E8EF] flex flex-col max-w-xl sm:max-w-2xl mx-auto shadow-xl relative overflow-hidden">
      {/* Top Header & Filters Fixed */}
      <div className="shrink-0 z-30 shadow-xs">
        <HeaderSummary
          totalBill={totalBill}
          totalPaid={totalPaid}
          totalDue={totalDue}
          totalQty={totalQty}
          onExportPdf={onExportPdf}
          onShowBackup={onShowBackup}
          onShowAbout={onShowAbout}
          onToggleSearch={handleToggleSearch}
        />

        <div className="bg-[#E1E8EF] pb-2 pt-1 border-b border-slate-200/60">
          {isSearchOpen && (
            <DashboardSearchBar
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
              onClose={handleCloseSearch}
            />
          )}

          <ViewModeFilterRow
            selectedMode={selectedGroupByMode}
            selectedWorkDetails={selectedWorkDetails}
            workDetailsOptions={workDetailsOptions}
            onModeSelected={onGroupByModeSelected}
            onWorkDetailsFilterChange={onWorkDetailsFilterChange}
          />

          {/* Active Customer Filter Indicator */}
          {customerFilter && (
            <div className="mx-2 sm:mx-3 mt-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between shadow-2xs">
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="p-1 bg-emerald-700 text-white rounded-md shrink-0">
                  <UserCheck size={12} />
                </span>
                <div className="text-[11px] sm:text-xs text-emerald-950 truncate leading-tight">
                  <span className="font-bold text-emerald-900">{customerFilter.name || 'বেনামী'}</span>
                  {customerFilter.mobile && <span className="text-emerald-800 ml-1">({customerFilter.mobile})</span>}
                  {customerFilter.hisabType && (
                    <span className="bg-emerald-200/70 text-emerald-900 px-1 py-0.2 rounded text-[10px] ml-1 font-semibold">
                      {Utils.getHisabTypeLabel(customerFilter.hisabType)}
                    </span>
                  )}
                  {customerFilter.address && (
                    <span className="text-emerald-700 text-[10px] ml-1 hidden sm:inline truncate">
                      • {customerFilter.address}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClearCustomerFilter}
                className="ml-2 px-1.5 py-0.5 text-emerald-800 hover:text-red-700 hover:bg-red-50 rounded transition-colors shrink-0 flex items-center space-x-0.5 text-[11px] font-bold cursor-pointer"
                title="ফিল্টার বাতিল করুন"
              >
                <X size={13} />
                <span>রিসেট</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Data Cards with High Performance Progressive Rendering */}
      <main
        ref={mainScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2.5 sm:px-4 pt-2 space-y-3 pb-24 min-h-0"
      >
        {groupedList.length === 0 ? (
          <EmptyStateView />
        ) : (
          <>
            {visibleItems.map((groupedItem) => {
              const groupKey = getGroupKey(groupedItem, selectedGroupByMode);
              return (
                <GroupSummaryCard
                  key={groupKey}
                  groupedHisab={groupedItem}
                  mode={selectedGroupByMode}
                  expanded={expandedGroups.has(groupKey)}
                  isHighlighted={groupKey === highlightedGroupKey}
                  highlightedItemId={highlightedItemId}
                  activeCustomerFilter={customerFilter}
                  onExpandToggle={() => onToggleGroup(groupKey)}
                  onDeleteHisab={onDeleteHisab}
                  onEditClick={onEditClick}
                  onCopyClick={onCopyClick}
                  onCustomerClick={onCustomerClick}
                  onReloadData={onReloadData}
                />
              );
            })}

            {visibleCount < groupedList.length && (
              <div className="text-center py-3">
                <button
                  onClick={() => setVisibleCount(prev => Math.min(prev + BATCH_INCREMENT, groupedList.length))}
                  className="px-4 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/70 active:scale-95 rounded-full transition-all"
                >
                  আরো {groupedList.length - visibleCount} টি গ্রুপ লোড করুন
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={onAddNewClick}
        className="absolute bottom-6 right-6 bg-[#1B5E20] text-white px-5 py-3.5 rounded-full shadow-2xl hover:bg-emerald-900 active:scale-95 transition-all flex items-center space-x-2 font-bold text-sm z-30 border border-emerald-400/30"
      >
        <Plus size={20} />
        <span>নতুন হিসাব</span>
      </button>
    </div>
  );
};

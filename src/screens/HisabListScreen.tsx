import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, UserCheck, X, Filter, Calendar, Tag, DollarSign, SlidersHorizontal, User as UserIcon, ArrowUpDown, ArrowLeft, Trash2 } from 'lucide-react';
import { GroupedHisab, GroupByMode, VehicleHisab, getGroupKey, DatabaseTotals, CustomerFilter, AdvancedFilterState, initialAdvancedFilterState, DateWorkFilter } from '../types';
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
  advancedFilter?: AdvancedFilterState;
  expandedGroups: Set<string>;
  highlightedGroupKey?: string | null;
  highlightedItemId?: number | null;
  customerFilter?: CustomerFilter | null;
  dateFilter?: DateWorkFilter | null;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onGroupByModeSelected: (mode: GroupByMode) => void;
  onWorkDetailsFilterChange: (workDetails: string) => void;
  onAdvancedFilterChange?: (filter: AdvancedFilterState) => void;
  onClearAllFilters?: () => void;
  onCustomerClick?: (filter: CustomerFilter) => void;
  onClearCustomerFilter?: () => void;
  onDateClick?: (filter: DateWorkFilter) => void;
  onClearDateFilter?: () => void;
  onToggleGroup: (key: string) => void;
  onAddNewClick: () => void;
  onEditClick: (item: VehicleHisab) => void;
  onCopyClick: (grouped: GroupedHisab) => void;
  onDeleteHisab: (id: number) => void;
  onExportPdf: () => void;
  onShowBackup: () => void;
  onShowAbout: () => void;
  onShowAreaMeasurement?: () => void;
  onReloadData?: () => void;
}

export const HisabListScreen: React.FC<HisabListScreenProps> = ({
  groupedList,
  totals,
  selectedGroupByMode,
  selectedWorkDetails,
  workDetailsOptions = [],
  advancedFilter = initialAdvancedFilterState,
  expandedGroups,
  highlightedGroupKey,
  highlightedItemId,
  customerFilter,
  dateFilter,
  searchQuery,
  onSearchQueryChange,
  onGroupByModeSelected,
  onWorkDetailsFilterChange,
  onAdvancedFilterChange,
  onClearAllFilters,
  onCustomerClick,
  onClearCustomerFilter,
  onDateClick,
  onClearDateFilter,
  onToggleGroup,
  onAddNewClick,
  onEditClick,
  onCopyClick,
  onDeleteHisab,
  onExportPdf,
  onShowBackup,
  onShowAbout,
  onShowAreaMeasurement,
  onReloadData
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const mainScrollRef = useRef<HTMLElement | null>(null);

  const handleToggleItemSelection = useCallback((id: number) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isSearchOpen = showSearch || searchQuery.length > 0;

  // Reset pagination when filter or search changes
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [searchQuery, selectedGroupByMode, customerFilter, dateFilter]);

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
  const dbTotalBill = totals?.totalBill ?? groupedList.reduce((acc, g) => acc + g.totalBill, 0);
  const dbTotalPaid = totals?.totalPaid ?? groupedList.reduce((acc, g) => acc + g.totalPaid, 0);
  const dbTotalDue = totals?.totalDue ?? groupedList.reduce((acc, g) => acc + g.totalDue, 0);
  const dbTotalQty = totals?.totalQty ?? groupedList.reduce((acc, g) => acc + (g.totalQty || 0), 0);
  const dbTotalSpend = totals?.totalSpend ?? groupedList.reduce((acc, g) => acc + (g.totalSpend || 0), 0);
  const dbTotalProfit = totals?.totalProfit ?? groupedList.reduce((acc, g) => acc + (g.totalProfit || 0), 0);
  const dbTotalCashout = totals?.totalCashout ?? groupedList.reduce((acc, g) => acc + (g.totalCashout || 0), 0);
  const dbTotalCredit = totals?.totalCredit ?? groupedList.reduce((acc, g) => acc + (g.totalCredit || 0), 0);
  const dbTotalDateCount = totals?.dateCount ?? (() => {
    const dates = new Set<string>();
    groupedList.forEach(g => {
      if ((g.totalQty || 0) > 0 && g.date) dates.add(g.date);
      if (g.items) g.items.forEach(it => { if ((it.qty || 0) > 0 && it.date) dates.add(it.date); });
    });
    return dates.size;
  })();

  // Calculate selected totals
  const selectedTotals = useMemo(() => {
    if (selectedItemIds.size === 0) return null;
    let bill = 0;
    let paid = 0;
    let due = 0;
    let qty = 0;
    let spend = 0;
    let profit = 0;
    let cashout = 0;
    let credit = 0;
    const dates = new Set<string>();

    groupedList.forEach(group => {
      group.items.forEach(item => {
        if (selectedItemIds.has(item.id)) {
          bill += item.bill || 0;
          paid += item.paid || 0;
          due += item.due || 0;
          qty += item.qty || 0;
          spend += item.spend || 0;
          profit += item.profit || 0;
          cashout += item.cashout || 0;
          credit += item.credit || 0;
          if (item.date) dates.add(item.date);
        }
      });
    });

    return { bill, paid, due, qty, spend, profit, cashout, credit, dateCount: dates.size };
  }, [groupedList, selectedItemIds]);

  const isSelectionActive = selectedItemIds.size > 0;
  const totalBill = isSelectionActive ? selectedTotals!.bill : dbTotalBill;
  const totalPaid = isSelectionActive ? selectedTotals!.paid : dbTotalPaid;
  const totalDue = isSelectionActive ? selectedTotals!.due : dbTotalDue;
  const totalQty = isSelectionActive ? selectedTotals!.qty : dbTotalQty;
  const totalSpend = isSelectionActive ? selectedTotals!.spend : dbTotalSpend;
  const totalProfit = isSelectionActive ? selectedTotals!.profit : dbTotalProfit;
  const totalCashout = isSelectionActive ? selectedTotals!.cashout : dbTotalCashout;
  const totalCredit = isSelectionActive ? selectedTotals!.credit : dbTotalCredit;
  const totalDateCount = isSelectionActive ? selectedTotals!.dateCount : dbTotalDateCount;

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
          totalSpend={totalSpend}
          totalProfit={totalProfit}
          totalCashout={totalCashout}
          totalCredit={totalCredit}
          minDate={isSelectionActive ? undefined : totals?.minDate}
          maxDate={isSelectionActive ? undefined : totals?.maxDate}
          dateCount={totalDateCount}
          ymd={isSelectionActive ? undefined : totals?.ymd}
          onExportPdf={onExportPdf}
          onShowBackup={onShowBackup}
          onShowAbout={onShowAbout}
          onShowAreaMeasurement={onShowAreaMeasurement}
          onToggleSearch={handleToggleSearch}
          isSelectionActive={isSelectionActive}
          selectedCount={selectedItemIds.size}
          onClearSelection={() => setSelectedItemIds(new Set())}
          showTopRow={!customerFilter && !dateFilter}
        />

        {!customerFilter && !dateFilter && (
          <div className="bg-[#E1E8EF] pb-1 pt-0 border-b border-slate-200/60">
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
              advancedFilter={advancedFilter}
              onModeSelected={onGroupByModeSelected}
              onWorkDetailsFilterChange={onWorkDetailsFilterChange}
              onAdvancedFilterChange={onAdvancedFilterChange}
              onClearAllFilters={onClearAllFilters}
              isFilterModalOpen={isFilterModalOpen}
              onFilterModalOpenChange={setIsFilterModalOpen}
            />
          </div>
        )}

        <div className="bg-[#E1E8EF]">
          {!customerFilter && !dateFilter && (
            <>
              {/* Active Filter Chips / Indicators */}
          {(advancedFilter.startDate ||
            advancedFilter.endDate ||
            (advancedFilter.datePreset && advancedFilter.datePreset !== 'all') ||
            (advancedFilter.paymentStatus && advancedFilter.paymentStatus !== 'all') ||
            (advancedFilter.hisabType && advancedFilter.hisabType !== 'ALL') ||
            advancedFilter.customerName ||
            advancedFilter.mobile ||
            advancedFilter.address ||
            (advancedFilter.sortBy && advancedFilter.sortBy !== 'date') ||
            (advancedFilter.sortOrder && advancedFilter.sortOrder !== 'desc')) && (
            <div className="mx-2 sm:mx-3 mt-1.5 px-2.5 py-1.5 bg-blue-50/90 border border-blue-200 rounded-lg flex items-center justify-between shadow-2xs gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="p-1 bg-blue-700 text-white rounded-md shrink-0 flex items-center justify-center">
                  <SlidersHorizontal size={11} />
                </span>

                {/* Sort Chip */}
                {((advancedFilter.sortBy && advancedFilter.sortBy !== 'date') || (advancedFilter.sortOrder && advancedFilter.sortOrder !== 'desc')) && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-semibold border border-amber-300">
                    <ArrowUpDown size={10} />
                    <span>
                      সর্ট:{' '}
                      {advancedFilter.sortBy === 'id'
                        ? 'আইডি'
                        : advancedFilter.sortBy === 'date'
                        ? 'তারিখ'
                        : advancedFilter.sortBy === 'qty'
                        ? 'পরিমাণ'
                        : advancedFilter.sortBy === 'bill'
                        ? 'বিল'
                        : advancedFilter.sortBy === 'paid'
                        ? 'জমা'
                        : advancedFilter.sortBy === 'due'
                        ? 'বাকি'
                        : advancedFilter.sortBy}{' '}
                      ({advancedFilter.sortOrder === 'desc' ? 'DESC ⬇️' : 'ASC ⬆️'})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onAdvancedFilterChange?.({
                          ...advancedFilter,
                          sortBy: 'date',
                          sortOrder: 'desc'
                        })
                      }
                      className="hover:text-red-700 ml-0.5"
                      title="ডিফল্ট সর্ট"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}

                {/* Date Filter Chip */}
                {(advancedFilter.startDate || advancedFilter.endDate || (advancedFilter.datePreset && advancedFilter.datePreset !== 'all')) && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100/90 text-blue-900 text-[10px] font-semibold border border-blue-200">
                    <Calendar size={10} />
                    <span>
                      {advancedFilter.datePreset && advancedFilter.datePreset !== 'all' && advancedFilter.datePreset !== 'custom'
                        ? advancedFilter.datePreset === 'today'
                          ? 'আজ'
                          : advancedFilter.datePreset === 'yesterday'
                          ? 'গতকাল'
                          : advancedFilter.datePreset === 'this_week'
                          ? 'গত ৭ দিন'
                          : advancedFilter.datePreset === 'this_month'
                          ? 'এই মাস'
                          : advancedFilter.datePreset === 'last_month'
                          ? 'গত মাস'
                          : advancedFilter.datePreset === 'this_year'
                          ? 'এই বছর'
                          : advancedFilter.datePreset
                        : `${advancedFilter.startDate || ''} ~ ${advancedFilter.endDate || ''}`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onAdvancedFilterChange?.({
                          ...advancedFilter,
                          datePreset: 'all',
                          startDate: '',
                          endDate: ''
                        })
                      }
                      className="hover:text-red-700 ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}

                {/* Payment Status Chip */}
                {advancedFilter.paymentStatus && advancedFilter.paymentStatus !== 'all' && (
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                      advancedFilter.paymentStatus === 'due_only'
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : advancedFilter.paymentStatus === 'paid_only'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    <span>
                      {advancedFilter.paymentStatus === 'due_only'
                        ? '🔴 শুধু বাকি'
                        : advancedFilter.paymentStatus === 'paid_only'
                        ? '🟢 সম্পূর্ণ পরিশোধিত'
                        : '🟡 জমা হিসাব'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onAdvancedFilterChange?.({
                          ...advancedFilter,
                          paymentStatus: 'all'
                        })
                      }
                      className="hover:text-red-700 ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}

                {/* Hisab Type Chip */}
                {advancedFilter.hisabType && advancedFilter.hisabType !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[10px] font-semibold border border-indigo-200">
                    <Tag size={10} />
                    <span>{Utils.getHisabTypeLabel(advancedFilter.hisabType)}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onAdvancedFilterChange?.({
                          ...advancedFilter,
                          hisabType: 'ALL'
                        })
                      }
                      className="hover:text-red-700 ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}

                {/* Customer / Mobile / Address Search Chip */}
                {(advancedFilter.customerName || advancedFilter.mobile || advancedFilter.address) && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 text-[10px] font-semibold border border-sky-200">
                    <UserIcon size={10} />
                    <span>
                      {[advancedFilter.customerName, advancedFilter.mobile, advancedFilter.address].filter(Boolean).join(' | ')}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onAdvancedFilterChange?.({
                          ...advancedFilter,
                          customerName: '',
                          mobile: '',
                          address: ''
                        })
                      }
                      className="hover:text-red-700 ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onClearAllFilters}
                className="ml-auto px-1.5 py-0.5 text-blue-900 hover:text-red-700 hover:bg-red-50 rounded transition-colors shrink-0 flex items-center space-x-0.5 text-[11px] font-bold cursor-pointer"
                title="সমস্ত ফিল্টার মুছুন"
              >
                <X size={12} />
                <span>রিসেট</span>
              </button>
            </div>
              )}
            </>
          )}

          {/* Active Customer Filter Indicator */}
          {customerFilter && (
            <div className="mx-2 sm:mx-3 mt-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between shadow-2xs gap-2">
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="p-1 bg-emerald-700 text-white rounded-md shrink-0">
                  <UserCheck size={12} />
                </span>
                <div className="text-[11px] sm:text-xs text-emerald-950 break-words whitespace-normal leading-tight">
                  <span className="font-bold text-emerald-900">{customerFilter.name || 'বেনামী'}</span>
                  {customerFilter.mobile && <span className="text-emerald-800 ml-1">({customerFilter.mobile})</span>}
                  {customerFilter.hisabType && (
                    <span className="bg-emerald-200/70 text-emerald-900 px-1 py-0.2 rounded text-[10px] ml-1 font-semibold">
                      {Utils.getHisabTypeLabel(customerFilter.hisabType)}
                    </span>
                  )}
                  {customerFilter.address && (
                    <span className="text-emerald-700 text-[10px] ml-1 break-words">
                      • {customerFilter.address}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClearCustomerFilter}
                className="ml-auto px-1.5 py-0.5 text-emerald-800 hover:text-red-700 hover:bg-red-50 rounded transition-colors shrink-0 flex items-center space-x-0.5 text-[11px] font-bold cursor-pointer"
                title="ফিল্টার বাতিল করুন"
              >
                <X size={13} />
                <span>রিসেট</span>
              </button>
            </div>
          )}

          {/* Active Date Filter Indicator */}
          {dateFilter && (
            <div className="mx-2 sm:mx-3 mt-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between shadow-2xs gap-2">
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="p-1 bg-amber-700 text-white rounded-md shrink-0">
                  <Calendar size={12} />
                </span>
                <div className="text-[11px] sm:text-xs text-amber-950 font-bold">
                  {dateFilter.date}
                </div>
              </div>
              <button
                type="button"
                onClick={onClearDateFilter}
                className="ml-auto px-1.5 py-0.5 text-amber-800 hover:text-red-700 hover:bg-red-50 rounded transition-colors shrink-0 flex items-center space-x-0.5 text-[11px] font-bold cursor-pointer"
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
                  activeDateFilter={dateFilter}
                  selectedWorkDetails={selectedWorkDetails}
                  advancedFilter={advancedFilter}
                  onExpandToggle={() => onToggleGroup(groupKey)}
                  onDeleteHisab={onDeleteHisab}
                  onEditClick={onEditClick}
                  onCopyClick={onCopyClick}
                  onCustomerClick={onCustomerClick}
                  onDateClick={onDateClick}
                  onReloadData={onReloadData}
                  selectedItemIds={selectedItemIds}
                  onToggleItemSelection={handleToggleItemSelection}
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

      {/* Floating Action Button - hidden when filter modal is open */}
      {!isFilterModalOpen && (
        <button
          onClick={onAddNewClick}
          className="absolute bottom-6 right-6 bg-[#1B5E20] text-white px-4 py-2.5 rounded-full shadow-2xl hover:bg-emerald-900 active:scale-95 transition-all flex items-center space-x-1.5 font-bold text-[13px] z-30 border border-emerald-400/30"
        >
          <Plus size={18} />
          <span>নতুন হিসাব</span>
        </button>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { GroupedHisab, GroupByMode, VehicleHisab, getGroupKey, DatabaseTotals } from '../types';
import { HeaderSummary } from '../components/HeaderSummary';
import { DashboardSearchBar } from '../components/DashboardSearchBar';
import { ViewModeFilterRow } from '../components/ViewModeFilterRow';
import { GroupSummaryCard } from '../components/GroupSummaryCard';
import { EmptyStateView } from '../components/EmptyStateView';

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
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onGroupByModeSelected: (mode: GroupByMode) => void;
  onWorkDetailsFilterChange: (workDetails: string) => void;
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
  searchQuery,
  onSearchQueryChange,
  onGroupByModeSelected,
  onWorkDetailsFilterChange,
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
  }, [searchQuery, selectedGroupByMode]);

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
                  onExpandToggle={() => onToggleGroup(groupKey)}
                  onDeleteHisab={onDeleteHisab}
                  onEditClick={onEditClick}
                  onCopyClick={onCopyClick}
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

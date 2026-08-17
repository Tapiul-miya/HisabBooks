import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { GroupedHisab, GroupByMode, VehicleHisab, getGroupKey } from '../types';
import { HeaderSummary } from '../components/HeaderSummary';
import { DashboardSearchBar } from '../components/DashboardSearchBar';
import { ViewModeFilterRow } from '../components/ViewModeFilterRow';
import { GroupSummaryCard } from '../components/GroupSummaryCard';
import { EmptyStateView } from '../components/EmptyStateView';

interface HisabListScreenProps {
  groupedList: GroupedHisab[];
  selectedGroupByMode: GroupByMode;
  expandedGroups: Set<string>;
  highlightedGroupKey?: string | null;
  highlightedItemId?: number | null;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onGroupByModeSelected: (mode: GroupByMode) => void;
  onToggleGroup: (key: string) => void;
  onAddNewClick: () => void;
  onEditClick: (item: VehicleHisab) => void;
  onCopyClick: (grouped: GroupedHisab) => void;
  onDeleteHisab: (id: number) => void;
  onExportPdf: () => void;
  onShowBackup: () => void;
  onShowAbout: () => void;
}

export const HisabListScreen: React.FC<HisabListScreenProps> = ({
  groupedList,
  selectedGroupByMode,
  expandedGroups,
  highlightedGroupKey,
  highlightedItemId,
  searchQuery,
  onSearchQueryChange,
  onGroupByModeSelected,
  onToggleGroup,
  onAddNewClick,
  onEditClick,
  onCopyClick,
  onDeleteHisab,
  onExportPdf,
  onShowBackup,
  onShowAbout
}) => {
  const [showSearch, setShowSearch] = useState(false);

  const isSearchOpen = showSearch || searchQuery.length > 0;

  const handleToggleSearch = () => {
    setShowSearch((prev) => !prev);
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    if (searchQuery) {
      onSearchQueryChange('');
    }
  };

  // Overall sums
  const totalBill = groupedList.reduce((acc, g) => acc + g.totalBill, 0);
  const totalPaid = groupedList.reduce((acc, g) => acc + g.totalPaid, 0);
  const totalDue = groupedList.reduce((acc, g) => acc + g.totalDue, 0);

  return (
    <div className="h-screen h-[100dvh] bg-[#E1E8EF] flex flex-col max-w-lg mx-auto shadow-xl relative overflow-hidden">
      {/* Top Header & Filters Fixed */}
      <div className="shrink-0 z-30 shadow-xs">
        <HeaderSummary
          totalBill={totalBill}
          totalPaid={totalPaid}
          totalDue={totalDue}
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
            onModeSelected={onGroupByModeSelected}
          />
        </div>
      </div>

      {/* Scrollable Data Cards */}
      <main className="flex-1 overflow-y-auto px-3.5 pt-2 space-y-3.5 pb-24 min-h-0">
        {groupedList.length === 0 ? (
          <EmptyStateView />
        ) : (
          groupedList.map((groupedItem) => {
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
              />
            );
          })
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

import React, { useState, useEffect, useCallback } from 'react';
import { GroupByMode, VehicleHisab, GroupedHisab, getGroupKey, DatabaseTotals } from './types';
import { HisabStorage } from './data/storage';
import { HisabListScreen } from './screens/HisabListScreen';
import { AddHisabScreen } from './screens/AddHisabScreen';
import { PdfReportModal } from './components/PdfReportModal';
import { AboutAppModal } from './components/AboutAppModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { SplashScreen } from './components/SplashScreen';

type ActiveScreen = 'list' | 'add';

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('list');

  const [selectedGroupByMode, setSelectedGroupByMode] = useState<GroupByMode>(
    GroupByMode.BY_USER_DETAILS
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [groupedList, setGroupedList] = useState<GroupedHisab[]>([]);
  const [dbTotals, setDbTotals] = useState<DatabaseTotals>({
    totalBill: 0,
    totalPaid: 0,
    totalDue: 0,
    totalQty: 0,
    totalCount: 0
  });

  // Navigation state for Add/Edit/Copy
  const [editItem, setEditItem] = useState<VehicleHisab | null>(null);
  const [copyParams, setCopyParams] = useState<{
    name: string;
    date: string;
    hisabType: string;
    address: string;
    mobile: string;
    workDetails: string;
  } | null>(null);

  // Modals
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const [highlightedGroupKey, setHighlightedGroupKey] = useState<string | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const { groups, totals } = await HisabStorage.getQueryResult(
        searchQuery,
        null,
        selectedGroupByMode
      );
      setGroupedList(groups);
      setDbTotals(totals);
    } catch (err) {
      console.error('Error fetching data from IndexedDB:', err);
    }
  }, [searchQuery, selectedGroupByMode]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleToggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set<string>();
      if (!prev.has(key)) {
        next.add(key);
      }
      return next;
    });
  };

  const handleModeSelected = (mode: GroupByMode) => {
    setSelectedGroupByMode(mode);
    setExpandedGroups(new Set());
  };

  const handleAddNewClick = () => {
    setEditItem(null);
    setCopyParams(null);
    setCurrentScreen('add');
  };

  const handleEditClick = (item: VehicleHisab) => {
    setEditItem(item);
    setCopyParams(null);
    setCurrentScreen('add');
  };

  const handleCopyClick = (grouped: GroupedHisab) => {
    setEditItem(null);
    setCopyParams({
      name: grouped.name,
      date: grouped.date,
      hisabType: grouped.hisabType,
      address: grouped.address,
      mobile: grouped.mobile,
      workDetails: grouped.workDetails
    });
    setCurrentScreen('add');
  };

  const handleDeleteHisab = async (id: number) => {
    await HisabStorage.delete(id);
    await refreshData();
  };

  const handleSaveHisab = async (entry: Omit<VehicleHisab, 'id'> | VehicleHisab) => {
    let savedId: number | undefined;
    if ('id' in entry && typeof entry.id === 'number' && entry.id > 0) {
      await HisabStorage.update(entry as VehicleHisab);
      savedId = entry.id;
    } else {
      savedId = await HisabStorage.insert(entry as Omit<VehicleHisab, 'id'>);
    }
    const list = await HisabStorage.getAllWithSearchGroupSum(
      searchQuery,
      null,
      selectedGroupByMode
    );
    setGroupedList(list);

    const targetGroup = list.find(g =>
      (savedId && g.items.some(i => i.id === savedId)) ||
      (g.name === entry.name && g.hisabType === entry.hisabType && g.workDetails === entry.workDetails && (selectedGroupByMode !== GroupByMode.BY_DATE_WORK || g.date === entry.date))
    );

    if (targetGroup) {
      const key = getGroupKey(targetGroup, selectedGroupByMode);
      setExpandedGroups(new Set([key]));
      if (targetGroup.items.length > 1 && savedId) {
        setHighlightedItemId(savedId);
        setHighlightedGroupKey(null);
      } else {
        setHighlightedGroupKey(key);
        setHighlightedItemId(null);
      }
      setTimeout(() => {
        setHighlightedGroupKey(null);
        setHighlightedItemId(null);
      }, 2500);
    }

    setCurrentScreen('list');
  };

  return (
    <div className="min-h-screen bg-[#E1E8EF] relative">
      <div className={currentScreen === 'add' ? 'hidden' : 'block'}>
        <HisabListScreen
          groupedList={groupedList}
          totals={dbTotals}
          selectedGroupByMode={selectedGroupByMode}
          expandedGroups={expandedGroups}
          highlightedGroupKey={highlightedGroupKey}
          highlightedItemId={highlightedItemId}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onGroupByModeSelected={handleModeSelected}
          onToggleGroup={handleToggleGroup}
          onAddNewClick={handleAddNewClick}
          onEditClick={handleEditClick}
          onCopyClick={handleCopyClick}
          onDeleteHisab={handleDeleteHisab}
          onExportPdf={() => setShowPdfModal(true)}
          onShowBackup={() => setShowBackupModal(true)}
          onShowAbout={() => setShowAboutModal(true)}
        />
      </div>

      {currentScreen === 'add' && (
        <div className="fixed inset-0 z-50 bg-[#E1E8EF] overflow-y-auto">
          <AddHisabScreen
            itemToEdit={editItem}
            initialName={copyParams?.name || ''}
            initialDate={copyParams?.date || ''}
            initialHisabType={copyParams?.hisabType || ''}
            initialAddress={copyParams?.address || ''}
            initialMobile={copyParams?.mobile || ''}
            initialWorkDetails={copyParams?.workDetails || ''}
            onSave={handleSaveHisab}
            onBack={() => setCurrentScreen('list')}
          />
        </div>
      )}

      {showPdfModal && (
        <PdfReportModal
          groupedList={groupedList}
          onClose={() => setShowPdfModal(false)}
        />
      )}

      {showBackupModal && (
        <BackupRestoreModal
          onClose={() => setShowBackupModal(false)}
          onDataRestored={refreshData}
        />
      )}

      {showAboutModal && (
        <AboutAppModal onClose={() => setShowAboutModal(false)} />
      )}

      {showSplash && (
        <SplashScreen onFinished={() => setShowSplash(false)} />
      )}
    </div>
  );
};

export default App;

import React, { useState, useEffect, useCallback } from 'react';
import { GroupByMode, VehicleHisab, GroupedHisab, getGroupKey, DatabaseTotals, CustomerFilter } from './types';
import { HisabStorage } from './data/storage';
import { HisabListScreen } from './screens/HisabListScreen';
import { AddHisabScreen } from './screens/AddHisabScreen';
import { AreaMeasurementScreen } from './screens/AreaMeasurementScreen';
import { PdfReportModal } from './components/PdfReportModal';
import { AboutAppModal } from './components/AboutAppModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { SplashScreen } from './components/SplashScreen';
import { triggerAutoCloudBackup } from './services/googleDriveStorage';

type ActiveScreen = 'list' | 'add' | 'area';

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('list');

  const [selectedGroupByMode, setSelectedGroupByMode] = useState<GroupByMode>(
    GroupByMode.BY_USER_DETAILS
  );
  const [selectedWorkDetails, setSelectedWorkDetails] = useState<string>('');
  const [workDetailsOptions, setWorkDetailsOptions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState<CustomerFilter | null>(null);
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
      const options = await HisabStorage.getDistinctWorkDetails();
      setWorkDetailsOptions(options);

      const { groups, totals } = await HisabStorage.getQueryResult(
        searchQuery,
        null,
        selectedGroupByMode,
        selectedWorkDetails,
        customerFilter
      );
      setGroupedList(groups);
      setDbTotals(totals);
    } catch (err) {
      console.error('Error fetching data from IndexedDB:', err);
    }
  }, [searchQuery, selectedGroupByMode, selectedWorkDetails, customerFilter]);

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

  const handleCustomerClick = (filter: CustomerFilter) => {
    setCustomerFilter((prev) => {
      if (
        prev &&
        (prev.name || '').trim().toLowerCase() === (filter.name || '').trim().toLowerCase() &&
        (prev.mobile || '').trim() === (filter.mobile || '').trim() &&
        (prev.address || '').trim().toLowerCase() === (filter.address || '').trim().toLowerCase() &&
        (prev.hisabType || '').trim().toLowerCase() === (filter.hisabType || '').trim().toLowerCase()
      ) {
        return null; // Toggle off if clicked again
      }
      return filter;
    });
  };

  const handleClearCustomerFilter = () => {
    setCustomerFilter(null);
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
    
    // Refresh distinct work details options and query results including totals in real-time
    const [options, { groups: list, totals }] = await Promise.all([
      HisabStorage.getDistinctWorkDetails(),
      HisabStorage.getQueryResult(
        searchQuery,
        null,
        selectedGroupByMode,
        selectedWorkDetails,
        customerFilter
      )
    ]);
    
    setWorkDetailsOptions(options);
    setGroupedList(list);
    setDbTotals(totals);

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
    // Trigger background auto backup to Google Drive if active
    triggerAutoCloudBackup().catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#E1E8EF] relative">
      <div className={currentScreen === 'list' ? 'block' : 'hidden'}>
        <HisabListScreen
          groupedList={groupedList}
          totals={dbTotals}
          selectedGroupByMode={selectedGroupByMode}
          selectedWorkDetails={selectedWorkDetails}
          workDetailsOptions={workDetailsOptions}
          expandedGroups={expandedGroups}
          highlightedGroupKey={highlightedGroupKey}
          highlightedItemId={highlightedItemId}
          customerFilter={customerFilter}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onGroupByModeSelected={handleModeSelected}
          onWorkDetailsFilterChange={setSelectedWorkDetails}
          onCustomerClick={handleCustomerClick}
          onClearCustomerFilter={handleClearCustomerFilter}
          onToggleGroup={handleToggleGroup}
          onAddNewClick={handleAddNewClick}
          onEditClick={handleEditClick}
          onCopyClick={handleCopyClick}
          onDeleteHisab={handleDeleteHisab}
          onExportPdf={() => setShowPdfModal(true)}
          onShowBackup={() => setShowBackupModal(true)}
          onShowAbout={() => setShowAboutModal(true)}
          onShowAreaMeasurement={() => setCurrentScreen('area')}
          onReloadData={refreshData}
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
            groupByMode={selectedGroupByMode}
            onSave={handleSaveHisab}
            onBack={() => setCurrentScreen('list')}
          />
        </div>
      )}

      {currentScreen === 'area' && (
        <div className="fixed inset-0 z-50 bg-[#E1E8EF] overflow-y-auto">
          <AreaMeasurementScreen
            onBack={() => setCurrentScreen('list')}
            onAddToHisab={(data) => {
              setEditItem(null);
              setCopyParams({
                name: data.name || '',
                date: new Date().toISOString().split('T')[0],
                hisabType: 'bigha',
                address: data.address || '',
                mobile: '',
                workDetails: data.workDetails || ''
              });
              setCurrentScreen('add');
            }}
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

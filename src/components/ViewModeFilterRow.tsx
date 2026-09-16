import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Calendar, Briefcase, Truck, Layers, UserCheck, Box, X, SlidersHorizontal } from 'lucide-react';
import { GroupByMode, AdvancedFilterState, initialAdvancedFilterState } from '../types';
import { Utils } from '../util/utils';
import { AllFiltersModal } from './AllFiltersModal';

interface ViewModeFilterRowProps {
  selectedMode: GroupByMode;
  selectedWorkDetails: string;
  workDetailsOptions: string[];
  advancedFilter?: AdvancedFilterState;
  onModeSelected: (mode: GroupByMode) => void;
  onWorkDetailsFilterChange: (workDetails: string) => void;
  onAdvancedFilterChange?: (filter: AdvancedFilterState) => void;
  onClearAllFilters?: () => void;
  isFilterModalOpen?: boolean;
  onFilterModalOpenChange?: (open: boolean) => void;
}

export const ViewModeFilterRow: React.FC<ViewModeFilterRowProps> = ({
  selectedMode,
  selectedWorkDetails,
  workDetailsOptions = [],
  advancedFilter = initialAdvancedFilterState,
  onModeSelected,
  onWorkDetailsFilterChange,
  onAdvancedFilterChange,
  onClearAllFilters,
  isFilterModalOpen: externalIsFilterModalOpen,
  onFilterModalOpenChange
}) => {
  const [internalIsFilterModalOpen, setInternalIsFilterModalOpen] = useState(false);
  const isFilterModalOpen = externalIsFilterModalOpen !== undefined ? externalIsFilterModalOpen : internalIsFilterModalOpen;

  const setFilterModalOpen = (open: boolean) => {
    setInternalIsFilterModalOpen(open);
    if (onFilterModalOpenChange) {
      onFilterModalOpenChange(open);
    }
  };

  // Main Work options (1st part of workDetails: "কিসের কাজ")
  const mainWorkOptions = useMemo(() => {
    const set = new Set<string>();
    (workDetailsOptions || []).forEach((work) => {
      if (work && work.trim()) {
        const parsed = Utils.parseWorkDetails(work);
        if (parsed.work) set.add(parsed.work);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'bn'));
  }, [workDetailsOptions]);

  // Local states for 7 filter dropdowns
  const [mainWork, setMainWork] = useState('');
  const [year, setYear] = useState('');
  const [session, setSession] = useState('');
  const [manager, setManager] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');
  const [trolleyBed, setTrolleyBed] = useState('');

  // Sync state if advancedFilter or selectedWorkDetails is updated externally
  useEffect(() => {
    if (advancedFilter) {
      setMainWork(advancedFilter.mainWork === 'ALL' ? '' : (advancedFilter.mainWork || ''));
      setYear(advancedFilter.year || '');
      setSession(advancedFilter.session || '');
      setManager(advancedFilter.manager || '');
      setVehicle(advancedFilter.vehicle || '');
      setDriver(advancedFilter.driver || '');
      setTrolleyBed(advancedFilter.trolleyBed || '');
    } else if (!selectedWorkDetails) {
      setMainWork('');
      setYear('');
      setSession('');
      setManager('');
      setVehicle('');
      setDriver('');
      setTrolleyBed('');
    }
  }, [advancedFilter, selectedWorkDetails]);

  // Active filter count for badge indicator
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilter.startDate || advancedFilter.endDate || (advancedFilter.datePreset && advancedFilter.datePreset !== 'all')) count++;
    if (mainWork || (advancedFilter.mainWork && advancedFilter.mainWork !== 'ALL')) count++;
    if (year || advancedFilter.year) count++;
    if (session || advancedFilter.session) count++;
    if (manager || advancedFilter.manager) count++;
    if (vehicle || advancedFilter.vehicle) count++;
    if (driver || advancedFilter.driver) count++;
    if (trolleyBed || advancedFilter.trolleyBed) count++;
    if (advancedFilter.customerName) count++;
    if (advancedFilter.mobile) count++;
    if (advancedFilter.address) count++;
    if (advancedFilter.hisabType && advancedFilter.hisabType !== 'ALL') count++;
    if (advancedFilter.paymentStatus && advancedFilter.paymentStatus !== 'all') count++;
    if ((advancedFilter.sortBy && advancedFilter.sortBy !== 'date') || (advancedFilter.sortOrder && advancedFilter.sortOrder !== 'asc')) count++;
    return count;
  }, [advancedFilter, mainWork, year, session, manager, vehicle, driver, trolleyBed]);

  const subFilterOptions = useMemo(() => {
    if (!mainWork) {
      return {
        years: [],
        sessions: [],
        managers: [],
        vehicles: [],
        drivers: [],
        beds: []
      };
    }

    const yearsSet = new Set<string>();
    const sessionsSet = new Set<string>();
    const managersSet = new Set<string>();
    const vehiclesSet = new Set<string>();
    const driversSet = new Set<string>();
    const bedsSet = new Set<string>();

    (workDetailsOptions || []).forEach((work) => {
      if (!work || !work.trim()) return;
      const parsed = Utils.parseWorkDetails(work);
      if (!mainWork || mainWork === 'ALL' || parsed.work === mainWork) {
        if (parsed.year) yearsSet.add(parsed.year);
        if (parsed.session) sessionsSet.add(parsed.session);
        if (parsed.manager) managersSet.add(parsed.manager);
        if (parsed.vehicle) vehiclesSet.add(parsed.vehicle);
        if (parsed.driver) driversSet.add(parsed.driver);
        if (parsed.trolleyBed) bedsSet.add(parsed.trolleyBed);
      }
    });

    return {
      years: Array.from(yearsSet).sort((a, b) => a.localeCompare(b, 'bn')),
      sessions: Array.from(sessionsSet).sort((a, b) => a.localeCompare(b, 'bn')),
      managers: Array.from(managersSet).sort((a, b) => a.localeCompare(b, 'bn')),
      vehicles: Array.from(vehiclesSet).sort((a, b) => a.localeCompare(b, 'bn')),
      drivers: Array.from(driversSet).sort((a, b) => a.localeCompare(b, 'bn')),
      beds: Array.from(bedsSet).sort((a, b) => a.localeCompare(b, 'bn'))
    };
  }, [workDetailsOptions, mainWork]);

  // Emit updated filter string to parent
  const emitFilterChange = (
    newMainWork: string,
    newYear: string,
    newSession: string,
    newManager: string,
    newVehicle: string,
    newDriver: string,
    newBed: string
  ) => {
    const cleanMainWork = newMainWork === 'ALL' ? '' : (newMainWork || '').trim();
    const cleanYear = (newYear || '').trim();
    const cleanSession = (newSession || '').trim();
    const cleanManager = (newManager || '').trim();
    const cleanVehicle = (newVehicle || '').trim();
    const cleanDriver = (newDriver || '').trim();
    const cleanBed = (newBed || '').trim();

    const formatted = Utils.formatWorkDetails(
      cleanMainWork,
      cleanYear,
      cleanSession,
      cleanManager,
      cleanVehicle,
      cleanDriver,
      cleanBed
    );

    onWorkDetailsFilterChange(formatted);

    if (onAdvancedFilterChange) {
      onAdvancedFilterChange({
        ...advancedFilter,
        mainWork: newMainWork,
        year: cleanYear,
        session: cleanSession,
        manager: cleanManager,
        vehicle: cleanVehicle,
        driver: cleanDriver,
        trolleyBed: cleanBed
      });
    }
  };

  const handleMainWorkChange = (value: string) => {
    setMainWork(value);
    setYear('');
    setSession('');
    setManager('');
    setVehicle('');
    setDriver('');
    setTrolleyBed('');
    emitFilterChange(value, '', '', '', '', '', '');
  };

  const handleYearChange = (value: string) => {
    setYear(value);
    emitFilterChange(mainWork, value, session, manager, vehicle, driver, trolleyBed);
  };

  const handleSessionChange = (value: string) => {
    setSession(value);
    emitFilterChange(mainWork, year, value, manager, vehicle, driver, trolleyBed);
  };

  const handleManagerChange = (value: string) => {
    setManager(value);
    emitFilterChange(mainWork, year, session, value, vehicle, driver, trolleyBed);
  };

  const handleVehicleChange = (value: string) => {
    setVehicle(value);
    emitFilterChange(mainWork, year, session, manager, value, driver, trolleyBed);
  };

  const handleDriverChange = (value: string) => {
    setDriver(value);
    emitFilterChange(mainWork, year, session, manager, vehicle, value, trolleyBed);
  };

  const handleBedChange = (value: string) => {
    setTrolleyBed(value);
    emitFilterChange(mainWork, year, session, manager, vehicle, driver, value);
  };

  const handleClearAllFilters = () => {
    setMainWork('');
    setYear('');
    setSession('');
    setManager('');
    setVehicle('');
    setDriver('');
    setTrolleyBed('');
    onWorkDetailsFilterChange('');
    if (onClearAllFilters) {
      onClearAllFilters();
    } else if (onAdvancedFilterChange) {
      onAdvancedFilterChange(initialAdvancedFilterState);
    }
  };

  const handleApplyAdvancedFilter = (newFilter: AdvancedFilterState) => {
    const cleanMainWork = newFilter.mainWork === 'ALL' ? '' : (newFilter.mainWork || '').trim();
    const cleanYear = (newFilter.year || '').trim();
    const cleanSession = (newFilter.session || '').trim();
    const cleanManager = (newFilter.manager || '').trim();
    const cleanVehicle = (newFilter.vehicle || '').trim();
    const cleanDriver = (newFilter.driver || '').trim();
    const cleanBed = (newFilter.trolleyBed || '').trim();

    setMainWork(cleanMainWork);
    setYear(cleanYear);
    setSession(cleanSession);
    setManager(cleanManager);
    setVehicle(cleanVehicle);
    setDriver(cleanDriver);
    setTrolleyBed(cleanBed);

    const formatted = Utils.formatWorkDetails(
      cleanMainWork,
      cleanYear,
      cleanSession,
      cleanManager,
      cleanVehicle,
      cleanDriver,
      cleanBed
    );

    onWorkDetailsFilterChange(formatted);
    if (onAdvancedFilterChange) {
      onAdvancedFilterChange(newFilter);
    }
  };

  return (
    <div className="px-3.5 py-1 space-y-1.5 relative">
      {/* Primary Top Filter Row (Horizontally Scrollable) */}
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap py-0.5 touch-pan-x">
        {/* 1. Main Filter Dropdown: (কিসের কাজ) */}
        <div className="relative flex items-center shrink-0 min-w-[130px] max-w-[200px]">
          <Briefcase size={13} className="absolute left-2.5 text-[#1565C0] pointer-events-none z-10" />
          <select
            value={mainWork}
            onChange={(e) => handleMainWorkChange(e.target.value)}
            className={`text-xs rounded-full pl-7 pr-3 py-1 font-medium transition-all outline-none border cursor-pointer w-full truncate ${
              mainWork
                ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <option value="">কিসের কাজ</option>
            <option value="ALL">সকল</option>
            {mainWorkOptions.map((w) => (
              <option key={w} value={w} className="bg-white text-slate-800 font-normal">
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Group By Combined Toggle Button: (👤 গ্রাহক | 📅 তারিখ ও কাজ) */}
        <div className="relative shrink-0 flex items-center bg-slate-200/80 p-0.5 rounded-full border border-slate-300/80 shadow-2xs">
          <button
            type="button"
            onClick={() => onModeSelected(GroupByMode.BY_USER_DETAILS)}
            className={`h-6 px-2 rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              selectedMode === GroupByMode.BY_USER_DETAILS
                ? 'bg-[#1B5E20] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            aria-label="গ্রাহক অনুযায়ী গ্রুপ করুন"
          >
            <span className="text-xs leading-none select-none">👤</span>
            <span className="text-[11px] leading-none">গ্রাহক</span>
          </button>

          <button
            type="button"
            onClick={() => onModeSelected(GroupByMode.BY_DATE_WORK)}
            className={`h-6 px-2 rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              selectedMode === GroupByMode.BY_DATE_WORK
                ? 'bg-[#1B5E20] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            aria-label="তারিখ ও কাজ অনুযায়ী গ্রুপ করুন"
          >
            <span className="text-xs leading-none select-none">📅</span>
            <span className="text-[11px] leading-none">তারিখ</span>
          </button>
        </div>

        {/* 4. All-in-One Filter Button (🎛️ ফিল্টার বাটন) - beside 👤 and 📅 */}
        <div className="relative shrink-0 group">
          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className={`h-7 px-2.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all border cursor-pointer ${
              activeFilterCount > 0
                ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-blue-700'
            }`}
            aria-label="সমস্ত ফিল্টার"
          >
            <SlidersHorizontal size={13} className={activeFilterCount > 0 ? 'text-amber-300' : 'text-slate-600'} />
            <span className="text-xs">ফিল্টার</span>
            {activeFilterCount > 0 && (
              <span className="bg-amber-400 text-slate-900 text-[10px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center -mr-0.5">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Clear/Reset Button if any filter active */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 flex items-center space-x-1 shrink-0 transition-colors cursor-pointer"
          >
            <X size={12} />
            <span>রিসেট</span>
          </button>
        )}
      </div>

      {/* 6 Secondary Dropdowns - ONLY SHOWN when "কিসের কাজ" (mainWork) is selected */}
      {mainWork && (
        <div className="pt-0.5 pb-0.5 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap bg-blue-50/70 p-1.5 rounded-xl border border-blue-200/80">
          {/* 1. কত সাল */}
          <div className="relative flex items-center shrink-0 min-w-[100px] max-w-[140px]">
            <Calendar size={12} className="absolute left-2 text-blue-700 pointer-events-none z-10" />
            <select
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              className={`text-[11px] rounded-lg pl-6 pr-2 py-1 font-medium transition-all outline-none border cursor-pointer w-full truncate ${
                year
                  ? 'bg-blue-600 text-white border-blue-700 font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <option value="">কত সাল</option>
              {subFilterOptions.years.map((y) => (
                <option key={y} value={y} className="bg-white text-slate-800 font-normal">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* 2. কোন সেশন */}
          <div className="relative flex items-center shrink-0 min-w-[105px] max-w-[140px]">
            <Layers size={12} className="absolute left-2 text-blue-700 pointer-events-none z-10" />
            <select
              value={session}
              onChange={(e) => handleSessionChange(e.target.value)}
              className={`text-[11px] rounded-lg pl-6 pr-2 py-1 font-medium transition-all outline-none border cursor-pointer w-full truncate ${
                session
                  ? 'bg-blue-600 text-white border-blue-700 font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <option value="">কোন সেশন</option>
              {subFilterOptions.sessions.map((s) => (
                <option key={s} value={s} className="bg-white text-slate-800 font-normal">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 3. ম্যানেজারের নাম */}
          <div className="relative flex items-center shrink-0 min-w-[115px] max-w-[150px]">
            <User size={12} className="absolute left-2 text-blue-700 pointer-events-none z-10" />
            <select
              value={manager}
              onChange={(e) => handleManagerChange(e.target.value)}
              className={`text-[11px] rounded-lg pl-6 pr-2 py-1 font-medium transition-all outline-none border cursor-pointer w-full truncate ${
                manager
                  ? 'bg-blue-600 text-white border-blue-700 font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <option value="">ম্যানেজারের নাম</option>
              {subFilterOptions.managers.map((m) => (
                <option key={m} value={m} className="bg-white text-slate-800 font-normal">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* 4. গাড়ির নাম */}
          <div className="relative flex items-center shrink-0 min-w-[105px] max-w-[140px]">
            <Truck size={12} className="absolute left-2 text-blue-700 pointer-events-none z-10" />
            <select
              value={vehicle}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className={`text-[11px] rounded-lg pl-6 pr-2 py-1 font-medium transition-all outline-none border cursor-pointer w-full truncate ${
                vehicle
                  ? 'bg-blue-600 text-white border-blue-700 font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <option value="">গাড়ির নাম</option>
              {subFilterOptions.vehicles.map((v) => (
                <option key={v} value={v} className="bg-white text-slate-800 font-normal">
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* 5. ড্রাইভার নাম */}
          <div className="relative flex items-center shrink-0 min-w-[110px] max-w-[145px]">
            <UserCheck size={12} className="absolute left-2 text-blue-700 pointer-events-none z-10" />
            <select
              value={driver}
              onChange={(e) => handleDriverChange(e.target.value)}
              className={`text-[11px] rounded-lg pl-6 pr-2 py-1 font-medium transition-all outline-none border cursor-pointer w-full truncate ${
                driver
                  ? 'bg-blue-600 text-white border-blue-700 font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <option value="">ড্রাইভার নাম</option>
              {subFilterOptions.drivers.map((d) => (
                <option key={d} value={d} className="bg-white text-slate-800 font-normal">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* 6. বেড */}
          <div className="relative flex items-center shrink-0 min-w-[95px] max-w-[130px]">
            <Box size={12} className="absolute left-2 text-blue-700 pointer-events-none z-10" />
            <select
              value={trolleyBed}
              onChange={(e) => handleBedChange(e.target.value)}
              className={`text-[11px] rounded-lg pl-6 pr-2 py-1 font-medium transition-all outline-none border cursor-pointer w-full truncate ${
                trolleyBed
                  ? 'bg-blue-600 text-white border-blue-700 font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <option value="">বেড</option>
              {subFilterOptions.beds.map((b) => (
                <option key={b} value={b} className="bg-white text-slate-800 font-normal">
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* All-in-One Comprehensive Filter Modal */}
      <AllFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        selectedMode={selectedMode}
        onModeChange={onModeSelected}
        currentFilter={advancedFilter}
        onApplyFilter={handleApplyAdvancedFilter}
      />
    </div>
  );
};

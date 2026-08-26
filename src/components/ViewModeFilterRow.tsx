import React, { useState, useEffect, useMemo } from 'react';
import { User, Calendar, Briefcase, Truck, Layers, UserCheck, Box, X } from 'lucide-react';
import { GroupByMode } from '../types';
import { Utils } from '../util/utils';

interface ViewModeFilterRowProps {
  selectedMode: GroupByMode;
  selectedWorkDetails: string;
  workDetailsOptions: string[];
  onModeSelected: (mode: GroupByMode) => void;
  onWorkDetailsFilterChange: (workDetails: string) => void;
}

export const ViewModeFilterRow: React.FC<ViewModeFilterRowProps> = ({
  selectedMode,
  selectedWorkDetails,
  workDetailsOptions = [],
  onModeSelected,
  onWorkDetailsFilterChange
}) => {
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

  // Sync state if selectedWorkDetails is cleared externally
  useEffect(() => {
    if (!selectedWorkDetails) {
      setMainWork('');
      setYear('');
      setSession('');
      setManager('');
      setVehicle('');
      setDriver('');
      setTrolleyBed('');
    } else {
      const parsed = Utils.parseWorkDetails(selectedWorkDetails);
      if (parsed.work && !mainWork) {
        setMainWork(parsed.work);
      }
    }
  }, [selectedWorkDetails]);

  // Sub-filter options derived from workDetails matching selected mainWork
  const [activeTooltip, setActiveTooltip] = useState<'customer' | 'date_work' | null>(null);

  const showTooltip = (type: 'customer' | 'date_work') => {
    setActiveTooltip(type);
    const timer = setTimeout(() => {
      setActiveTooltip((prev) => (prev === type ? null : prev));
    }, 2200);
    return () => clearTimeout(timer);
  };
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
      if (mainWork === 'ALL' || parsed.work === mainWork) {
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
    const parts = [
      newMainWork === 'ALL' ? '' : newMainWork,
      newYear,
      newSession,
      newManager,
      newVehicle,
      newDriver,
      newBed
    ]
      .map(s => s.trim())
      .filter(Boolean);
    onWorkDetailsFilterChange(parts.join(' | '));
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
  };

  return (
    <div className="px-3.5 py-1 space-y-1.5 relative">
      {/* Primary Top Filter Row */}
      <div className="flex items-center gap-2 overflow-x-visible whitespace-nowrap">
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

        {/* 2. Group By: Customer */}
        <div className="relative shrink-0 group">
          <button
            onClick={() => {
              onModeSelected(GroupByMode.BY_USER_DETAILS);
              showTooltip('customer');
            }}
            className={`h-7 w-8 rounded-full text-sm font-medium flex items-center justify-center transition-all border ${
              selectedMode === GroupByMode.BY_USER_DETAILS
                ? 'bg-[#1B5E20] text-white border-[#1B5E20] shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
            }`}
            title="গ্রাহক অনুযায়ী"
            aria-label="গ্রাহক অনুযায়ী"
          >
            <span className="text-sm leading-none select-none">👤</span>
          </button>
          
          {/* Tooltip on Click (Toast/Badge Style) */}
          {activeTooltip === 'customer' && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-xl flex items-center gap-1 border border-slate-700 pointer-events-none">
              <span>👤 গ্রাহক অনুযায়ী</span>
              <div className="w-2 h-2 bg-slate-900 rotate-45 -bottom-1 absolute left-1/2 -translate-x-1/2 border-r border-b border-slate-700" />
            </div>
          )}
          {/* Desktop Hover Fallback */}
          <div className="hidden group-hover:block group-focus-within:block pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-xl border border-slate-700">
            <span>👤 গ্রাহক অনুযায়ী</span>
            <div className="w-2 h-2 bg-slate-900 rotate-45 -bottom-1 absolute left-1/2 -translate-x-1/2 border-r border-b border-slate-700" />
          </div>
        </div>

        {/* 3. Group By: Date & Work */}
        <div className="relative shrink-0 group">
          <button
            onClick={() => {
              onModeSelected(GroupByMode.BY_DATE_WORK);
              showTooltip('date_work');
            }}
            className={`h-7 w-8 rounded-full text-sm font-medium flex items-center justify-center transition-all border ${
              selectedMode === GroupByMode.BY_DATE_WORK
                ? 'bg-[#1B5E20] text-white border-[#1B5E20] shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
            }`}
            title="তারিখ ও কাজ"
            aria-label="তারিখ ও কাজ"
          >
            <span className="text-sm leading-none select-none">📅</span>
          </button>

          {/* Tooltip on Click (Toast/Badge Style) */}
          {activeTooltip === 'date_work' && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-xl flex items-center gap-1 border border-slate-700 pointer-events-none">
              <span>📅 তারিখ ও কাজ</span>
              <div className="w-2 h-2 bg-slate-900 rotate-45 -bottom-1 absolute left-1/2 -translate-x-1/2 border-r border-b border-slate-700" />
            </div>
          )}
          {/* Desktop Hover Fallback */}
          <div className="hidden group-hover:block group-focus-within:block pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-xl border border-slate-700">
            <span>📅 তারিখ ও কাজ</span>
            <div className="w-2 h-2 bg-slate-900 rotate-45 -bottom-1 absolute left-1/2 -translate-x-1/2 border-r border-b border-slate-700" />
          </div>
        </div>

        {/* Clear Filter Button if any filter active */}
        {(mainWork || year || session || manager || vehicle || driver || trolleyBed) && (
          <button
            onClick={handleClearAllFilters}
            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 flex items-center space-x-1 shrink-0 transition-colors"
            title="ফিল্টার মুছে ফেলুন"
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
    </div>
  );
};



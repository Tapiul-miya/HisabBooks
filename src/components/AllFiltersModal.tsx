import React, { useState, useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  Calendar,
  RotateCcw,
  Check,
  ArrowUpDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide
} from 'lucide-react';
import { GroupByMode, AdvancedFilterState, initialAdvancedFilterState, SortByField, SortOrder } from '../types';
import { HisabStorage } from '../data/storage';

interface AllFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMode?: GroupByMode;
  onModeChange?: (mode: GroupByMode) => void;
  currentFilter: AdvancedFilterState;
  onApplyFilter: (filter: AdvancedFilterState) => void;
}

export const AllFiltersModal: React.FC<AllFiltersModalProps> = ({
  isOpen,
  onClose,
  currentFilter,
  onApplyFilter
}) => {
  const [filterState, setFilterState] = useState<AdvancedFilterState>(currentFilter || initialAdvancedFilterState);

  // Distinct options from DB
  const [options, setOptions] = useState<{
    names: string[];
    mobiles: string[];
    addresses: string[];
    hisabTypes: string[];
    mainWorks: string[];
    years: string[];
    sessions: string[];
    managers: string[];
    vehicles: string[];
    drivers: string[];
    beds: string[];
  }>({
    names: [],
    mobiles: [],
    addresses: [],
    hisabTypes: [],
    mainWorks: [],
    years: [],
    sessions: [],
    managers: [],
    vehicles: [],
    drivers: [],
    beds: []
  });

  useEffect(() => {
    if (isOpen) {
      setFilterState(currentFilter || initialAdvancedFilterState);
      HisabStorage.getDistinctFilterOptions().then((opts) => {
        setOptions(opts);
      });
    }
  }, [isOpen, currentFilter]);

  if (!isOpen) return null;

  // Active filters count
  const activeCount = [
    filterState.startDate || filterState.endDate || (filterState.datePreset && filterState.datePreset !== 'all'),
    filterState.mainWork && filterState.mainWork !== 'ALL',
    filterState.year,
    filterState.session,
    filterState.manager,
    filterState.vehicle,
    filterState.driver,
    filterState.trolleyBed,
    filterState.customerName,
    filterState.mobile,
    filterState.address,
    filterState.hisabType && filterState.hisabType !== 'ALL',
    filterState.paymentStatus && filterState.paymentStatus !== 'all',
    (filterState.sortBy && filterState.sortBy !== 'date') || (filterState.sortOrder && filterState.sortOrder !== 'asc')
  ].filter(Boolean).length;

  // Apply Quick Date Preset
  const handleDatePreset = (preset: string) => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let start = '';
    let end = '';

    if (preset === 'today') {
      start = formatDate(today);
      end = start;
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      start = formatDate(y);
      end = start;
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      start = formatDate(past);
      end = formatDate(today);
    } else if (preset === 'this_month') {
      start = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
      end = formatDate(today);
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      start = formatDate(firstDayLastMonth);
      end = formatDate(lastDayLastMonth);
    } else if (preset === 'this_year') {
      start = `${today.getFullYear()}-01-01`;
      end = `${today.getFullYear()}-12-31`;
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    setFilterState((prev) => ({
      ...prev,
      datePreset: preset,
      startDate: start,
      endDate: end
    }));
  };

  const handleReset = () => {
    setFilterState(initialAdvancedFilterState);
  };

  const handleApply = () => {
    onApplyFilter(filterState);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#1565C0] text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-white/15 rounded-lg">
              <SlidersHorizontal size={18} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold leading-none">ফিল্টারিং প্যানেল</h2>
                {activeCount > 0 && (
                  <span className="bg-amber-400 text-slate-900 text-xs font-extrabold px-2 py-0.5 rounded-full">
                    {activeCount} টি সক্রিয়
                  </span>
                )}
              </div>
              <p className="text-[11px] text-blue-100 mt-0.5">
                সর্টিং (Sort) এবং তারিখ অনুযায়ী ফিল্টার
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Scrollable filter controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-800 text-xs sm:text-sm">
          {/* Section 1: Sort Filter (সর্টিং / সাজানো - id, date, qty, bill, paid, due - desc / asc) */}
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                <ArrowUpDown size={14} className="text-amber-800" />
                <span>সর্ট ফিল্টার (Sort Filter):</span>
              </label>
              {(filterState.sortBy !== 'date' || filterState.sortOrder !== 'asc') && (
                <button
                  type="button"
                  onClick={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      sortBy: 'date',
                      sortOrder: 'asc'
                    }))
                  }
                  className="text-[11px] text-amber-800 hover:text-amber-950 underline font-semibold cursor-pointer"
                >
                  ডিফল্ট সর্ট
                </button>
              )}
            </div>

            {/* Sort Field Options */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-slate-700">
                কোন তথ্যের ভিত্তিতে সাজাবেন (Sort By):
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { id: 'id', label: 'ID (আইডি)' },
                  { id: 'date', label: 'Date (তারিখ)' },
                  { id: 'qty', label: 'Qty (পরিমাণ)' },
                  { id: 'bill', label: 'Bill (বিল)' },
                  { id: 'paid', label: 'Paid (জমা)' },
                  { id: 'due', label: 'Due (বাকি)' }
                ].map((s) => {
                  const isSelected = (filterState.sortBy || 'date') === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setFilterState((prev) => ({
                          ...prev,
                          sortBy: s.id as SortByField
                        }))
                      }
                      className={`py-1.5 px-1 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-100/70'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort Order: DESC vs ASC */}
            <div className="space-y-1.5 pt-0.5">
              <span className="block text-[11px] font-semibold text-slate-700">
                সাজানোর ক্রম (Sort Order):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      sortOrder: 'desc'
                    }))
                  }
                  className={`py-2 px-3 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer ${
                    filterState.sortOrder === 'desc'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <ArrowDownWideNarrow size={14} className={filterState.sortOrder === 'desc' ? 'text-amber-400' : 'text-slate-500'} />
                  <span>DESC (বড় থেকে ছোট / নতুন আগে)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      sortOrder: 'asc'
                    }))
                  }
                  className={`py-2 px-3 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer ${
                    filterState.sortOrder === 'asc'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <ArrowUpNarrowWide size={14} className={filterState.sortOrder === 'asc' ? 'text-amber-400' : 'text-slate-500'} />
                  <span>ASC (ছোট থেকে বড় / পুরানো আগে)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Date Range & Quick Presets */}
          <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                <Calendar size={14} className="text-blue-700" />
                <span>তারিখ অনুযায়ী ফিল্টার (Date Range):</span>
              </label>
              {(filterState.startDate || filterState.endDate || filterState.datePreset !== 'all') && (
                <button
                  type="button"
                  onClick={() => handleDatePreset('all')}
                  className="text-[11px] text-blue-700 hover:text-blue-900 underline font-medium cursor-pointer"
                >
                  ক্লিয়ার তারিখ
                </button>
              )}
            </div>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'সকল সময়' },
                { id: 'today', label: 'আজ' },
                { id: 'yesterday', label: 'গতকাল' },
                { id: '7days', label: 'গত ৭ দিন' },
                { id: 'this_month', label: 'এই মাস' },
                { id: 'last_month', label: 'গত মাস' },
                { id: 'this_year', label: 'এই বছর' }
              ].map((p) => {
                const isActive = filterState.datePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleDatePreset(p.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Pickers */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  শুরু তারিখ (From Date):
                </label>
                <input
                  type="date"
                  value={filterState.startDate}
                  onChange={(e) =>
                    setFilterState((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                      datePreset: 'custom'
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-600 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  শেষ তারিখ (To Date):
                </label>
                <input
                  type="date"
                  value={filterState.endDate}
                  onChange={(e) =>
                    setFilterState((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                      datePreset: 'custom'
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-600 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>রিসেট (মুছুন)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check size={16} />
              <span>ফিল্টার প্রয়োগ করুন</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { MoreVertical, FileText, Info, HardDrive, Search, ChevronDown, Check, Calculator } from 'lucide-react';
import { Utils } from '../util/utils';

import appLogo from '../assets/images/app_logo.svg';

export type QtyDisplayMode = 'default' | 'bigha' | 'ymd' | 'hour' | 'trip';

interface HeaderSummaryProps {
  totalBill: number;
  totalPaid: number;
  totalDue: number;
  totalQty?: number;
  onExportPdf: () => void;
  onShowBackup: () => void;
  onShowAbout: () => void;
  onToggleSearch: () => void;
}

export const HeaderSummary: React.FC<HeaderSummaryProps> = ({
  totalBill,
  totalPaid,
  totalDue,
  totalQty = 0,
  onExportPdf,
  onShowBackup,
  onShowAbout,
  onToggleSearch
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showQtyMenu, setShowQtyMenu] = useState(false);
  const [qtyMode, setQtyMode] = useState<QtyDisplayMode>(() => {
    return (localStorage.getItem('hisab_qty_mode') as QtyDisplayMode) || 'default';
  });

  // Calculate formatted Qty based on selected mode
  const formattedQtyDisplay = useMemo(() => {
    if (totalQty === 0) return '0';

    switch (qtyMode) {
      case 'bigha': {
        // 20 katha = 1 bigha
        const bigha = Math.floor(totalQty / 20);
        const katha = Math.round((totalQty % 20 + Number.EPSILON) * 100) / 100;
        if (bigha > 0 && katha > 0) {
          return `${bigha}বি ${Utils.toCleanString(katha)}কা`;
        } else if (bigha > 0) {
          return `${bigha} বিঘা`;
        } else {
          return `${Utils.toCleanString(katha)} কাঠা`;
        }
      }
      case 'ymd': {
        // totalQty is total days -> converts to 01Y-02M-15D
        return Utils.formatDaysToYMD(totalQty);
      }
      case 'hour': {
        // totalQty is minutes -> converts to 00H:00M
        return Utils.minuteToHour(totalQty);
      }
      case 'trip': {
        return `${Utils.toCleanString(totalQty)} ট্রিপ`;
      }
      default:
        return Utils.toCleanString(totalQty);
    }
  }, [totalQty, qtyMode]);

  const modeLabel = useMemo(() => {
    switch (qtyMode) {
      case 'bigha': return 'বিঘা';
      case 'ymd': return 'YMD';
      case 'hour': return 'সময়';
      case 'trip': return 'ট্রিপ';
      default: return '';
    }
  }, [qtyMode]);

  return (
    <header className="bg-[#1B5E20] text-white px-3 sm:px-4 pt-2.5 pb-2 shadow-md sticky top-0 z-45 flex flex-col gap-2 w-full max-w-full">
      {/* Top Row: App Logo, Title & Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 shrink-0">
          <img
            src={appLogo}
            alt="App Icon"
            referrerPolicy="no-referrer"
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover border border-emerald-300/40 shadow-xs shrink-0"
          />
          <h1 className="text-base sm:text-lg font-bold tracking-wide text-white drop-shadow-xs">
            Hisab Book
          </h1>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={onToggleSearch}
            className="p-1.5 rounded-full hover:bg-white/15 text-emerald-100 hover:text-white transition-colors"
            title="খুঁজুন / Search"
          >
            <Search size={18} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-full hover:bg-white/15 text-emerald-100 hover:text-white transition-colors"
              title="More Options"
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                ></div>
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 text-slate-800 text-sm overflow-hidden py-1">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleSearch();
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-slate-50 transition-colors"
                  >
                    <Search size={16} className="text-slate-500" />
                    <span>খুঁজুন / সার্চ</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onExportPdf();
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-slate-50 transition-colors"
                  >
                    <FileText size={16} className="text-slate-500" />
                    <span>রিপোর্ট এক্সপোর্ট (PDF)</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onShowBackup();
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-[#1B5E20]/5 text-[#1B5E20] font-medium transition-colors"
                  >
                    <HardDrive size={16} className="text-[#1B5E20]" />
                    <span>ডাটা ব্যাকআপ ও রিস্টোর</span>
                  </button>

                  <div className="my-1 border-t border-slate-100"></div>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onShowAbout();
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-slate-50 transition-colors"
                  >
                    <Info size={16} className="text-slate-500" />
                    <span>অ্যাপ সম্পর্কে</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar: Qty, Bill, Paid, Due */}
      <div className="grid grid-cols-4 items-center bg-emerald-950/50 px-2 py-1.5 rounded-xl border border-emerald-300/25 text-xs">
        {/* 1. Total Qty (Clickable with Dropdown for Bigha, YMD, Hour, Trip calculations) */}
        <div className="relative text-center px-1 flex flex-col justify-center min-w-0">
          <button
            type="button"
            id="qty-calculation-trigger-btn"
            onClick={() => setShowQtyMenu((prev) => !prev)}
            className="flex flex-col items-center justify-center w-full py-0.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition-all cursor-pointer group"
            title="ক্লিক করে হিসাব রূপান্তর করুন (Bigha, YMD, Hour, Trip)"
          >
            <div className="flex items-center space-x-0.5 text-[10px] text-emerald-200/90 font-medium leading-tight">
              <span>Qty{modeLabel ? ` (${modeLabel})` : ''}</span>
              <ChevronDown size={11} className="text-emerald-300 opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="font-bold text-[#A7F3D0] text-[11px] sm:text-[13px] leading-tight truncate max-w-full">
              {formattedQtyDisplay}
            </div>
          </button>

          {/* Qty Calculation Mode Selection Menu */}
          {showQtyMenu && (
            <>
              <div
                className="fixed inset-0 z-50"
                onClick={() => setShowQtyMenu(false)}
              ></div>
              <div className="absolute left-0 sm:left-auto top-full mt-2 w-52 sm:w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 z-55 text-slate-800 text-xs overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-slate-500 text-[10px] uppercase tracking-wider flex items-center justify-between">
                  <span>Qty হিসাব / রূপান্তর</span>
                  <Calculator size={13} className="text-[#1B5E20]" />
                </div>

                {/* Option 1: Bigha */}
                <button
                  type="button"
                  id="calc-bigha-option"
                  onClick={() => {
                    setQtyMode('bigha');
                    localStorage.setItem('hisab_qty_mode', 'bigha');
                    setShowQtyMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                    qtyMode === 'bigha' ? 'bg-emerald-50 font-bold text-[#1B5E20]' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🌾</span>
                    <div>
                      <div className="font-semibold text-xs">Calculate Bigha</div>
                      <div className="text-[10px] text-slate-500">বিঘা-কাঠা (২০ কাঠা = ১ বিঘা)</div>
                    </div>
                  </div>
                  {qtyMode === 'bigha' && <Check size={14} className="text-[#1B5E20] shrink-0" />}
                </button>

                {/* Option 2: YMD */}
                <button
                  type="button"
                  id="calc-ymd-option"
                  onClick={() => {
                    setQtyMode('ymd');
                    localStorage.setItem('hisab_qty_mode', 'ymd');
                    setShowQtyMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                    qtyMode === 'ymd' ? 'bg-emerald-50 font-bold text-[#1B5E20]' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">📅</span>
                    <div>
                      <div className="font-semibold text-xs">Calculate YMD</div>
                      <div className="text-[10px] text-slate-500">বছর-মাস-দিন (01Y-02M-15D)</div>
                    </div>
                  </div>
                  {qtyMode === 'ymd' && <Check size={14} className="text-[#1B5E20] shrink-0" />}
                </button>

                {/* Option 3: Hour */}
                <button
                  type="button"
                  id="calc-hour-option"
                  onClick={() => {
                    setQtyMode('hour');
                    localStorage.setItem('hisab_qty_mode', 'hour');
                    setShowQtyMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                    qtyMode === 'hour' ? 'bg-emerald-50 font-bold text-[#1B5E20]' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">⏱️</span>
                    <div>
                      <div className="font-semibold text-xs">Calculate Hour</div>
                      <div className="text-[10px] text-slate-500">ঘণ্টা-মিনিট (00H:00M)</div>
                    </div>
                  </div>
                  {qtyMode === 'hour' && <Check size={14} className="text-[#1B5E20] shrink-0" />}
                </button>

                {/* Option 4: Trip */}
                <button
                  type="button"
                  id="calc-trip-option"
                  onClick={() => {
                    setQtyMode('trip');
                    localStorage.setItem('hisab_qty_mode', 'trip');
                    setShowQtyMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                    qtyMode === 'trip' ? 'bg-emerald-50 font-bold text-[#1B5E20]' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🚛</span>
                    <div>
                      <div className="font-semibold text-xs">Calculate Trip</div>
                      <div className="text-[10px] text-slate-500">মোট ট্রিপ সংখ্যা</div>
                    </div>
                  </div>
                  {qtyMode === 'trip' && <Check size={14} className="text-[#1B5E20] shrink-0" />}
                </button>

                <div className="my-1 border-t border-slate-100"></div>

                {/* Default Raw Number */}
                <button
                  type="button"
                  id="calc-default-option"
                  onClick={() => {
                    setQtyMode('default');
                    localStorage.setItem('hisab_qty_mode', 'default');
                    setShowQtyMenu(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-50 text-slate-600 transition-colors ${
                    qtyMode === 'default' ? 'font-bold text-[#1B5E20] bg-slate-50' : ''
                  }`}
                >
                  <span className="text-xs">ডিফল্ট সাধারণ সংখ্যা</span>
                  {qtyMode === 'default' && <Check size={14} className="text-[#1B5E20] shrink-0" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* 2. Total Bill */}
        <div className="text-center px-1 flex flex-col justify-center min-w-0 border-l border-white/20">
          <div className="text-[10px] text-emerald-200/90 font-medium leading-tight">Bill</div>
          <div className="font-bold text-white text-[12px] sm:text-[13px] leading-tight truncate">
            ৳{Utils.toCleanString(totalBill)}
          </div>
        </div>

        {/* 3. Total Paid */}
        <div className="text-center px-1 flex flex-col justify-center min-w-0 border-l border-white/20">
          <div className="text-[10px] text-emerald-200/90 font-medium leading-tight">Paid</div>
          <div className="font-bold text-[#69F0AE] text-[12px] sm:text-[13px] leading-tight truncate">
            ৳{Utils.toCleanString(totalPaid)}
          </div>
        </div>

        {/* 4. Total Due */}
        <div className="text-center px-1 flex flex-col justify-center min-w-0 border-l border-white/20">
          <div className="text-[10px] text-emerald-200/90 font-medium leading-tight">Due</div>
          <div className="font-bold text-[#FF8A80] text-[12px] sm:text-[13px] leading-tight truncate">
            ৳{Utils.toCleanString(totalDue)}
          </div>
        </div>
      </div>
    </header>
  );
};


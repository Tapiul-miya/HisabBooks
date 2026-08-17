import React, { useState } from 'react';
import { MoreVertical, Filter, FileText, Info, HardDrive, Search } from 'lucide-react';
import { Utils } from '../util/utils';

import appLogo from '../assets/images/app_logo.svg';

interface HeaderSummaryProps {
  totalBill: number;
  totalPaid: number;
  totalDue: number;
  onExportPdf: () => void;
  onShowBackup: () => void;
  onShowAbout: () => void;
  onToggleSearch: () => void;
}

export const HeaderSummary: React.FC<HeaderSummaryProps> = ({
  totalBill,
  totalPaid,
  totalDue,
  onExportPdf,
  onShowBackup,
  onShowAbout,
  onToggleSearch
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="bg-[#1B5E20] text-white px-2.5 sm:px-4 py-2.5 shadow-md sticky top-0 z-45 flex items-center justify-between gap-1.5 w-full max-w-full">
      <div className="flex items-center space-x-1.5 shrink-0">
        <img
          src={appLogo}
          alt="App Icon"
          referrerPolicy="no-referrer"
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover border border-emerald-300/40 shadow-xs shrink-0"
        />
        <h1 className="text-sm sm:text-lg font-bold tracking-wide whitespace-nowrap">Hisab Book</h1>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2 shrink min-w-0">
        <div className="flex items-stretch space-x-1 sm:space-x-2 bg-emerald-950/40 px-1.5 sm:px-2 py-1 rounded-lg border border-emerald-300/20 text-xs max-w-full">
          <div className="text-center px-0.5 sm:px-1 flex flex-col justify-center min-w-0">
            <div className="text-[9px] sm:text-[10px] text-emerald-100/80 leading-tight">Bill</div>
            <div className="font-bold text-white text-[11px] sm:text-[12px] leading-tight break-all">
              ৳{Utils.toCleanString(totalBill)}
            </div>
          </div>
          <div className="w-[1px] self-stretch bg-white/20 shrink-0 my-0.5"></div>
          <div className="text-center px-0.5 sm:px-1 flex flex-col justify-center min-w-0">
            <div className="text-[9px] sm:text-[10px] text-emerald-100/80 leading-tight">Paid</div>
            <div className="font-bold text-[#69F0AE] text-[11px] sm:text-[12px] leading-tight break-all">
              ৳{Utils.toCleanString(totalPaid)}
            </div>
          </div>
          <div className="w-[1px] self-stretch bg-white/20 shrink-0 my-0.5"></div>
          <div className="text-center px-0.5 sm:px-1 flex flex-col justify-center min-w-0">
            <div className="text-[9px] sm:text-[10px] text-emerald-100/80 leading-tight">Due</div>
            <div className="font-bold text-[#FF8A80] text-[11px] sm:text-[12px] leading-tight break-all">
              ৳{Utils.toCleanString(totalDue)}
            </div>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
            title="More Options"
          >
            <MoreVertical size={18} className="sm:w-5 sm:h-5" />
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
    </header>
  );
};


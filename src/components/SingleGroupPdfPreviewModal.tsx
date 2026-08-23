import React, { useRef, useState } from 'react';
import { X, FileText, Download, Printer, User, Phone, MapPin, Calendar, Wrench, Loader2 } from 'lucide-react';
import { GroupedHisab, GroupByMode } from '../types';
import { exportDomToPdf, exportSingleGroupPdf } from '../util/pdfUtils';
import { Utils } from '../util/utils';

interface SingleGroupPdfPreviewModalProps {
  group: GroupedHisab;
  mode?: GroupByMode;
  onClose: () => void;
}

export const SingleGroupPdfPreviewModal: React.FC<SingleGroupPdfPreviewModalProps> = ({
  group,
  mode = GroupByMode.BY_USER_DETAILS,
  onClose
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const filename = exportSingleGroupPdf(group, mode);
      await exportDomToPdf(reportRef.current, filename);
    } catch {
      alert('পিডিএফ ডাউনলোড করতে সমস্যা হয়েছে');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isDateWorkMode = mode === GroupByMode.BY_DATE_WORK;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 my-4 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#1B5E20] text-white px-4 py-3.5 flex items-center justify-between shrink-0" style={{ backgroundColor: '#1B5E20' }}>
          <div className="flex items-center space-x-2">
            <FileText size={20} className="text-emerald-300" />
            <h2 className="font-bold text-base text-white">পিডিএফ রিপোর্ট প্রাকদর্শন (Preview)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Document Preview Container */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 bg-slate-100/80 flex-1">
          {/* Virtual PDF Document Paper */}
          <div
            ref={reportRef}
            data-pdf-content="true"
            className="bg-[#ffffff] p-6 sm:p-8 rounded-2xl shadow-md border-2 border-emerald-800/20 text-slate-800 space-y-5 font-sans print:shadow-none print:border-none w-full"
            style={{ backgroundColor: '#ffffff', color: '#1e293b' }}
          >
            {/* Header / Brand */}
            <div className="border-b-2 border-emerald-700/20 pb-4 flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-[#1B5E20] text-white p-1.5 rounded-lg">
                    <FileText size={18} />
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#1B5E20]" style={{ color: '#1B5E20' }}>
                    হিসাব খাতা রিপোর্ট (Hisab Statement)
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  মোড: {isDateWorkMode ? 'তারিখ ও কাজ অনুযায়ী' : 'ব্যক্তি বা বিষয় অনুযায়ী'} | তারিখ: {new Date().toLocaleDateString('bn-BD')}
                </p>
              </div>
              <div className="text-right">
                <span className="bg-[#1B5E20] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs inline-block" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>
                  হিসাব বিবরণী
                </span>
              </div>
            </div>

            {/* Customer / Group Details Box */}
            <div className="bg-[#f0fdf4] p-4 rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs shadow-xs" style={{ backgroundColor: '#f0fdf4' }}>
              {isDateWorkMode ? (
                <>
                  <div className="flex items-center space-x-2 font-bold text-slate-900 col-span-1 sm:col-span-2">
                    <Calendar size={15} className="text-[#1B5E20]" />
                    <span>তারিখ: {group.date || 'নির্দিষ্ট নেই'}</span>
                  </div>
                  {(group.hisabType || group.workDetails) && (
                    <div className="flex items-center space-x-2 text-slate-700 col-span-1 sm:col-span-2">
                      <Wrench size={15} className="text-emerald-700" />
                      <span>কাজ / বিবরণ: {group.hisabType} {group.workDetails ? `(${group.workDetails})` : ''}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {group.name && (
                    <div className="flex items-center space-x-2 font-bold text-slate-900">
                      <User size={15} className="text-[#1B5E20]" />
                      <span>নাম: {group.name}</span>
                    </div>
                  )}
                  {group.mobile && (
                    <div className="flex items-center space-x-2 text-slate-700">
                      <Phone size={15} className="text-emerald-700" />
                      <span>মোবাইল: {group.mobile}</span>
                    </div>
                  )}
                  {group.address && (
                    <div className="flex items-center space-x-2 text-slate-700 col-span-1 sm:col-span-2">
                      <MapPin size={15} className="text-emerald-700 shrink-0" />
                      <span>ঠিকানা: {group.address}</span>
                    </div>
                  )}
                  {group.hisabType && (
                    <div className="col-span-1 sm:col-span-2 text-slate-600">
                      <span className="font-semibold text-slate-700">ধরন / বিবরণ:</span> {group.hisabType} {group.workDetails ? `(${group.workDetails})` : ''}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Summary Highlights */}
            <div className="bg-[#f0fdf4] p-4 rounded-xl flex items-center justify-between border border-emerald-300 text-center shadow-xs" style={{ backgroundColor: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div className="text-[11px] font-bold text-emerald-900" style={{ color: '#065f46' }}>মোট বিল</div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5" style={{ color: '#0f172a' }}>৳{Utils.toCleanString(group.totalBill)}</div>
              </div>
              <div style={{ width: '1px', height: '32px', backgroundColor: '#a7f3d0' }}></div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div className="text-[11px] font-bold text-emerald-900" style={{ color: '#065f46' }}>মোট জমা</div>
                <div className="text-base sm:text-lg font-extrabold text-emerald-700 mt-0.5" style={{ color: '#047857' }}>৳{Utils.toCleanString(group.totalPaid)}</div>
              </div>
              <div style={{ width: '1px', height: '32px', backgroundColor: '#a7f3d0' }}></div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div className="text-[11px] font-bold text-emerald-900" style={{ color: '#065f46' }}>মোট বকেয়া</div>
                <div className="text-base sm:text-lg font-extrabold text-red-600 mt-0.5" style={{ color: '#dc2626' }}>৳{Utils.toCleanString(group.totalDue)}</div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1B5E20] text-white" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>
                    {isDateWorkMode ? (
                      <>
                        <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>গ্রাহকের নাম</th>
                        <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>কাজের বক্তব্য</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>তারিখ</th>
                        <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>কাজের বক্তব্য</th>
                      </>
                    )}
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider text-center" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>পরিমাণ</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider text-right" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>দর</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>অতিরিক্ত বিলের তথ্য</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider text-right" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>বিল</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>টাকা পরিশোধের বিবরণ</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider text-right" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>জমা</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider text-right" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>বকেয়া</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {group.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'}
                      style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f1f5f9', color: '#1e293b' }}
                    >
                      {isDateWorkMode ? (
                        <>
                          <td className="p-3 font-semibold text-slate-900 break-words" style={{ color: '#0f172a' }}>{item.name || '-'}</td>
                          <td className="p-3 text-slate-600 font-mono text-xs break-words whitespace-pre-wrap" style={{ color: '#475569' }}>{item.stm || '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 whitespace-nowrap text-slate-600 font-medium" style={{ color: '#475569' }}>{item.date || '-'}</td>
                          <td className="p-3 text-slate-600 font-mono text-xs break-words whitespace-pre-wrap" style={{ color: '#475569' }}>{item.stm || '-'}</td>
                        </>
                      )}
                      <td className="p-3 whitespace-nowrap text-slate-700 text-center" style={{ color: '#334155' }}>{item.unit || '-'}</td>
                      <td className="p-3 whitespace-nowrap text-slate-700 text-right" style={{ color: '#334155' }}>৳{Utils.toCleanString(item.rate || 0)}</td>
                      <td className="p-3 text-slate-700 whitespace-pre-wrap" style={{ color: '#334155' }}>{item.billStm || '-'}</td>
                      <td className="p-3 whitespace-nowrap font-bold text-slate-900 text-right" style={{ color: '#0f172a' }}>৳{Utils.toCleanString(item.bill || 0)}</td>
                      <td className="p-3 text-slate-700 whitespace-pre-wrap" style={{ color: '#334155' }}>{item.paidStm || '-'}</td>
                      <td className="p-3 whitespace-nowrap font-bold text-emerald-700 text-right" style={{ color: '#047857' }}>৳{Utils.toCleanString(item.paid || 0)}</td>
                      <td className="p-3 whitespace-nowrap font-bold text-red-600 text-right" style={{ color: '#dc2626' }}>৳{Utils.toCleanString(item.due || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
              <div>সঠিক হিসাব ও স্বচ্ছতা নিশ্চিতকরণে প্রস্তুতকৃত বিবরণী</div>
              <div>স্বাক্ষর: ___________________________</div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-white border-t border-slate-100 p-3.5 shrink-0 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            বন্ধ করুন
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center space-x-1.5"
            >
              <Printer size={15} />
              <span>প্রিন্ট করুন</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1B5E20] hover:bg-emerald-900 disabled:opacity-60 transition-all flex items-center space-x-1.5 shadow-xs"
              style={{ backgroundColor: '#1B5E20' }}
            >
              {isExporting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>তৈরি হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>PDF ডাউনলোড</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

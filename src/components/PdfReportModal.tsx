import React, { useRef, useState } from 'react';
import { X, FileText, Download, Printer, Loader2 } from 'lucide-react';
import { GroupedHisab } from '../types';
import { exportDomToPdf } from '../util/pdfUtils';
import { Utils } from '../util/utils';

interface PdfReportModalProps {
  groupedList: GroupedHisab[];
  onClose: () => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  groupedList,
  onClose
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const totalBill = groupedList.reduce((acc, g) => acc + g.totalBill, 0);
  const totalPaid = groupedList.reduce((acc, g) => acc + g.totalPaid, 0);
  const totalDue = groupedList.reduce((acc, g) => acc + g.totalDue, 0);

  const generatePdf = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await exportDomToPdf(reportRef.current, `HisabBook_Full_Report_${today}.pdf`);
    } catch {
      alert('পিডিএফ তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 my-4 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#1B5E20] text-white px-4 py-3.5 flex items-center justify-between shrink-0" style={{ backgroundColor: '#1B5E20' }}>
          <div className="flex items-center space-x-2">
            <FileText size={20} className="text-emerald-300" />
            <h2 className="text-base font-bold text-white">হিসাব খাতা সর্বমোট রিপোর্ট (Full Report)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Report Content Paper Box */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-slate-100/80">
          <div
            ref={reportRef}
            data-pdf-content="true"
            className="bg-[#ffffff] p-6 sm:p-8 rounded-2xl border-2 border-emerald-800/20 space-y-5 shadow-md w-full"
            style={{ backgroundColor: '#ffffff', color: '#1e293b' }}
          >
            <div className="border-b-2 border-emerald-700/20 pb-4 flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-[#1B5E20] text-white p-1.5 rounded-lg">
                    <FileText size={18} />
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#1B5E20]" style={{ color: '#1B5E20' }}>
                    হিসাব খাতা - সার্বিক হিসাব বিবরণী
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-1">তারিখ: {new Date().toLocaleDateString('bn-BD')} | সময়: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="text-right">
                <div className="bg-[#1B5E20] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs inline-block" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>
                  সর্বমোট এন্ট্রি: {groupedList.flatMap(g => g.items).length} টি
                </div>
              </div>
            </div>

            <div className="bg-[#f0fdf4] p-4 rounded-xl flex items-center justify-between border border-emerald-300 text-center shadow-xs" style={{ backgroundColor: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div className="text-[11px] font-bold text-emerald-900" style={{ color: '#065f46' }}>মোট বিল</div>
                <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5" style={{ color: '#0f172a' }}>৳{Utils.toCleanString(totalBill)}</div>
              </div>
              <div style={{ width: '1px', height: '32px', backgroundColor: '#a7f3d0' }}></div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div className="text-[11px] font-bold text-emerald-900" style={{ color: '#065f46' }}>মোট জমা</div>
                <div className="text-base sm:text-lg font-extrabold text-emerald-700 mt-0.5" style={{ color: '#047857' }}>৳{Utils.toCleanString(totalPaid)}</div>
              </div>
              <div style={{ width: '1px', height: '32px', backgroundColor: '#a7f3d0' }}></div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div className="text-[11px] font-bold text-emerald-900" style={{ color: '#065f46' }}>মোট বকেয়া</div>
                <div className="text-base sm:text-lg font-extrabold text-red-600 mt-0.5" style={{ color: '#dc2626' }}>৳{Utils.toCleanString(totalDue)}</div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1B5E20] text-white" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>তারিখ</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>নাম</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>হিসাবের ধরন</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>কাজের বক্তব্য</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>পরিমাণ</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider text-right" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>দর</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>অতিরিক্ত বিলের তথ্য</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider text-right" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>মোট বিল</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>টাকা পরিশোধের বিবরণ</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider text-right" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>জমা</th>
                    <th className="p-3 border-b border-emerald-800 font-bold text-white uppercase tracking-wider text-right" style={{ backgroundColor: '#1B5E20', color: '#ffffff' }}>বকেয়া</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {groupedList.flatMap(g => g.items).map((item, idx) => (
                    <tr
                      key={item.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'}
                      style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f1f5f9', color: '#1e293b' }}
                    >
                      <td className="p-3 text-slate-600 font-medium whitespace-nowrap" style={{ color: '#475569' }}>{item.date || '-'}</td>
                      <td className="p-3 font-semibold text-slate-900" style={{ color: '#0f172a' }}>{item.name || '-'}</td>
                      <td className="p-3 text-slate-700 whitespace-nowrap" style={{ color: '#334155' }}>{item.workDetails || item.hisabType || '-'}</td>
                      <td className="p-3 text-slate-700" style={{ color: '#334155' }}>{item.stm || '-'}</td>
                      <td className="p-3 text-slate-700 whitespace-nowrap" style={{ color: '#334155' }}>{item.unit || '-'}</td>
                      <td className="p-3 font-medium text-slate-900 whitespace-nowrap text-right" style={{ color: '#0f172a' }}>৳{Utils.toCleanString(item.rate || 0)}</td>
                      <td className="p-3 text-slate-700 whitespace-pre-wrap" style={{ color: '#334155' }}>{item.billStm || '-'}</td>
                      <td className="p-3 font-bold text-slate-900 whitespace-nowrap text-right" style={{ color: '#0f172a' }}>৳{Utils.toCleanString(item.bill || 0)}</td>
                      <td className="p-3 text-slate-700 whitespace-pre-wrap" style={{ color: '#334155' }}>{item.paidStm || '-'}</td>
                      <td className="p-3 font-bold text-emerald-700 whitespace-nowrap text-right" style={{ color: '#047857' }}>৳{Utils.toCleanString(item.paid || 0)}</td>
                      <td className="p-3 font-bold text-red-600 whitespace-nowrap text-right" style={{ color: '#dc2626' }}>৳{Utils.toCleanString(item.due || 0)}</td>
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

        <div className="flex items-center justify-between p-3.5 border-t border-slate-100 shrink-0 bg-white">
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
              onClick={generatePdf}
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

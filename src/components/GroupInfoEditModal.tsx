import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Pencil, Lock, Save, CheckCircle2, Calendar, Layers, User, Tag, Briefcase, ArrowLeft, AlertCircle } from 'lucide-react';
import { GroupedHisab, GroupByMode, VehicleHisab } from '../types';
import { HisabStorage } from '../data/storage';
import { Utils } from '../util/utils';

interface GroupInfoEditModalProps {
  group: GroupedHisab;
  mode: GroupByMode;
  onClose: () => void;
  onSuccess: () => void;
}

export const GroupInfoEditModal: React.FC<GroupInfoEditModalProps> = ({
  group,
  mode,
  onClose,
  onSuccess
}) => {
  const initialParsed = useMemo(() => {
    const raw = (group.workDetails || '').trim();
    return Utils.parseWorkDetails(raw);
  }, [group.workDetails]);

  const firstItem = group.items?.[0];
  const [date, setDate] = useState(group.date || firstItem?.date || '');
  const [name, setName] = useState(group.name || firstItem?.name || '');
  const [mobile, setMobile] = useState(group.mobile || firstItem?.mobile || '');
  const [address, setAddress] = useState(group.address || firstItem?.address || '');
  const [workDetails, setWorkDetails] = useState(initialParsed.work);
  const year = initialParsed.year;
  const session = initialParsed.session;
  const managerName = initialParsed.manager;
  const vehicleName = initialParsed.vehicle;
  const driverName = initialParsed.driver;
  const trolleyBed = initialParsed.trolleyBed;

  const [allEntries, setAllEntries] = useState<VehicleHisab[]>([]);

  const [showWorkSuggestions, setShowWorkSuggestions] = useState(false);
  const workContainerRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    HisabStorage.getAll().then(setAllEntries).catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (workContainerRef.current && !workContainerRef.current.contains(target)) setShowWorkSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const workDetailsSuggestions = useMemo(() => {
    const q = workDetails.trim().toLowerCase();
    if (!q) return [];
    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails) {
        const firstPart = item.workDetails.split('|')[0]?.trim();
        if (firstPart) set.add(firstPart);
      }
    }
    const list = Array.from(set);
    return list.filter(w => w.toLowerCase().includes(q)).slice(0, 8);
  }, [allEntries, workDetails]);



  const concatenatedWorkDetails = useMemo(() => {
    return Utils.formatWorkDetails(
      workDetails,
      year,
      session,
      managerName,
      vehicleName,
      driverName,
      trolleyBed
    );
  }, [workDetails, year, session, managerName, vehicleName, driverName, trolleyBed]);

  const isDateValid = useMemo(() => {
    if (mode !== GroupByMode.BY_DATE_WORK) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(date.trim());
  }, [date, mode]);

  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === GroupByMode.BY_DATE_WORK && !isDateValid) {
      return;
    }
    setSaving(true);

    try {
      await HisabStorage.updateGroupProfile(
        {
          name: group.name,
          date: group.date,
          hisabType: group.hisabType,
          address: group.address,
          mobile: group.mobile,
          workDetails: group.workDetails
        },
        {
          name: name.trim(),
          mobile: mobile.trim(),
          address: address.trim(),
          workDetails: concatenatedWorkDetails,
          date: date.trim()
        },
        mode
      );

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (err) {
      console.error('Failed to update group profile:', err);
      alert('তথ্য আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] p-3.5 sm:p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 active:scale-95 hover:bg-white/20 rounded-xl text-white transition-all shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="ফিরে যান"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="bg-white/20 p-2 rounded-xl shrink-0">
              <Pencil size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-tight">
                {mode === GroupByMode.BY_USER_DETAILS ? 'গ্রুপের প্রোফাইল এডিট করুন' : 'তারিখ ও কাজের বিবরণী এডিট করুন'}
              </h2>
              <p className="text-[11px] text-blue-100">
                {mode === GroupByMode.BY_DATE_WORK ? (date ? `তারিখ: ${date}` : 'তারিখ ও কাজের তথ্য') : (group.name ? `গ্রাহক: ${group.name}` : 'প্রোফাইল তথ্য আপডেট করুন')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 active:scale-95 hover:bg-white/20 rounded-xl text-white transition-all shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="বন্ধ করুন"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body - Scrollable on mobile */}
        <form onSubmit={handleSave} className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto flex-1 text-slate-800">
          {/* Date Input - Shown in BY_DATE_WORK mode */}
          {mode === GroupByMode.BY_DATE_WORK && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar size={14} className="text-[#0D47A1]" />
                <span>তারিখ (YYYY-MM-DD)</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="2026-07-29"
                  className={`w-full pl-3.5 pr-16 py-2.5 text-sm border rounded-xl outline-none transition-all bg-slate-50/50 min-h-[44px] text-slate-800 ${
                    !isDateValid
                      ? 'border-amber-500 bg-amber-50/20 focus:border-amber-600'
                      : 'border-slate-300 focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setDate(new Date().toISOString().split('T')[0])}
                  className="absolute right-2 px-2.5 py-1 text-xs font-bold text-[#0D47A1] bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition-colors border border-blue-200"
                  title="আজকের তারিখ বসান"
                >
                  আজ
                </button>
              </div>

              {!isDateValid && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800 font-medium flex items-center space-x-1.5 mt-1.5">
                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  <span>সঠিক YYYY-MM-DD ফরম্যাটে তারিখ লিখুন (যেমন: 2026-07-29)</span>
                </div>
              )}
            </div>
          )}

          {/* Work Details */}
          <div className="relative" ref={workContainerRef}>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Briefcase size={14} className="text-[#0D47A1]" />
              <span>কিসের কাজ লেখেন (কাজের বিবরণ)</span>
            </label>
            <input
              type="text"
              value={workDetails}
              onChange={(e) => {
                setWorkDetails(e.target.value);
                setShowWorkSuggestions(true);
              }}
              onFocus={() => setShowWorkSuggestions(true)}
              placeholder="যেমন: মাটি কাটা, বালু পরিবহন, ড্রাইভিং ইত্যাদি"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] outline-none transition-all bg-slate-50/50 min-h-[44px]"
            />
            {showWorkSuggestions && workDetailsSuggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                {workDetailsSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setWorkDetails(item);
                      setShowWorkSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 active:bg-blue-100 flex items-center justify-between transition-colors"
                  >
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            )}
          </div>



          {/* Customer Name, Mobile, Address - Only in BY_USER_DETAILS mode */}
          {mode === GroupByMode.BY_USER_DETAILS && (
            <>
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  গ্রাহকের নাম
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="গ্রাহক বা পার্টির নাম"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] outline-none transition-all min-h-[44px]"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মোবাইল নম্বর
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] outline-none transition-all min-h-[44px]"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ঠিকানা
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="গ্রাহক বা প্রজেক্টের ঠিকানা"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] outline-none transition-all min-h-[44px]"
                />
              </div>
            </>
          )}

          {/* Locked Fields Preview */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1">
              <Lock size={12} />
              <span>সুরক্ষিত ক্ষেত্রসমূহ (লক করা):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-500">
              <div>মোট বিল: ৳{group.totalBill}</div>
              <div>মোট পরিশোধিত: ৳{group.totalPaid}</div>
              <div>বকেয়া: ৳{group.totalDue}</div>
              <div>মোট এন্ট্রি: {group.itemCount || group.items.length} টি</div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors min-h-[42px]"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={saving || !isDateValid}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#0D47A1] active:bg-[#0a3880] hover:bg-[#1565C0] rounded-xl shadow-md active:scale-[0.98] flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 min-h-[42px]"
            >
              {showSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>সংরক্ষিত হয়েছে!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'আপডেট সংরক্ষণ করুন'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

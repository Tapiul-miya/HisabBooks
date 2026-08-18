import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Pencil, Lock, Save, CheckCircle2, Calendar, Layers, User, Tag, Briefcase, ArrowLeft } from 'lucide-react';
import { GroupedHisab, GroupByMode, VehicleHisab } from '../types';
import { HisabStorage } from '../data/storage';

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
    if (!raw) return { work: '', year: '', session: '', manager: '', vehicle: '' };
    const parts = raw.split('|').map(p => p.trim());
    return {
      work: parts[0] || '',
      year: parts[1] || '',
      session: parts[2] || '',
      manager: parts[3] || '',
      vehicle: parts[4] || ''
    };
  }, [group.workDetails]);

  const [name, setName] = useState(group.name || '');
  const [mobile, setMobile] = useState(group.mobile || '');
  const [address, setAddress] = useState(group.address || '');
  const [workDetails, setWorkDetails] = useState(initialParsed.work);
  const [year, setYear] = useState(initialParsed.year);
  const [session, setSession] = useState(initialParsed.session);
  const [managerName, setManagerName] = useState(initialParsed.manager);
  const [vehicleName, setVehicleName] = useState(initialParsed.vehicle);

  const [allEntries, setAllEntries] = useState<VehicleHisab[]>([]);

  const [showWorkSuggestions, setShowWorkSuggestions] = useState(false);
  const workContainerRef = useRef<HTMLDivElement>(null);

  const [showYearSuggestions, setShowYearSuggestions] = useState(false);
  const yearContainerRef = useRef<HTMLDivElement>(null);

  const [showSessionSuggestions, setShowSessionSuggestions] = useState(false);
  const sessionContainerRef = useRef<HTMLDivElement>(null);

  const [showManagerSuggestions, setShowManagerSuggestions] = useState(false);
  const managerContainerRef = useRef<HTMLDivElement>(null);

  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);
  const vehicleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    HisabStorage.getAll().then(setAllEntries).catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (workContainerRef.current && !workContainerRef.current.contains(target)) setShowWorkSuggestions(false);
      if (yearContainerRef.current && !yearContainerRef.current.contains(target)) setShowYearSuggestions(false);
      if (sessionContainerRef.current && !sessionContainerRef.current.contains(target)) setShowSessionSuggestions(false);
      if (managerContainerRef.current && !managerContainerRef.current.contains(target)) setShowManagerSuggestions(false);
      if (vehicleContainerRef.current && !vehicleContainerRef.current.contains(target)) setShowVehicleSuggestions(false);
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

  const yearSuggestions = useMemo(() => {
    const q = year.trim().toLowerCase();
    if (!q) return [];
    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails && item.workDetails.includes('|')) {
        const parts = item.workDetails.split('|').map(p => p.trim());
        if (parts[1]) set.add(parts[1]);
      }
    }
    const list = Array.from(set).filter(Boolean);
    return list.filter(y => y.toLowerCase().includes(q)).slice(0, 8);
  }, [allEntries, year]);

  const sessionSuggestions = useMemo(() => {
    const q = session.trim().toLowerCase();
    if (!q) return [];
    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails && item.workDetails.includes('|')) {
        const parts = item.workDetails.split('|').map(p => p.trim());
        if (parts[2]) set.add(parts[2]);
      }
    }
    const list = Array.from(set).filter(Boolean);
    return list.filter(s => s.toLowerCase().includes(q)).slice(0, 8);
  }, [allEntries, session]);

  const managerSuggestions = useMemo(() => {
    const q = managerName.trim().toLowerCase();
    if (!q) return [];
    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails && item.workDetails.includes('|')) {
        const parts = item.workDetails.split('|').map(p => p.trim());
        if (parts[3]) set.add(parts[3]);
      }
    }
    const list = Array.from(set).filter(Boolean);
    return list.filter(m => m.toLowerCase().includes(q)).slice(0, 8);
  }, [allEntries, managerName]);

  const vehicleSuggestions = useMemo(() => {
    const q = vehicleName.trim().toLowerCase();
    if (!q) return [];
    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails && item.workDetails.includes('|')) {
        const parts = item.workDetails.split('|').map(p => p.trim());
        if (parts[4]) set.add(parts[4]);
      }
    }
    const list = Array.from(set).filter(Boolean);
    return list.filter(v => v.toLowerCase().includes(q)).slice(0, 8);
  }, [allEntries, vehicleName]);

  const concatenatedWorkDetails = useMemo(() => {
    const parts = [
      workDetails.trim(),
      year.trim(),
      session.trim(),
      managerName.trim(),
      vehicleName.trim()
    ].filter(Boolean);
    return parts.join(' | ');
  }, [workDetails, year, session, managerName, vehicleName]);

  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
          workDetails: concatenatedWorkDetails
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
              <h2 className="text-sm sm:text-base font-bold leading-tight">গ্রুপের তথ্য এডিট করুন</h2>
              <p className="text-[11px] text-blue-100">প্রোফাইল তথ্য আপডেট করুন</p>
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

          {/* Sub-fields for Work Concatenation */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              {/* কত শাল */}
              <div className="space-y-1 relative" ref={yearContainerRef}>
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Calendar size={12} className="text-[#0D47A1]" />
                  <span>কত শাল</span>
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setShowYearSuggestions(true);
                  }}
                  onFocus={() => setShowYearSuggestions(true)}
                  placeholder="যেমন: ২০২৪"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] min-h-[40px]"
                />
                {showYearSuggestions && yearSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-100">
                    {yearSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setYear(item);
                          setShowYearSuggestions(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-blue-50 active:bg-blue-100 flex items-center justify-between transition-colors"
                      >
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* কোন সেশন */}
              <div className="space-y-1 relative" ref={sessionContainerRef}>
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Layers size={12} className="text-[#0D47A1]" />
                  <span>কোন সেশন</span>
                </label>
                <input
                  type="text"
                  value={session}
                  onChange={(e) => {
                    setSession(e.target.value);
                    setShowSessionSuggestions(true);
                  }}
                  onFocus={() => setShowSessionSuggestions(true)}
                  placeholder="যেমন: রবি / খরিপ"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] min-h-[40px]"
                />
                {showSessionSuggestions && sessionSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-100">
                    {sessionSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSession(item);
                          setShowSessionSuggestions(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-blue-50 active:bg-blue-100 flex items-center justify-between transition-colors"
                      >
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ম্যানেজারের নাম */}
              <div className="space-y-1 relative" ref={managerContainerRef}>
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <User size={12} className="text-[#0D47A1]" />
                  <span>ম্যানেজারের নাম</span>
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => {
                    setManagerName(e.target.value);
                    setShowManagerSuggestions(true);
                  }}
                  onFocus={() => setShowManagerSuggestions(true)}
                  placeholder="যেমন: আব্দুর রহিম"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] min-h-[40px]"
                />
                {showManagerSuggestions && managerSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-100">
                    {managerSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setManagerName(item);
                          setShowManagerSuggestions(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-blue-50 active:bg-blue-100 flex items-center justify-between transition-colors"
                      >
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* গাড়ির নাম */}
              <div className="space-y-1 relative" ref={vehicleContainerRef}>
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Tag size={12} className="text-[#0D47A1]" />
                  <span>গাড়ির নাম</span>
                </label>
                <input
                  type="text"
                  value={vehicleName}
                  onChange={(e) => {
                    setVehicleName(e.target.value);
                    setShowVehicleSuggestions(true);
                  }}
                  onFocus={() => setShowVehicleSuggestions(true)}
                  placeholder="যেমন: ট্রাফি / ট্রাক"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] min-h-[40px]"
                />
                {showVehicleSuggestions && vehicleSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-100">
                    {vehicleSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setVehicleName(item);
                          setShowVehicleSuggestions(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-blue-50 active:bg-blue-100 flex items-center justify-between transition-colors"
                      >
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live Concatenated Work Details Preview Box */}
            <div className="pt-1.5 border-t border-slate-200/80">
              <div className="text-[11px] font-bold text-blue-900 mb-1 flex items-center justify-between">
                <span>একত্রিত কাজের বিবরণী (Work Details Preview):</span>
                <span className="text-[10px] text-slate-400 font-normal">‘|’ চিহ্ন দ্বারা যুক্ত</span>
              </div>
              <div className="p-2.5 bg-blue-50/90 border border-blue-200/80 rounded-xl text-xs font-semibold text-blue-900 break-words min-h-[40px] flex items-center">
                {concatenatedWorkDetails || (
                  <span className="text-slate-400 font-normal italic">
                    ইনপুট লেখার সাথে সাথে সব তথ্য এখানে যুক্ত হয়ে প্রদর্শিত হবে
                  </span>
                )}
              </div>
            </div>
          </div>

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

          {/* Locked Fields Preview */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1">
              <Lock size={12} />
              <span>সুরক্ষিত ক্ষেত্রসমূহ (লক করা):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-500">
              <div>মোট বিল: ৳{group.totalBill}</div>
              <div>মোট জমা: ৳{group.totalPaid}</div>
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
              disabled={saving}
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

import React, { useState } from 'react';
import { X, Pencil, Lock, Save, CheckCircle2 } from 'lucide-react';
import { GroupedHisab, GroupByMode } from '../types';
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
  const [name, setName] = useState(group.name || '');
  const [mobile, setMobile] = useState(group.mobile || '');
  const [address, setAddress] = useState(group.address || '');
  const [workDetails, setWorkDetails] = useState(group.workDetails || '');

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
          workDetails: workDetails.trim()
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
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <Pencil size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">গ্রুপের তথ্য এডিট করুন</h2>
              <p className="text-xs text-blue-100">প্রোফাইল তথ্য আপডেট করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lock Info Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center space-x-2 text-xs text-amber-800">
          <Lock size={14} className="shrink-0 text-amber-600" />
          <span>
            <strong>শুধুমাত্র নির্দিষ্ট তথ্য সম্পাদনাযোগ্য:</strong> তারিখ, বিল, জমা ও পরিমাণ ইত্যাদি পরিবর্তন প্রতিরোধ করতে লক করা রয়েছে।
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 space-y-3.5">
          {/* Work Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              কিসের কাজ লেখেন (কাজের বিবরণ)
            </label>
            <input
              type="text"
              value={workDetails}
              onChange={(e) => setWorkDetails(e.target.value)}
              placeholder="যেমন: মাটি কাটা, বালু পরিবহন, ড্রাইভিং ইত্যাদি"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all"
            />
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all"
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all"
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all"
            />
          </div>

          {/* Locked Fields Preview */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1">
              <Lock size={12} />
              <span>সুরক্ষিত ক্ষেত্রসমূহ (লক করা):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-500">
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
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-[#0D47A1] hover:bg-[#1565C0] rounded-lg shadow-md hover:shadow-lg flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              {showSuccess ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>সংরক্ষিত হয়েছে!</span>
                </>
              ) : (
                <>
                  <Save size={15} />
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

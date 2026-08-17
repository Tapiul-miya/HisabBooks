import React from 'react';
import { X, CheckCircle, Smartphone } from 'lucide-react';
import appLogo from '../assets/images/app_logo.svg';

interface AboutAppModalProps {
  onClose: () => void;
}

export const AboutAppModal: React.FC<AboutAppModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2.5 text-[#1B5E20]">
            <img
              src={appLogo}
              alt="Hisab Book Logo"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-xl object-cover border border-emerald-200 shadow-xs"
            />
            <h2 className="text-lg font-bold text-slate-900">Hisab Book (হিসাব খাতা)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800 text-sm">
            গাড়ি ও কাজের লেনদেনের ডিজিটাল হিসাব বই।
          </p>

          <div className="space-y-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-slate-700">
            <div className="flex items-start space-x-2">
              <CheckCircle size={15} className="text-[#1B5E20] shrink-0 mt-0.5" />
              <span><strong>জমি/বিঘা হিসাব:</strong> ২০ কাঠায় ১ বিঘা হিসাব স্বয়ংক্রিয়ভাবে টাকার অংক ক্যালকুলেট করে।</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle size={15} className="text-[#1B5E20] shrink-0 mt-0.5" />
              <span><strong>ঘণ্টা হিসাব:</strong> start...stop সময়সূচী (যেমন: start10:00am stop01:00pm) সরাসরি এন্ট্রি করুন।</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle size={15} className="text-[#1B5E20] shrink-0 mt-0.5" />
              <span><strong>স্মার্ট গ্রুপিং:</strong> গ্রাহকের নাম অথবা তারিখ অনুযায়ী গ্রুপ ড্যাশবোর্ড সুবিধা।</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle size={15} className="text-[#1B5E20] shrink-0 mt-0.5" />
              <span><strong>কপি হিসাব:</strong> একই কাস্টমারের কাজ এক ক্লিকে কপি করে নতুন এন্ট্রি তৈরি করার সুবিধা।</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 text-slate-400 text-[11px]">
            <span className="flex items-center space-x-1">
              <Smartphone size={13} />
              <span>Version 1.0.0</span>
            </span>
            <span>© 2026 HisabBook</span>
          </div>
        </div>

        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1B5E20] text-white hover:bg-emerald-800 transition-colors shadow-xs"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

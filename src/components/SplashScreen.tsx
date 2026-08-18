import React, { useEffect, useState } from 'react';
import appLogo from '../assets/images/app_logo.svg';

interface SplashScreenProps {
  onFinished: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Quick and snappy splash screen (600ms display + 300ms fadeout)
    const timer1 = setTimeout(() => {
      setFadeOut(true);
    }, 600);

    const timer2 = setTimeout(() => {
      onFinished();
    }, 900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinished]);

  return (
    <div
      onClick={onFinished}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-[#0F380F] via-[#1B5E20] to-[#0A270A] text-white p-6 cursor-pointer transition-opacity duration-300 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Animated App Icon Frame */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-400 to-amber-300 rounded-3xl blur-md opacity-75 animate-pulse"></div>
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-300/40 bg-emerald-950/80 p-1">
            <img
              src={appLogo}
              alt="Hisab Book Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-xl shadow-inner transform transition-transform duration-700 hover:scale-105"
            />
          </div>
        </div>

        {/* App Title & Tagline */}
        <h1 className="text-3xl font-extrabold tracking-wide text-white drop-shadow-md">
          Hisab Book
        </h1>
        <p className="text-emerald-300 text-lg font-semibold mt-1 drop-shadow-xs">
          হিসাব খাতা
        </p>
        <p className="text-emerald-100/80 text-xs mt-2 max-w-xs leading-relaxed font-light">
          গাড়ি ও কাজের লেনদেনের ডিজিটাল সহজ হিসাব বই
        </p>

        {/* Animated Progress / Loading bar */}
        <div className="mt-8 w-44 h-1.5 bg-emerald-950/80 rounded-full overflow-hidden border border-emerald-400/20 shadow-inner">
          <div className="h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 w-full animate-pulse rounded-full"></div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[11px] text-emerald-200/60 pb-2">
        <span className="font-medium">Version 1.0.0</span> • <span>Digital Hisab Engine</span>
      </div>
    </div>
  );
};

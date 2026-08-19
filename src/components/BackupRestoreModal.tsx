import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Download,
  Upload,
  Database,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  HardDrive,
  Trash2,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { HisabStorage } from '../data/storage';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken
} from '../services/googleAuth';
import {
  DriveBackupFile,
  listDriveBackups,
  uploadBackupToDrive,
  downloadDriveBackup,
  deleteDriveBackup,
  isAutoBackupEnabled,
  setAutoBackupEnabled,
  getLastCloudBackupTime
} from '../services/googleDriveStorage';
import { User } from 'firebase/auth';

const exportBackupFile = async (content: string, filename: string, mimeType: string) => {
  // 1. Android Native / Capacitor Platform
  if (Capacitor.isNativePlatform()) {
    try {
      const fileResult = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      await Share.share({
        title: 'হিসাব খাতা ব্যাকআপ ফাইল',
        text: 'হিসাব খাতার ব্যাকআপ ফাইল সেভ বা শেয়ার করুন',
        url: fileResult.uri,
        dialogTitle: 'ব্যাকআপ ফাইল সেভ বা শেয়ার করুন'
      });
      return;
    } catch (err) {
      console.warn('Native Capacitor export failed, falling back:', err);
    }
  }

  // 2. Mobile Web Share API (Works in modern Android WebViews & browsers)
  if (typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([content], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: 'হিসাব খাতা ব্যাকআপ ফাইল'
        });
        return;
      }
    } catch (shareErr) {
      console.warn('Web share failed, falling back to download link:', shareErr);
    }
  }

  // 3. Browser Blob Download
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 1000);
  } catch {
    // 4. Data URI Fallback for WebViews where blob URLs are blocked
    const encodedData = encodeURIComponent(content);
    const dataUrl = `data:${mimeType};charset=utf-8,${encodedData}`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 1000);
  }
};

interface BackupRestoreModalProps {
  onClose: () => void;
  onDataRestored: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  onClose,
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'export' | 'import' | 'clear'>('cloud');
  const [recordCount, setRecordCount] = useState<number>(0);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [confirmClearText, setConfirmClearText] = useState('');
  
  // Google Auth & Cloud State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [autoBackup, setAutoBackup] = useState<boolean>(isAutoBackupEnabled());
  const [cloudBackups, setCloudBackups] = useState<DriveBackupFile[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [isCloudBackingUp, setIsCloudBackingUp] = useState(false);
  const [lastCloudTime, setLastCloudTime] = useState<string | null>(getLastCloudBackupTime());

  // Confirmations
  const [pendingRestoreFile, setPendingRestoreFile] = useState<DriveBackupFile | null>(null);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<DriveBackupFile | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCount = async () => {
    try {
      const count = await HisabStorage.getCount();
      setRecordCount(count);
    } catch {
      setRecordCount(0);
    }
  };

  const loadDriveBackupsList = useCallback(async (tokenToUse?: string) => {
    const token = tokenToUse || authToken || (await getAccessToken());
    if (!token) return;

    setIsLoadingCloud(true);
    try {
      const backups = await listDriveBackups(token);
      setCloudBackups(backups);
    } catch (err) {
      console.warn('Failed to load drive backups:', err);
    } finally {
      setIsLoadingCloud(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchCount();

    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAuthToken(token);
        loadDriveBackupsList(token);
      },
      () => {
        setCurrentUser(null);
        setAuthToken(null);
        setCloudBackups([]);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [loadDriveBackupsList]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAuthToken(res.accessToken);
        setMessage({
          type: 'success',
          text: `স্বাগতম ${res.user.displayName || 'ব্যবহারকারী'}! গুগল ড্রাইভ ক্লাউড স্টোরেজ সফলভাবে সংযুক্ত হয়েছে।`
        });
        await loadDriveBackupsList(res.accessToken);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'গুগল সাইন ইনে ত্রুটি ঘটেছে';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutGoogle();
      setCurrentUser(null);
      setAuthToken(null);
      setCloudBackups([]);
      setMessage({ type: 'success', text: 'গুগল অ্যাকাউন্ট থেকে লগআউট করা হয়েছে।' });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'লগআউটে সমস্যা হয়েছে';
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const handleToggleAutoBackup = (enabled: boolean) => {
    setAutoBackup(enabled);
    setAutoBackupEnabled(enabled);
    if (enabled && authToken) {
      setMessage({
        type: 'success',
        text: 'স্বয়ংক্রিয় ক্লাউড ব্যাকআপ সক্রিয় করা হয়েছে। প্রতিটি হিসাব পরিবর্তনের পর ডাটা ড্রাইভে সংরক্ষিত হবে।'
      });
    }
  };

  const handleCreateCloudBackup = async () => {
    const token = authToken || (await getAccessToken());
    if (!token) {
      setMessage({ type: 'error', text: 'অনুগ্রহ করে প্রথমে গুগল অ্যাকাউন্ট দিয়ে সাইন ইন করুন।' });
      return;
    }

    if (recordCount === 0) {
      setMessage({ type: 'error', text: 'ডাটাবেসে কোনো হিসাব নেই। ব্যাকআপ নেওয়ার জন্য কিছু হিসাব যোগ করুন।' });
      return;
    }

    setIsCloudBackingUp(true);
    setMessage(null);
    try {
      const jsonStr = await HisabStorage.exportJSON();
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `HisabBook_Backup_${dateStr}_${timeStr}.json`;

      await uploadBackupToDrive(
        token,
        jsonStr,
        filename,
        'application/json',
        recordCount
      );

      const timeNow = new Date().toLocaleString('bn-BD');
      setLastCloudTime(new Date().toISOString());

      setMessage({
        type: 'success',
        text: `সফলভাবে ${recordCount} টি হিসাবের ক্লাউড ব্যাকআপ গুগল ড্রাইভে সেভ করা হয়েছে!`
      });

      await loadDriveBackupsList(token);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'ক্লাউড ব্যাকআপে ত্রুটি ঘটেছে';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsCloudBackingUp(false);
    }
  };

  const handleConfirmRestoreCloud = async () => {
    if (!pendingRestoreFile) return;

    const token = authToken || (await getAccessToken());
    if (!token) {
      setMessage({ type: 'error', text: 'লগইন সেশন শেষ হয়ে গেছে। অনুগ্রহ করে আবার সাইন ইন করুন।' });
      setPendingRestoreFile(null);
      return;
    }

    setIsLoadingCloud(true);
    setMessage(null);

    try {
      const content = await downloadDriveBackup(token, pendingRestoreFile.id);
      const text = content.trim().replace(/^\uFEFF/, '');
      if (!text) throw new Error('ক্লাউড ব্যাকআপ ফাইলটি খালি');

      let resultCount = 0;
      if (pendingRestoreFile.name.endsWith('.json') || text.startsWith('{') || text.startsWith('[')) {
        const res = await HisabStorage.importJSON(text, importMode);
        resultCount = res.count;
      } else if (pendingRestoreFile.name.endsWith('.sql') || pendingRestoreFile.name.endsWith('.db') || text.toUpperCase().includes('INSERT')) {
        const res = await HisabStorage.importSQL(text, importMode);
        resultCount = res.count;
      } else {
        const res = await HisabStorage.importJSON(text, importMode);
        resultCount = res.count;
      }

      await fetchCount();
      onDataRestored();

      setMessage({
        type: 'success',
        text: `গুগল ড্রাইভ থেকে সফলভাবে ${resultCount} টি হিসাব ডাটাবেসে রিস্টোর করা হয়েছে!`
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'ক্লাউড রিস্টোরে ত্রুটি ঘটেছে';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsLoadingCloud(false);
      setPendingRestoreFile(null);
    }
  };

  const handleConfirmDeleteCloud = async () => {
    if (!pendingDeleteFile) return;

    const token = authToken || (await getAccessToken());
    if (!token) return;

    setIsLoadingCloud(true);
    setMessage(null);

    try {
      await deleteDriveBackup(token, pendingDeleteFile.id);
      setMessage({
        type: 'success',
        text: `ড্রাইভ থেকে ব্যাকআপ ফাইলটি সফলভাবে মুছে ফেলা হয়েছে।`
      });
      await loadDriveBackupsList(token);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'ফাইল মুছতে ব্যর্থ হয়েছে';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsLoadingCloud(false);
      setPendingDeleteFile(null);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const jsonStr = await HisabStorage.exportJSON();
      const today = new Date().toISOString().split('T')[0];
      const filename = `HisabBook_Backup_${today}.json`;
      await exportBackupFile(jsonStr, filename, 'application/json');

      setMessage({
        type: 'success',
        text: `সফলভাবে ${recordCount} টি হিসাবের JSON ব্যাকআপ সেভ/ডাউনলোড হয়েছে!`
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'ব্যাকআপ ডাউনলোডে সমস্যা হয়েছে';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const csvStr = await HisabStorage.exportCSV();
      const today = new Date().toISOString().split('T')[0];
      const filename = `HisabBook_Backup_${today}.csv`;
      await exportBackupFile(csvStr, filename, 'text/csv');

      setMessage({
        type: 'success',
        text: `সফলভাবে ${recordCount} টি হিসাবের CSV ব্যাকআপ সেভ/ডাউনলোড হয়েছে!`
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'CSV ডাউনলোডে সমস্যা হয়েছে';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSQL = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const sqlStr = await HisabStorage.exportSQL();
      const today = new Date().toISOString().split('T')[0];
      const filename = `HisabBook_Backup_${today}.sql`;
      await exportBackupFile(sqlStr, filename, 'application/sql');

      setMessage({
        type: 'success',
        text: `সফলভাবে ${recordCount} টি হিসাবের SQL ব্যাকআপ সেভ/ডাউনলোড হয়েছে!`
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'SQL ডাউনলোডে সমস্যা হয়েছে';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDB = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const sqlStr = await HisabStorage.exportSQL();
      const today = new Date().toISOString().split('T')[0];
      const filename = `HisabBook_Backup_${today}.db`;
      await exportBackupFile(sqlStr, filename, 'application/x-sqlite3');

      setMessage({
        type: 'success',
        text: `সফলভাবে ${recordCount} টি হিসাবের .DB ডাটাবেস ব্যাকআপ সেভ/ডাউনলোড হয়েছে!`
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '.DB ডাউনলোডে সমস্যা হয়েছে';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAll = async () => {
    if (confirmClearText.trim() !== 'DELETE') {
      setMessage({ type: 'error', text: 'নিশ্চিত করার জন্য সঠিক শব্দ (DELETE) লিখুন।' });
      return;
    }

    setIsClearing(true);
    setMessage(null);
    try {
      await HisabStorage.clearAll();
      await fetchCount();
      setConfirmClearText('');
      onDataRestored();
      setMessage({ type: 'success', text: 'সব হিসাব সফলভাবে মুছে ফেলা হয়েছে।' });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'সব হিসাব মুছতে সমস্যা হয়েছে';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsClearing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        let text = (event.target?.result as string) || '';
        text = text.trim().replace(/^\uFEFF/, '');
        if (!text) throw new Error('ফাইলটি খালি');

        // Auto-detect base64 encoded text
        if (!text.startsWith('{') && !text.startsWith('[') && !text.toUpperCase().includes('INSERT') && !text.includes(',')) {
          try {
            const decoded = atob(text);
            const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
            const utf8Decoded = new TextDecoder('utf-8').decode(bytes);
            if (utf8Decoded && (utf8Decoded.startsWith('{') || utf8Decoded.startsWith('[') || utf8Decoded.toUpperCase().includes('INSERT') || utf8Decoded.includes(','))) {
              text = utf8Decoded.trim().replace(/^\uFEFF/, '');
            }
          } catch {
            // Proceed with raw text
          }
        }

        const fileName = file.name.toLowerCase();
        let resultCount = 0;

        let imported = false;
        if (fileName.endsWith('.json') || text.startsWith('{') || text.startsWith('[')) {
          try {
            const res = await HisabStorage.importJSON(text, importMode);
            resultCount = res.count;
            imported = true;
          } catch {
            // fallback
          }
        } else if (fileName.endsWith('.sql') || fileName.endsWith('.db') || text.toUpperCase().includes('INSERT INTO')) {
          try {
            const res = await HisabStorage.importSQL(text, importMode);
            resultCount = res.count;
            imported = true;
          } catch {
            // fallback
          }
        } else if (fileName.endsWith('.csv') || text.includes(',')) {
          try {
            const res = await HisabStorage.importCSV(text, importMode);
            resultCount = res.count;
            imported = true;
          } catch {
            // fallback
          }
        }

        if (!imported) {
          try {
            const res = await HisabStorage.importJSON(text, importMode);
            resultCount = res.count;
          } catch {
            try {
              const res = await HisabStorage.importSQL(text, importMode);
              resultCount = res.count;
            } catch {
              const res = await HisabStorage.importCSV(text, importMode);
              resultCount = res.count;
            }
          }
        }

        await fetchCount();
        onDataRestored();

        setMessage({
          type: 'success',
          text: `সফলভাবে ${resultCount} টি হিসাব ডাটাবেসে রিস্টোর করা হয়েছে!`
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'ফাইল ইমপোর্ট করতে সমস্যা হয়েছে';
        setMessage({ type: 'error', text: errMsg });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setIsImporting(false);
      setMessage({ type: 'error', text: 'ফাইল পড়ার সময় ত্রুটি ঘটেছে' });
    };

    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2.5 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#1B5E20] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-2">
            <Cloud className="text-emerald-300" size={22} />
            <div>
              <h2 className="font-bold text-base leading-tight">ডাটা ব্যাকআপ ও ক্লাউড স্টোরেজ</h2>
              <p className="text-[10px] text-emerald-100 font-medium">গুগল ড্রাইভ অটো ব্যাকআপ ও রিস্টোর</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Database Stats Badge */}
        <div className="bg-emerald-50/80 border-b border-emerald-100 px-4 py-2 flex items-center justify-between text-xs shrink-0">
          <span className="text-emerald-900 font-medium flex items-center space-x-1.5">
            <Database size={14} className="text-emerald-700" />
            <span>ডাটাবেসে মোট হিসাব:</span>
          </span>
          <span className="bg-[#1B5E20] text-white font-bold px-2.5 py-0.5 rounded-full text-xs shadow-2xs">
            {recordCount.toLocaleString('bn-BD')} টি
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 shrink-0 text-center">
          <button
            onClick={() => { setActiveTab('cloud'); setMessage(null); }}
            className={`py-2.5 px-1 text-[11px] font-bold flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1 transition-colors border-b-2 ${
              activeTab === 'cloud'
                ? 'border-[#1B5E20] text-[#1B5E20] bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud size={14} />
            <span className="truncate">১. ক্লাউড</span>
          </button>
          <button
            onClick={() => { setActiveTab('export'); setMessage(null); }}
            className={`py-2.5 px-1 text-[11px] font-bold flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1 transition-colors border-b-2 ${
              activeTab === 'export'
                ? 'border-[#1B5E20] text-[#1B5E20] bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download size={14} />
            <span className="truncate">২. ডাউনলোড</span>
          </button>
          <button
            onClick={() => { setActiveTab('import'); setMessage(null); }}
            className={`py-2.5 px-1 text-[11px] font-bold flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1 transition-colors border-b-2 ${
              activeTab === 'import'
                ? 'border-[#1B5E20] text-[#1B5E20] bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload size={14} />
            <span className="truncate">৩. রিস্টোর</span>
          </button>
          <button
            onClick={() => { setActiveTab('clear'); setMessage(null); }}
            className={`py-2.5 px-1 text-[11px] font-bold flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-1 transition-colors border-b-2 ${
              activeTab === 'clear'
                ? 'border-red-600 text-red-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trash2 size={14} />
            <span className="truncate">৪. মুছুন</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {message && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center space-x-2 animate-fade-in ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-600 shrink-0" />
              )}
              <span className="leading-snug">{message.text}</span>
            </div>
          )}

          {activeTab === 'cloud' ? (
            <div className="space-y-4">
              {/* Google Account Connection Card */}
              <div className="border border-slate-200 rounded-2xl p-3.5 bg-gradient-to-b from-slate-50/80 to-white shadow-xs">
                {currentUser && authToken ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {currentUser.photoURL ? (
                          <img
                            src={currentUser.photoURL}
                            alt="User"
                            className="w-10 h-10 rounded-full border-2 border-emerald-500 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0">
                            {currentUser.displayName?.[0] || 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-800 flex items-center space-x-1 truncate">
                            <span>{currentUser.displayName || 'গুগল ব্যবহারকারী'}</span>
                            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                          <div className="text-[10px] text-emerald-700 font-semibold flex items-center space-x-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>গুগল ড্রাইভ ক্লাউড কানেক্টেড</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleGoogleLogout}
                        className="px-2.5 py-1.5 border border-slate-200 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors shrink-0"
                        title="লগআউট"
                      >
                        <LogOut size={13} />
                        <span className="hidden sm:inline">লগআউট</span>
                      </button>
                    </div>

                    {/* Auto Cloud Backup Switch */}
                    <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200/70 rounded-xl">
                      <div className="space-y-0.5 pr-2">
                        <div className="text-xs font-bold text-emerald-950 flex items-center space-x-1">
                          <Sparkles size={13} className="text-emerald-700" />
                          <span>স্বয়ংক্রিয় ক্লাউড ব্যাকআপ</span>
                        </div>
                        <div className="text-[10px] text-emerald-800">
                          প্রতিটি হিসাব পরিবর্তন বা নতুন এন্ট্রির পর ড্রাইভে অটো সেভ হবে।
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={autoBackup}
                          onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1B5E20]"></div>
                      </label>
                    </div>

                    {/* 1-Click Manual Cloud Backup Button */}
                    <button
                      onClick={handleCreateCloudBackup}
                      disabled={isCloudBackingUp || recordCount === 0}
                      className="w-full bg-[#1B5E20] hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2"
                    >
                      <CloudUpload size={16} />
                      <span>
                        {isCloudBackingUp ? 'ক্লাউডে আপলোড হচ্ছে...' : 'এখনই গুগল ড্রাইভে নতুন ব্যাকআপ সেভ করুন'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2 space-y-3">
                    <div className="w-12 h-12 mx-auto bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center">
                      <Cloud size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-800">গুগল ড্রাইভ ক্লাউড ব্যাকআপ সংযুক্ত করুন</h3>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                        গুগল অ্যাকাউন্ট দিয়ে সাইন ইন করলে আপনার ডাটাবেস সরাসরি গুগল ড্রাইভে সুরক্ষিত থাকবে এবং ফোন হারালেও যেকোনো সময় সব হিসাব রিস্টোর করতে পারবেন।
                      </p>
                    </div>

                    {/* Official Styled Google Sign-In Button */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-300 rounded-xl shadow-xs bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-98 transition-all disabled:opacity-50 cursor-pointer space-x-2.5 mx-auto"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      <span>{isLoggingIn ? 'সাইন ইন হচ্ছে...' : 'Sign in with Google (ক্লাউড ব্যাকআপ)'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Cloud Backups List */}
              {currentUser && authToken && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <HardDrive size={14} className="text-emerald-700" />
                      <span>গুগল ড্রাইভের সংরক্ষিত ব্যাকআপ ফাইলসমূহ ({cloudBackups.length}):</span>
                    </div>
                    <button
                      onClick={() => loadDriveBackupsList()}
                      disabled={isLoadingCloud}
                      className="text-xs text-emerald-800 hover:text-emerald-950 flex items-center space-x-1 font-semibold transition-colors"
                      title="রিফ্রেশ"
                    >
                      <RefreshCw size={12} className={isLoadingCloud ? 'animate-spin' : ''} />
                      <span>রিফ্রেশ</span>
                    </button>
                  </div>

                  {isLoadingCloud && cloudBackups.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                      ক্লাউড ব্যাকআপ লোড হচ্ছে...
                    </div>
                  ) : cloudBackups.length === 0 ? (
                    <div className="text-center py-6 px-4 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <Cloud className="mx-auto text-slate-400" size={24} />
                      <p className="font-semibold text-slate-700">গুগল ড্রাইভে কোনো ব্যাকআপ পাওয়া যায়নি</p>
                      <p className="text-[11px] text-slate-500">উপরে &ldquo;এখনই গুগল ড্রাইভে নতুন ব্যাকআপ সেভ করুন&rdquo; বাটনে চাপুন।</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                      {cloudBackups.map((file) => (
                        <div
                          key={file.id}
                          className="border border-slate-200 rounded-xl p-2.5 bg-white hover:border-emerald-400 transition-all flex items-center justify-between shadow-2xs"
                        >
                          <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                            <div className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                              {file.name}
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                              <span className="flex items-center space-x-1">
                                <Calendar size={10} />
                                <span>{new Date(file.createdTime).toLocaleString('bn-BD')}</span>
                              </span>
                              {file.size && (
                                <span>• {(parseInt(file.size, 10) / 1024).toFixed(1)} KB</span>
                              )}
                            </div>
                            {file.description && (
                              <div className="text-[10px] text-emerald-800 truncate font-medium">
                                {file.description}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              onClick={() => setPendingRestoreFile(file)}
                              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center space-x-1 active:scale-95"
                              title="এই ব্যাকআপটি রিস্টোর করুন"
                            >
                              <CloudDownload size={13} />
                              <span>রিস্টোর</span>
                            </button>
                            <button
                              onClick={() => setPendingDeleteFile(file)}
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="ড্রাইভ থেকে মুছে ফেলুন"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'export' ? (
            <div className="space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                আপনার হিসাবের ডাটা সরাসরি ডিভাইসে নামিয়ে রাখতে নিচের যেকোনো ফরম্যাট বেছে নিন:
              </p>

              {/* JSON Export Card */}
              <div className="border border-slate-200 rounded-xl p-3.5 hover:border-emerald-500 transition-colors bg-white shadow-xs">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                    <FileCode size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-800">JSON ফরম্যাট (প্রস্তাবিত)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      সবচেয়ে দ্রুত, কোনো ডাটা লস হয় না এবং মিলিয়ন্স ডাটার জন্য একদম পারফেক্ট।
                    </div>
                    <button
                      onClick={handleExportJSON}
                      disabled={isExporting || recordCount === 0}
                      className="mt-2.5 w-full bg-[#1B5E20] hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Download size={14} />
                      <span>JSON ব্যাকআপ ডাউনলোড</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* CSV Export Card */}
              <div className="border border-slate-200 rounded-xl p-3.5 hover:border-emerald-500 transition-colors bg-white shadow-xs">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                    <FileSpreadsheet size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-800">CSV / Excel ফরম্যাট</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      MS Excel বা Google Sheets-এ সরাসরি খোলা ও প্রিন্ট করার জন্য উপযুক্ত।
                    </div>
                    <button
                      onClick={handleExportCSV}
                      disabled={isExporting || recordCount === 0}
                      className="mt-2.5 w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Download size={14} />
                      <span>CSV ব্যাকআপ ডাউনলোড</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SQL Export Card */}
              <div className="border border-slate-200 rounded-xl p-3.5 hover:border-emerald-500 transition-colors bg-white shadow-xs">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                    <Database size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-800">SQL / DB ফরম্যাট (Database Dump)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      SQLite, MySQL বা যেকোনো SQL ডাটাবেসে সরাসরি ইমপোর্ট করার জন্য উপযুক্ত।
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2.5">
                      <button
                        onClick={handleExportSQL}
                        disabled={isExporting || recordCount === 0}
                        className="w-full bg-amber-700 hover:bg-amber-800 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1"
                      >
                        <Download size={13} />
                        <span>SQL ফাইল</span>
                      </button>
                      <button
                        onClick={handleExportDB}
                        disabled={isExporting || recordCount === 0}
                        className="w-full bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1"
                      >
                        <Download size={13} />
                        <span>.DB ফাইল</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'import' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                পূর্বের ডাউনলোড করা <b>.json</b>, <b>.csv</b>, <b>.sql</b> অথবা <b>.db</b> ব্যাকআপ ফাইল আপলোড করে ডাটা রিস্টোর করুন।
              </p>

              {/* Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">রিস্টোর পদ্ধতি নির্বাচন করুন:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      importMode === 'append'
                        ? 'border-[#1B5E20] bg-emerald-50/60 text-[#1B5E20] font-bold ring-1 ring-[#1B5E20]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <span className="text-sm">➕</span>
                      <span>নতুন ডাটা যোগ করুন</span>
                    </div>
                    <div className="text-[10px] font-normal text-slate-500 mt-1">
                      বর্তমান ডাটা ঠিক রেখে ফাইলের ডাটা যোগ হবে।
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      importMode === 'replace'
                        ? 'border-amber-600 bg-amber-50/60 text-amber-900 font-bold ring-1 ring-amber-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <span className="text-sm">🔄</span>
                      <span>সব মুছে রিস্টোর</span>
                    </div>
                    <div className="text-[10px] font-normal text-slate-500 mt-1">
                      আগের সব মুছে ফাইলের ডাটা বসবে।
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload Box */}
              <label
                htmlFor="backup-file-upload-input"
                className="border-2 border-dashed border-slate-300 hover:border-[#1B5E20] rounded-2xl p-5 text-center transition-colors bg-slate-50/50 block cursor-pointer active:bg-slate-100"
              >
                <input
                  id="backup-file-upload-input"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="*/*,.json,.csv,.sql,.db,application/json,text/csv,text/plain,application/sql"
                  className="hidden"
                />
                <Upload size={32} className="mx-auto text-emerald-700 mb-2 pointer-events-none" />
                <div className="font-bold text-xs text-slate-800 pointer-events-none">
                  {isImporting ? 'ডাটা প্রসেসিং হচ্ছে...' : 'ফাইল সিলেক্ট করতে ক্লিক করুন'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 pointer-events-none">
                  সহায়ক ফাইল: .json, .csv, .sql, .db
                </div>
                <div
                  className="mt-3 inline-flex items-center justify-center bg-[#1B5E20] hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs pointer-events-none"
                >
                  {isImporting ? 'অপেক্ষা করুন...' : 'ফাইল বাছুন (Browse File)'}
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-900">
                <div className="flex items-center space-x-2 font-bold text-xs text-red-800 mb-1">
                  <Trash2 size={16} className="text-red-600 shrink-0" />
                  <span>সতর্কতা: সব হিসাব চিরতরে মুছে ফেলা</span>
                </div>
                <p className="text-[11px] text-red-700 leading-relaxed">
                  এই অপশনটি ব্যবহার করলে আপনার ডাটাবেসের সমস্ত হিসাব মুছে যাবে। মুছে ফেলার আগে ক্লাউড ব্যাকআপ বা ফাইল ব্যাকআপ নামিয়ে রাখুন।
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  নিশ্চিত করতে নিচে ইংরেজিতে বড় হাতের <code className="text-red-600 bg-red-50 px-1 py-0.5 rounded font-mono">DELETE</code> লিখুন:
                </label>
                <input
                  type="text"
                  value={confirmClearText}
                  onChange={(e) => setConfirmClearText(e.target.value)}
                  placeholder="DELETE লিখুন"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isClearing || confirmClearText.trim() !== 'DELETE' || recordCount === 0}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 mt-2"
                >
                  <Trash2 size={14} />
                  <span>{isClearing ? 'মুছে ফেলা হচ্ছে...' : 'সব হিসাব চিরতরে মুছে দিন'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal for Cloud Restore */}
        {pendingRestoreFile && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-2xs z-60 flex items-center justify-center p-3 animate-fade-in">
            <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl border border-slate-100 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                <CloudDownload size={20} />
                <span>ক্লাউড ব্যাকআপ রিস্টোর নিশ্চিতকরণ</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                আপনি কি <span className="font-bold text-slate-900">{pendingRestoreFile.name}</span> ব্যাকআপ ফাইলটি রিস্টোর করতে চান?
              </p>
              
              <div className="space-y-1 bg-slate-50 p-2 rounded-lg border text-[11px] text-slate-600">
                <div className="font-semibold text-slate-700">পদ্ধতি:</div>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                    />
                    <span>বর্তমান হিসাবের সাথে যোগ করুন</span>
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 cursor-pointer text-amber-900 font-medium">
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                    />
                    <span>আগের সব মুছে নতুন করে বসান</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingRestoreFile(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestoreCloud}
                  className="px-4 py-1.5 text-xs bg-[#1B5E20] hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs flex items-center space-x-1"
                >
                  <CheckCircle size={14} />
                  <span>হ্যাঁ, রিস্টোর করুন</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Cloud Delete */}
        {pendingDeleteFile && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-2xs z-60 flex items-center justify-center p-3 animate-fade-in">
            <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl border border-slate-100 space-y-3">
              <div className="flex items-center space-x-2 text-red-600 font-bold text-sm">
                <Trash2 size={20} />
                <span>ড্রাইভ ব্যাকআপ মুছে ফেলা</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                আপনি কি গুগল ড্রাইভ থেকে <span className="font-bold text-slate-900">{pendingDeleteFile.name}</span> ফাইলটি মুছে ফেলতে চান?
              </p>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingDeleteFile(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCloud}
                  className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-xs flex items-center space-x-1"
                >
                  <Trash2 size={14} />
                  <span>মুছে দিন</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2.5 shrink-0 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 truncate">
            {lastCloudTime
              ? `সর্বশেষ ক্লাউড ব্যাকআপ: ${new Date(lastCloudTime).toLocaleDateString('bn-BD')}`
              : 'ক্লাউড ব্যাকআপ: সক্রিয় নেই'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

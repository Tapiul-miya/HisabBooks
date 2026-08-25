import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Briefcase,
  Tag,
  Calendar,
  Lock,
  FileEdit,
  Clock,
  BarChart2,
  Receipt,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Save,
  RotateCw,
  Layers,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import { VehicleHisab, HisabTypeOption, GroupByMode } from '../types';
import { Utils } from '../util/utils';
import { HisabStorage } from '../data/storage';

interface AddHisabScreenProps {
  itemToEdit?: VehicleHisab | null;
  initialName?: string;
  initialDate?: string;
  initialHisabType?: string;
  initialAddress?: string;
  initialMobile?: string;
  initialWorkDetails?: string;
  groupByMode?: GroupByMode;
  onSave: (entry: Omit<VehicleHisab, 'id'> | VehicleHisab) => void;
  onBack: () => void;
}

const TYPE_OPTIONS: HisabTypeOption[] = [
  { key: 'bigha', labelBn: 'জমির হিসাব (বিঘা)' },
  { key: 'trip', labelBn: 'ট্রিপ হিসাব' },
  { key: 'hour', labelBn: 'ঘণ্টা হিসাব' },
  { key: 'monthly', labelBn: 'মাসিক হিসাব' },
  { key: 'contract', labelBn: 'চুক্তি হিসাব' },
  { key: 'fuel', labelBn: 'ফুয়েল / জ্বালানি' },
  { key: 'rent', labelBn: 'ভাড়া' },
  { key: 'other', labelBn: 'অন্যান্য' }
];

export const AddHisabScreen: React.FC<AddHisabScreenProps> = ({
  itemToEdit,
  initialName = '',
  initialDate = '',
  initialHisabType = '',
  initialAddress = '',
  initialMobile = '',
  initialWorkDetails = '',
  groupByMode,
  onSave,
  onBack
}) => {
  const isEditMode = Boolean(itemToEdit);
  const isByDateWorkMode = groupByMode === GroupByMode.BY_DATE_WORK;

  // In Date filter mode (BY_DATE_WORK):
  // - Type, Date are LOCKED when clicking plus on a group or editing.
  // - Customer Name, Mobile Number, Address, Work Details ('কিসের কাজ লেখেন'), and the 6 work subfields are UNLOCKED!
  // In Grahok/Customer filter mode (non-date modes):
  // - Customer Name, Work Details, and the 6 work subfields (কত শাল, কোন সেশন, ম্যানেজারের নাম, গাড়ির নাম, ড্রাইভার নাম, বেড) are LOCKED when clicking plus on a group card.
  const isTypeFrozen = isEditMode || Boolean(initialHisabType);
  const isDateFrozen = isEditMode || Boolean(initialDate);
  const isWorkDetailsFrozen = isByDateWorkMode ? false : Boolean(initialWorkDetails);
  const isWorkSubFieldsFrozen = isByDateWorkMode ? false : Boolean(initialWorkDetails || isEditMode);
  const isNameFrozen = Boolean(initialName);
  const isMobileFrozen = Boolean(initialMobile);
  const isAddressFrozen = Boolean(initialAddress);

  const currentDateStr = new Date().toISOString().split('T')[0];

  const [selectedOption, setSelectedOption] = useState<HisabTypeOption>(() => {
    const key = itemToEdit?.hisabType || initialHisabType;
    return TYPE_OPTIONS.find(o => o.key === key) || TYPE_OPTIONS[0];
  });

  const initialParsedWork = useMemo(() => {
    const raw = (itemToEdit?.workDetails || initialWorkDetails || '').trim();
    return Utils.parseWorkDetails(raw);
  }, [itemToEdit?.workDetails, initialWorkDetails]);

  const [name, setName] = useState(itemToEdit?.name || initialName);
  const [mobile, setMobile] = useState(itemToEdit?.mobile || initialMobile);
  const [address, setAddress] = useState(itemToEdit?.address || initialAddress);
  const [workDetails, setWorkDetails] = useState(initialParsedWork.work);
  const [year, setYear] = useState(initialParsedWork.year);
  const [session, setSession] = useState(initialParsedWork.session);
  const [managerName, setManagerName] = useState(initialParsedWork.manager);
  const [vehicleName, setVehicleName] = useState(initialParsedWork.vehicle);
  const [driverName, setDriverName] = useState(initialParsedWork.driver);
  const [trolleyBed, setTrolleyBed] = useState(initialParsedWork.trolleyBed);
  const [optional, setOptional] = useState(itemToEdit?.optional || '');

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

  const [allEntries, setAllEntries] = useState<VehicleHisab[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameContainerRef = useRef<HTMLDivElement>(null);

  const [showWorkSuggestions, setShowWorkSuggestions] = useState(false);
  const workContainerRef = useRef<HTMLDivElement>(null);

  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const addressContainerRef = useRef<HTMLDivElement>(null);

  const [showBedSuggestions, setShowBedSuggestions] = useState(false);
  const bedContainerRef = useRef<HTMLDivElement>(null);

  const [showYearSuggestions, setShowYearSuggestions] = useState(false);
  const yearContainerRef = useRef<HTMLDivElement>(null);

  const [showSessionSuggestions, setShowSessionSuggestions] = useState(false);
  const sessionContainerRef = useRef<HTMLDivElement>(null);

  const [showManagerSuggestions, setShowManagerSuggestions] = useState(false);
  const managerContainerRef = useRef<HTMLDivElement>(null);

  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);
  const vehicleContainerRef = useRef<HTMLDivElement>(null);

  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const driverContainerRef = useRef<HTMLDivElement>(null);

  const [showTrolleyBedSuggestions, setShowTrolleyBedSuggestions] = useState(false);
  const trolleyBedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    HisabStorage.getAll().then(data => {
      setAllEntries(data);
    }).catch(err => {
      console.error('Error fetching entries for suggestions:', err);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (nameContainerRef.current && !nameContainerRef.current.contains(target)) {
        setShowSuggestions(false);
      }
      if (workContainerRef.current && !workContainerRef.current.contains(target)) {
        setShowWorkSuggestions(false);
      }
      if (addressContainerRef.current && !addressContainerRef.current.contains(target)) {
        setShowAddressSuggestions(false);
      }
      if (bedContainerRef.current && !bedContainerRef.current.contains(target)) {
        setShowBedSuggestions(false);
      }
      if (yearContainerRef.current && !yearContainerRef.current.contains(target)) {
        setShowYearSuggestions(false);
      }
      if (sessionContainerRef.current && !sessionContainerRef.current.contains(target)) {
        setShowSessionSuggestions(false);
      }
      if (managerContainerRef.current && !managerContainerRef.current.contains(target)) {
        setShowManagerSuggestions(false);
      }
      if (vehicleContainerRef.current && !vehicleContainerRef.current.contains(target)) {
        setShowVehicleSuggestions(false);
      }
      if (driverContainerRef.current && !driverContainerRef.current.contains(target)) {
        setShowDriverSuggestions(false);
      }
      if (trolleyBedContainerRef.current && !trolleyBedContainerRef.current.contains(target)) {
        setShowTrolleyBedSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const getHisabTypeLabel = (key: string) => {
    const found = TYPE_OPTIONS.find(o => o.key === key);
    return found ? found.labelBn : key;
  };

  const suggestions = useMemo(() => {
    if (!allEntries.length) return [];
    const query = name.trim().toLowerCase();

    // Deduplicate profiles by name + hisabType + mobile + address + workDetails
    const map = new Map<string, VehicleHisab>();
    for (const item of allEntries) {
      if (!item.name || !item.name.trim()) continue;
      const key = `${item.name.trim().toLowerCase()}_${item.hisabType}_${(item.mobile || '').trim()}_${(item.address || '').trim()}_${(item.workDetails || '').trim()}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    }

    const uniqueList = Array.from(map.values());

    if (!query) {
      return uniqueList.slice(0, 6);
    }

    return uniqueList.filter(item => {
      const matchName = item.name.toLowerCase().includes(query);
      const matchMobile = (item.mobile || '').toLowerCase().includes(query);
      const matchAddress = (item.address || '').toLowerCase().includes(query);
      const matchWork = (item.workDetails || '').toLowerCase().includes(query);
      return matchName || matchMobile || matchAddress || matchWork;
    }).slice(0, 8);
  }, [allEntries, name]);

  const workDetailsSuggestions = useMemo(() => {
    if (!allEntries.length) return [];
    const query = workDetails.trim().toLowerCase();

    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails && item.workDetails.trim()) {
        set.add(item.workDetails.trim());
      }
    }

    const uniqueList = Array.from(set);
    if (!query) return uniqueList.slice(0, 6);

    return uniqueList.filter(w => w.toLowerCase().includes(query)).slice(0, 8);
  }, [allEntries, workDetails]);

  const addressSuggestions = useMemo(() => {
    if (!allEntries.length) return [];
    const query = address.trim().toLowerCase();

    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.address && item.address.trim()) {
        set.add(item.address.trim());
      }
    }

    const uniqueList = Array.from(set);
    if (!query) return uniqueList.slice(0, 6);

    return uniqueList.filter(a => a.toLowerCase().includes(query)).slice(0, 8);
  }, [allEntries, address]);

  const bedSuggestions = useMemo(() => {
    if (!allEntries.length) return [];
    const query = optional.trim().toLowerCase();

    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.optional && item.optional.trim()) {
        set.add(item.optional.trim());
      }
    }

    const uniqueList = Array.from(set);
    if (!query) return uniqueList.slice(0, 6);

    return uniqueList.filter(b => b.toLowerCase().includes(query)).slice(0, 8);
  }, [allEntries, optional]);

  const yearSuggestions = useMemo(() => {
    const query = year.trim().toLowerCase();
    if (!query) return [];
    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails && item.workDetails.includes('|')) {
        const parts = item.workDetails.split('|').map(p => p.trim());
        if (parts[1]) set.add(parts[1]);
      }
    }
    const list = Array.from(set).filter(Boolean);
    return list.filter(y => y.toLowerCase().includes(query)).slice(0, 8);
  }, [allEntries, year]);

  const sessionSuggestions = useMemo(() => {
    const query = session.trim().toLowerCase();
    if (!query) return [];
    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails && item.workDetails.includes('|')) {
        const parts = item.workDetails.split('|').map(p => p.trim());
        if (parts[2]) set.add(parts[2]);
      }
    }
    const list = Array.from(set).filter(Boolean);
    return list.filter(s => s.toLowerCase().includes(query)).slice(0, 8);
  }, [allEntries, session]);

  const managerSuggestions = useMemo(() => {
    const query = managerName.trim().toLowerCase();
    if (!query) return [];
    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails && item.workDetails.includes('|')) {
        const parts = item.workDetails.split('|').map(p => p.trim());
        if (parts[3]) set.add(parts[3]);
      }
    }
    const list = Array.from(set).filter(Boolean);
    return list.filter(m => m.toLowerCase().includes(query)).slice(0, 8);
  }, [allEntries, managerName]);

  const vehicleSuggestions = useMemo(() => {
    const query = vehicleName.trim().toLowerCase();
    if (!query) return [];
    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails && item.workDetails.includes('|')) {
        const parts = item.workDetails.split('|').map(p => p.trim());
        if (parts[4]) set.add(parts[4]);
      }
    }
    const list = Array.from(set).filter(Boolean);
    return list.filter(v => v.toLowerCase().includes(query)).slice(0, 8);
  }, [allEntries, vehicleName]);

  const driverSuggestions = useMemo(() => {
    const query = driverName.trim().toLowerCase();
    if (!query) return [];
    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails && item.workDetails.includes('|')) {
        const parts = item.workDetails.split('|').map(p => p.trim());
        if (parts[5]) set.add(parts[5]);
      }
    }
    const list = Array.from(set).filter(Boolean);
    return list.filter(d => d.toLowerCase().includes(query)).slice(0, 8);
  }, [allEntries, driverName]);

  const trolleyBedSuggestions = useMemo(() => {
    const query = trolleyBed.trim().toLowerCase();
    if (!query) return [];
    const set = new Set<string>();
    for (const item of allEntries) {
      if (item.workDetails && item.workDetails.includes('|')) {
        const parts = item.workDetails.split('|').map(p => p.trim());
        if (parts[6]) set.add(parts[6]);
      }
    }
    const list = Array.from(set).filter(Boolean);
    return list.filter(b => b.toLowerCase().includes(query)).slice(0, 8);
  }, [allEntries, trolleyBed]);

  const handleSelectSuggestion = (item: VehicleHisab) => {
    if (item.name) setName(item.name);

    if (item.hisabType && !isTypeFrozen) {
      const matchedOpt = TYPE_OPTIONS.find(o => o.key === item.hisabType);
      if (matchedOpt) {
        setSelectedOption(matchedOpt);
      }
    }

    if (!isWorkDetailsFrozen && item.workDetails !== undefined) {
      setWorkDetails(item.workDetails || '');
    }

    if (!isMobileFrozen && item.mobile !== undefined) {
      setMobile(item.mobile || '');
    }

    if (!isAddressFrozen && item.address !== undefined) {
      setAddress(item.address || '');
    }

    setShowSuggestions(false);
  };

  const handleSelectWorkSuggestion = (val: string) => {
    if (val.includes('|')) {
      const parts = val.split('|').map(p => p.trim());
      setWorkDetails(parts[0] || '');
      setYear(parts[1] || '');
      setSession(parts[2] || '');
      setManagerName(parts[3] || '');
      setVehicleName(parts[4] || '');
      setDriverName(parts[5] || '');
      setTrolleyBed(parts[6] || '');
    } else {
      setWorkDetails(val);
    }
    setShowWorkSuggestions(false);
  };

  const handleSelectAddressSuggestion = (val: string) => {
    setAddress(val);
    setShowAddressSuggestions(false);
  };

  const handleSelectBedSuggestion = (val: string) => {
    setOptional(val);
    setShowBedSuggestions(false);
  };

  const [date, setDate] = useState(() => {
    if (itemToEdit?.date) return itemToEdit.date;
    if (initialDate) return initialDate;
    return currentDateStr;
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  const isDateValid = useMemo(() => {
    return Utils.isValidDate(date);
  }, [date]);

  const [stm, setStm] = useState(() => {
    if (itemToEdit?.stm) return itemToEdit.stm;
    if (itemToEdit?.qty && itemToEdit.qty !== 0) return String(itemToEdit.qty);
    return '';
  });

  const [rateText, setRateText] = useState(() => {
    if (itemToEdit?.rate !== undefined && itemToEdit?.rate !== null && itemToEdit.rate !== 0) {
      return String(itemToEdit.rate);
    }
    return '';
  });

  const [billStm, setBillStm] = useState(itemToEdit?.billStm || '');
  const [paidStm, setPaidStm] = useState(() => {
    if (itemToEdit?.paidStm) return itemToEdit.paidStm;
    if (itemToEdit?.paid && itemToEdit.paid !== 0) return String(itemToEdit.paid);
    return '';
  });

  // 6 Additional financial fields (STM inputs are editable, calculated amounts are read-only)
  const [spendStm, setSpendStm] = useState(itemToEdit?.spendStm || '');
  const [cashoutStm, setCashoutStm] = useState(itemToEdit?.cashoutStm || '');

  // Real-time calculation engine
  const calculation = useMemo(() => {
    return Utils.recalculateHisab(
      stm,
      rateText,
      billStm,
      paidStm,
      selectedOption.key
    );
  }, [stm, rateText, billStm, paidStm, selectedOption.key]);

  const { qty, amount, bill, paid, due, unit, details } = calculation;
  const currentTypeKey = selectedOption.key;
  const hasJoinEndDate = useMemo(() => Utils.hasJoinEndDateBlocks(stm), [stm]);

  // Read-only calculated values for spend, profit, cashout, credit
  const spend = useMemo(() => {
    if (spendStm.trim()) {
      const val = Utils.calculateFromString(spendStm);
      return isNaN(val) ? 0 : val;
    }
    return itemToEdit?.spend || 0;
  }, [spendStm, itemToEdit?.spend]);

  const cashout = useMemo(() => {
    if (cashoutStm.trim()) {
      const val = Utils.calculateFromString(cashoutStm);
      return isNaN(val) ? 0 : val;
    }
    return itemToEdit?.cashout || 0;
  }, [cashoutStm, itemToEdit?.cashout]);

  const profit = useMemo(() => {
    const revenue = bill > 0 ? bill : amount;
    return revenue - spend;
  }, [bill, amount, spend]);

  const credit = useMemo(() => {
    return paid - cashout;
  }, [paid, cashout]);

  const [showExtraFields, setShowExtraFields] = useState(false);

  // Dynamic labels
  const stmLabel = useMemo(() => {
    switch (currentTypeKey) {
      case 'bigha':
        return 'জমির তথ্য/নোট (যেমন: 10+5)';
      case 'hour':
        return 'সময়সূচী (যেমন: start10:00am stop01:00pm)';
      case 'trip':
        return 'ট্রিপ হিসাব (যেমন: 1+2+1)';
      case 'fuel':
        return 'জ্বালানির পরিমাণ (লিটার / গ্যালন)';
      case 'monthly':
        return 'মাসের বিবরণ যেমন (2025-02-23 to 2027-03-25)';
      case 'contract':
        return 'চুক্তির বিবরণ';
      case 'rent':
        return 'ভাড়ার বিবরণ';
      default:
        return 'বিবরণ / নোট (STM)';
    }
  }, [currentTypeKey]);

  const qtyDisplayLabel = useMemo(() => {
    if (hasJoinEndDate) {
      return `মোট দিন: ${qty}`;
    }
    switch (currentTypeKey) {
      case 'bigha':
        return `কাঠা: ${qty}`;
      case 'hour':
        return `মোট মিনিট: ${Math.round(qty)}`;
      case 'trip':
        return `মোট ট্রিপ: ${qty}`;
      case 'monthly':
        return `মোট মাস: ${qty}`;
      case 'fuel':
        return `মোট পরিমাণ: ${qty}`;
      default:
        return `পরিমাণ: ${qty}`;
    }
  }, [currentTypeKey, qty, hasJoinEndDate]);

  const unitDisplayLabel = useMemo(() => {
    if (hasJoinEndDate) {
      return `মেয়াদ: ${unit}`;
    }
    switch (currentTypeKey) {
      case 'bigha':
        return `বিঘা: ${unit}`;
      case 'hour':
        return `সময়: ${unit}`;
      case 'trip':
        return `ট্রিপ: ${unit}`;
      case 'monthly':
        return `মাস: ${unit}`;
      default:
        return `একক: ${unit}`;
    }
  }, [currentTypeKey, unit, hasJoinEndDate]);

  const rateLabel = useMemo(() => {
    switch (currentTypeKey) {
      case 'bigha':
        return 'বিঘা প্রতি দর (৳)';
      case 'hour':
        return 'ঘণ্টা প্রতি দর (৳)';
      case 'trip':
        return 'ট্রিপ প্রতি দর (৳)';
      case 'monthly':
        return 'মাসিক দর / বেতন (৳)';
      case 'contract':
        return 'চুক্তি মূল্য / দর (৳)';
      case 'fuel':
        return 'প্রতি ইউনিট/লিটার দর (৳)';
      case 'rent':
        return 'ভাড়ার হার (৳)';
      default:
        return 'দর / রেট (৳)';
    }
  }, [currentTypeKey]);

  const formTitle = useMemo(() => {
    if (isEditMode) return 'হিসাব সংশোধন করুন';
    if (isNameFrozen && name.trim()) return `‘${name}’ নামে কাজ যোগ করুন`;
    if (isDateFrozen && date.trim()) return `${date} তারিখে কাজ যোগ করুন`;
    return 'নতুন হিসাব যোগ করুন';
  }, [isEditMode, isNameFrozen, name, isDateFrozen, date]);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isDateValid) {
      setSubmitError('অনুগ্রহ করে সঠিক YYYY-MM-DD ফরম্যাটে তারিখ লিখুন (যেমন: 2026-07-29)');
      return;
    }
    setSubmitError(null);

    const entryData = {
      ...(itemToEdit?.id ? { id: itemToEdit.id } : {}),
      name,
      mobile,
      address,
      hisabType: selectedOption.key,
      workDetails: concatenatedWorkDetails,
      date: date.trim(),
      stm,
      qty,
      unit,
      rate: parseFloat(rateText.replace(/,/g, '')) || 0,
      amount,
      billStm,
      bill,
      paidStm,
      paid,
      due,
      spendStm,
      spend,
      profit,
      cashoutStm,
      cashout,
      credit,
      optional
    };

    onSave(entryData as VehicleHisab);
  };

  return (
    <div className="min-h-screen bg-[#E1E8EF] pb-12 max-w-lg mx-auto shadow-xl relative flex flex-col">
      {/* Top Bar */}
      <header className="bg-[#1B5E20] text-white px-4 py-3 shadow-md sticky top-0 z-30 flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
          title="পিছনে যান"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold tracking-wide">{formTitle}</h1>
      </header>

      <form onSubmit={handleSaveSubmit} className="p-4 space-y-4 flex-1">
        {/* Card 1: Customer Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#BBDEFB] space-y-3.5">
          <div className="flex items-center space-x-2.5 pb-1">
            <div className="w-8 h-8 rounded-full bg-blue-100/70 flex items-center justify-center text-[#1565C0]">
              <User size={18} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">গ্রাহকের তথ্য</h2>
          </div>

          {/* Hisab Type Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>হিসাবের ধরন</span>
              {isTypeFrozen && <Lock size={13} className="text-slate-400" />}
            </label>
            <div className="relative">
              <select
                disabled={isTypeFrozen}
                value={selectedOption.key}
                onChange={(e) => {
                  const opt = TYPE_OPTIONS.find(o => o.key === e.target.value);
                  if (opt) setSelectedOption(opt);
                }}
                className={`w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1565C0] focus:ring-1 focus:ring-[#1565C0] appearance-none ${
                  isTypeFrozen ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                }`}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.labelBn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Work Details */}
          <div className="space-y-1 relative" ref={workContainerRef}>
            <label className="text-xs font-medium text-slate-600 flex items-center justify-between">
              <span>কিসের কাজ লেখেন</span>
              {isWorkDetailsFrozen && <Lock size={13} className="text-slate-400" />}
            </label>
            <div className="relative flex items-center">
              <Briefcase size={16} className="absolute left-3 text-[#1565C0]" />
              <input
                type="text"
                disabled={isWorkDetailsFrozen}
                value={workDetails}
                onFocus={() => setShowWorkSuggestions(true)}
                onChange={(e) => {
                  setWorkDetails(e.target.value);
                  setShowWorkSuggestions(true);
                }}
                placeholder="যেমন: মাটি কাটা / বালু পরিবহন"
                className={`w-full bg-[#F8FAFC] border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#1565C0] ${
                  isWorkDetailsFrozen ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed font-medium' : ''
                }`}
              />
            </div>

            {/* Work Details Suggestions Dropdown */}
            {!isWorkDetailsFrozen && showWorkSuggestions && workDetailsSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-blue-200 z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-blue-50/80 text-[11px] font-bold text-blue-900 flex items-center justify-between border-b border-blue-100 sticky top-0 z-10 backdrop-blur-sm">
                  <span>পূর্বের কাজের তালিকা ({workDetailsSuggestions.length})</span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowWorkSuggestions(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
                {workDetailsSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectWorkSuggestion(item);
                    }}
                    className="p-2.5 hover:bg-blue-50/70 active:bg-blue-100 cursor-pointer transition-colors flex items-center gap-2 text-sm text-slate-800 font-medium"
                  >
                    <Briefcase size={14} className="text-[#1565C0] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Sub-fields for Work Concatenation */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              {/* কত শাল */}
              <div className="space-y-1 relative" ref={yearContainerRef}>
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-[#1565C0]" />
                    <span>কত শাল</span>
                  </span>
                  {isWorkSubFieldsFrozen && <Lock size={11} className="text-slate-400" />}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    disabled={isWorkSubFieldsFrozen}
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      setShowYearSuggestions(true);
                    }}
                    onFocus={() => setShowYearSuggestions(true)}
                    placeholder="যেমন: ২০২৪"
                    className={`w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1565C0] ${
                      isWorkSubFieldsFrozen ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed font-medium' : ''
                    }`}
                  />
                </div>
                {!isWorkSubFieldsFrozen && showYearSuggestions && yearSuggestions.length > 0 && (
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
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Layers size={12} className="text-[#1565C0]" />
                    <span>কোন সেশন</span>
                  </span>
                  {isWorkSubFieldsFrozen && <Lock size={11} className="text-slate-400" />}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    disabled={isWorkSubFieldsFrozen}
                    value={session}
                    onChange={(e) => {
                      setSession(e.target.value);
                      setShowSessionSuggestions(true);
                    }}
                    onFocus={() => setShowSessionSuggestions(true)}
                    placeholder="যেমন: রবি / খরিপ"
                    className={`w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1565C0] ${
                      isWorkSubFieldsFrozen ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed font-medium' : ''
                    }`}
                  />
                </div>
                {!isWorkSubFieldsFrozen && showSessionSuggestions && sessionSuggestions.length > 0 && (
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
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <User size={12} className="text-[#1565C0]" />
                    <span>ম্যানেজারের নাম</span>
                  </span>
                  {isWorkSubFieldsFrozen && <Lock size={11} className="text-slate-400" />}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    disabled={isWorkSubFieldsFrozen}
                    value={managerName}
                    onChange={(e) => {
                      setManagerName(e.target.value);
                      setShowManagerSuggestions(true);
                    }}
                    onFocus={() => setShowManagerSuggestions(true)}
                    placeholder="যেমন: আব্দুর রহিম"
                    className={`w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1565C0] ${
                      isWorkSubFieldsFrozen ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed font-medium' : ''
                    }`}
                  />
                </div>
                {!isWorkSubFieldsFrozen && showManagerSuggestions && managerSuggestions.length > 0 && (
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
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Tag size={12} className="text-[#1565C0]" />
                    <span>গাড়ির নাম</span>
                  </span>
                  {isWorkSubFieldsFrozen && <Lock size={11} className="text-slate-400" />}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    disabled={isWorkSubFieldsFrozen}
                    value={vehicleName}
                    onChange={(e) => {
                      setVehicleName(e.target.value);
                      setShowVehicleSuggestions(true);
                    }}
                    onFocus={() => setShowVehicleSuggestions(true)}
                    placeholder="যেমন: ট্রাফি / ট্রাক"
                    className={`w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1565C0] ${
                      isWorkSubFieldsFrozen ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed font-medium' : ''
                    }`}
                  />
                </div>
                {!isWorkSubFieldsFrozen && showVehicleSuggestions && vehicleSuggestions.length > 0 && (
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

              {/* ড্রাইভার নাম */}
              <div className="space-y-1 relative" ref={driverContainerRef}>
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <User size={12} className="text-[#1565C0]" />
                    <span>ড্রাইভার নাম</span>
                  </span>
                  {isWorkSubFieldsFrozen && <Lock size={11} className="text-slate-400" />}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    disabled={isWorkSubFieldsFrozen}
                    value={driverName}
                    onChange={(e) => {
                      setDriverName(e.target.value);
                      setShowDriverSuggestions(true);
                    }}
                    onFocus={() => setShowDriverSuggestions(true)}
                    placeholder="যেমন: ড্রাইভারের নাম"
                    className={`w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1565C0] ${
                      isWorkSubFieldsFrozen ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed font-medium' : ''
                    }`}
                  />
                </div>
                {!isWorkSubFieldsFrozen && showDriverSuggestions && driverSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-100">
                    {driverSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setDriverName(item);
                          setShowDriverSuggestions(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-blue-50 active:bg-blue-100 flex items-center justify-between transition-colors"
                      >
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* বেড */}
              <div className="space-y-1 relative" ref={trolleyBedContainerRef}>
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Briefcase size={12} className="text-[#1565C0]" />
                    <span>বেড</span>
                  </span>
                  {isWorkSubFieldsFrozen && <Lock size={11} className="text-slate-400" />}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    disabled={isWorkSubFieldsFrozen}
                    value={trolleyBed}
                    onChange={(e) => {
                      setTrolleyBed(e.target.value);
                      setShowTrolleyBedSuggestions(true);
                    }}
                    onFocus={() => setShowTrolleyBedSuggestions(true)}
                    placeholder="যেমন: বেড সাইজ / তথ্য"
                    className={`w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1565C0] ${
                      isWorkSubFieldsFrozen ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed font-medium' : ''
                    }`}
                  />
                </div>
                {!isWorkSubFieldsFrozen && showTrolleyBedSuggestions && trolleyBedSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-100">
                    {trolleyBedSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setTrolleyBed(item);
                          setShowTrolleyBedSuggestions(false);
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
            <div className="pt-1 border-t border-slate-200/60">
              <div className="text-[11px] font-bold text-blue-900 mb-1 flex items-center justify-between">
                <span>একত্রিত কাজের বিবরণী (Work Details Preview):</span>
                <span className="text-[10px] text-slate-400 font-normal">‘|’ চিহ্ন দ্বারা যুক্ত</span>
              </div>
              <div className="p-2.5 bg-blue-50/90 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 break-words min-h-[38px] flex items-center">
                {concatenatedWorkDetails || (
                  <span className="text-slate-400 font-normal italic">
                    ইনপুট লেখার সাথে সাথে সব তথ্য এখানে যুক্ত হয়ে প্রদর্শিত হবে
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer Name */}
          <div className="space-y-1 relative" ref={nameContainerRef}>
            <label className="text-xs font-medium text-slate-600 flex items-center justify-between">
              <span>গ্রাহকের নাম</span>
              {isNameFrozen && <Lock size={13} className="text-slate-400" />}
            </label>
            <div className="relative flex items-center">
              <User size={16} className="absolute left-3 text-[#1565C0]" />
              <input
                type="text"
                disabled={isNameFrozen}
                value={name}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setName(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="যেমন: আব্দুর রহিম"
                className={`w-full bg-[#F8FAFC] border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#1565C0] ${
                  isNameFrozen ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed font-medium' : ''
                }`}
              />
            </div>

            {/* Suggestions Dropdown */}
            {!isNameFrozen && showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-blue-200 z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-blue-50/80 text-[11px] font-bold text-blue-900 flex items-center justify-between border-b border-blue-100 sticky top-0 z-10 backdrop-blur-sm">
                  <span>পূর্বের তথ্য থেকে বাছুন ({suggestions.length})</span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowSuggestions(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
                {suggestions.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(item);
                    }}
                    className="p-2.5 hover:bg-blue-50/70 active:bg-blue-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 truncate">
                        <User size={14} className="text-[#1565C0] shrink-0" />
                        {item.name}
                      </span>
                      <span className="text-[10px] font-semibold text-[#00796B] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 shrink-0">
                        {getHisabTypeLabel(item.hisabType)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                      {item.workDetails && (
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Briefcase size={12} className="text-blue-500 shrink-0" />
                          {item.workDetails}
                        </span>
                      )}
                      {item.mobile && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          {item.mobile}
                        </span>
                      )}
                      {item.address && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          {item.address}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 flex items-center justify-between">
              <span>মোবাইল নম্বর</span>
              {isMobileFrozen && <Lock size={13} className="text-slate-400" />}
            </label>
            <div className="relative flex items-center">
              <Phone size={16} className="absolute left-3 text-[#1565C0]" />
              <input
                type="tel"
                disabled={isMobileFrozen}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="০১৭XXXXXXXX"
                className={`w-full bg-[#F8FAFC] border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#1565C0] ${
                  isMobileFrozen ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed font-medium' : ''
                }`}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1 relative" ref={addressContainerRef}>
            <label className="text-xs font-medium text-slate-600 flex items-center justify-between">
              <span>ঠিকানা</span>
              {isAddressFrozen && <Lock size={13} className="text-slate-400" />}
            </label>
            <div className="relative flex items-center">
              <MapPin size={16} className="absolute left-3 text-[#1565C0]" />
              <input
                type="text"
                disabled={isAddressFrozen}
                value={address}
                onFocus={() => setShowAddressSuggestions(true)}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setShowAddressSuggestions(true);
                }}
                placeholder="ঠিকানা..."
                className={`w-full bg-[#F8FAFC] border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#1565C0] ${
                  isAddressFrozen ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed font-medium' : ''
                }`}
              />
            </div>

            {/* Address Suggestions Dropdown */}
            {!isAddressFrozen && showAddressSuggestions && addressSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-blue-200 z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-blue-50/80 text-[11px] font-bold text-blue-900 flex items-center justify-between border-b border-blue-100 sticky top-0 z-10 backdrop-blur-sm">
                  <span>পূর্বের ঠিকানার তালিকা ({addressSuggestions.length})</span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowAddressSuggestions(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
                {addressSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectAddressSuggestion(item);
                    }}
                    className="p-2.5 hover:bg-blue-50/70 active:bg-blue-100 cursor-pointer transition-colors flex items-center gap-2 text-sm text-slate-800 font-medium"
                  >
                    <MapPin size={14} className="text-[#1565C0] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Hisab Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#B2DFDB] space-y-3.5">
          <div className="flex items-center space-x-2.5 pb-1">
            <div className="w-8 h-8 rounded-full bg-teal-100/70 flex items-center justify-center text-[#00796B]">
              <FileEdit size={18} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">হিসাবের বিবরণ</h2>
          </div>

          {/* Date Input */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 flex items-center justify-between">
              <span>তারিখ (YYYY-MM-DD)</span>
              {isDateFrozen && <Lock size={13} className="text-slate-400" />}
            </label>
            <div className="relative flex items-center">
              <button
                type="button"
                disabled={isDateFrozen}
                onClick={() => {
                  setDate(currentDateStr);
                  setSubmitError(null);
                }}
                className="absolute left-2.5 p-1 text-[#00796B] hover:bg-teal-100 rounded-md transition-colors"
                title="আজকের তারিখ সেট করতে ক্লিক করুন"
              >
                <Calendar size={18} />
              </button>
              <input
                type="text"
                disabled={isDateFrozen}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSubmitError(null);
                }}
                placeholder="2026-07-29"
                className={`w-full bg-[#F8FAFC] border rounded-xl pl-10 pr-16 py-2.5 text-sm font-medium text-slate-800 focus:outline-none transition-colors ${
                  !isDateValid
                    ? 'border-amber-500 bg-amber-50/20 focus:border-amber-600'
                    : 'border-slate-300 focus:border-[#00796B] focus:ring-1 focus:ring-[#00796B]'
                } ${isDateFrozen ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
              />
              <button
                type="button"
                disabled={isDateFrozen}
                onClick={() => {
                  setDate(currentDateStr);
                  setSubmitError(null);
                }}
                className="absolute right-2 px-2.5 py-1 text-xs font-bold text-[#00796B] bg-teal-50 hover:bg-teal-100 active:bg-teal-200 rounded-lg transition-colors border border-teal-200"
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

          {/* STM / Duration / Qty input */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">{stmLabel}</label>
            <textarea
              id="input-main-stm"
              rows={3}
              value={stm}
              onChange={(e) => setStm(e.target.value)}
              placeholder={
                currentTypeKey === 'hour'
                  ? 'start10:00am stop01:00pm'
                  : currentTypeKey === 'bigha'
                  ? '10+15'
                  : currentTypeKey === 'monthly'
                  ? 'Gg(2023-05-23 to 2025-05-23)+Gg(...)'
                  : '1+2+1'
              }
              className={`w-full bg-[#F8FAFC] border rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none transition-colors resize-y min-h-[72px] ${
                calculation.errorMessage
                  ? 'border-red-400 focus:border-red-500 bg-red-50/40 text-red-900'
                  : 'border-slate-300 focus:border-[#00796B]'
              }`}
            />
          </div>

          {/* Red Warning Banner if error */}
          {calculation.errorMessage && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex items-start space-x-2 text-red-700 text-xs mt-1">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{calculation.errorMessage}</span>
            </div>
          )}

          {/* Session Breakdown for Hour or Join/End Date type */}
          {(currentTypeKey === 'hour' || hasJoinEndDate) && details && (
            <div className="bg-teal-50/50 border border-[#00796B] rounded-xl p-3 relative mt-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[#00796B] mb-1">
                {currentTypeKey === 'hour' ? <Clock size={14} /> : <Calendar size={14} />}
                <span>মেয়াদের বিস্তারিত (Details)</span>
              </div>
              <div className="text-xs font-extrabold text-[#00695C]">
                {details}
              </div>
            </div>
          )}

          {/* Calculated Qty & Unit Badge */}
          <div className="bg-[#E0F2F1] rounded-xl p-3 border border-[#80CBC4] flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[#004D40] text-xs font-bold">
              <BarChart2 size={18} className="text-[#00796B]" />
              <span>{qtyDisplayLabel}</span>
            </div>
            <span className="bg-white border border-[#00796B] text-[#00796B] text-xs font-extrabold px-2.5 py-1 rounded-lg">
              {unitDisplayLabel}
            </span>
          </div>
        </div>

        {/* Card 3: Bill & Payment Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E1BEE7] space-y-3.5">
          <div className="flex items-center space-x-2.5 pb-1">
            <div className="w-8 h-8 rounded-full bg-purple-100/70 flex items-center justify-center text-[#6A1B9A]">
              <Receipt size={18} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">বিল ও পেমেন্ট বিবরণী</h2>
          </div>

          {/* Rate */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">{rateLabel}</label>
            <div className="relative flex items-center">
              <CreditCard size={16} className="absolute left-3 text-[#6A1B9A]" />
              <input
                type="number"
                step="any"
                value={rateText}
                onChange={(e) => setRateText(e.target.value)}
                placeholder="০.০০"
                className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#6A1B9A]"
              />
            </div>
          </div>

          {/* Additional Bill */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">অতিরিক্ত বিলের তথ্য (STM)</label>
            <textarea
              id="input-bill-stm"
              rows={3}
              value={billStm}
              onChange={(e) => setBillStm(e.target.value)}
              placeholder="যেমন: ১০০+৫০"
              className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#6A1B9A] resize-y min-h-[70px]"
            />
          </div>

          {/* Paid Amount */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">টাকা পরিশোধের বিবরণ (STM)</label>
            <textarea
              id="input-paid-stm"
              rows={3}
              value={paidStm}
              onChange={(e) => setPaidStm(e.target.value)}
              placeholder="যেমন: ৫০০+২০০"
              className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#2E7D32] resize-y min-h-[70px]"
            />
          </div>

          <div className="border-t border-purple-100 my-2"></div>

          {/* Financial Breakdown Table */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between items-center">
              <span>হিসাবকৃত টাকা:</span>
              <span className="font-bold text-slate-800">৳ {Utils.toCleanString(amount)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-sm">
              <span>মোট বিল:</span>
              <span className="text-[#1565C0]">৳ {Utils.toCleanString(bill)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-sm">
              <span>পরিশোধিত টাকা:</span>
              <span className="text-[#2E7D32]">৳ {Utils.toCleanString(paid)}</span>
            </div>
          </div>

          {/* Final Due Surface */}
          <div
            id="final-due-surface"
            className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
              due > 0
                ? 'bg-[#FFFFEBEE] border-red-300 text-[#C62828]'
                : 'bg-[#E8F5E9] border-emerald-300 text-[#2E7D32]'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold text-sm">
              {due > 0 ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              <span>সর্বমোট বকেয়া:</span>
            </div>
            <span className="text-base font-extrabold">
              ৳ {Utils.toCleanString(due)}
            </span>
          </div>

          {/* Show / Hide Toggle Button for Additional 6 Financial Columns */}
          <div className="pt-1.5">
            <button
              type="button"
              id="toggle-extra-fields-btn"
              onClick={() => setShowExtraFields(prev => !prev)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
            >
              <div className="flex items-center space-x-2">
                <SlidersHorizontal size={15} className="text-[#0D47A1] shrink-0" />
                <span>অন্যান্য হিসাব (খরচ, লাভ, ক্যাশআউট, ক্রেডিট)</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-500 font-semibold">
                <span>{showExtraFields ? 'লুকান' : 'দেখান'}</span>
                {showExtraFields ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {/* Expandable 6 Column Input Fields */}
            {showExtraFields && (
              <div
                id="extra-financial-fields"
                className="mt-3 p-3.5 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3.5 shadow-xs transition-all duration-200"
              >
                {/* 1. Spend Section: STM (editable) & Spend Amount (readonly) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      খরচের বিবরণ (spendStm)
                    </label>
                    <textarea
                      id="input-spend-stm"
                      rows={3}
                      value={spendStm}
                      onChange={(e) => setSpendStm(e.target.value)}
                      placeholder="যেমন: ২০০+১০০"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#00796B] resize-y min-h-[70px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">
                        খরচ / Spend (৳)
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">(স্বয়ংক্রিয়)</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      id="input-spend-amount"
                      value={`৳ ${Utils.toCleanString(spend)}`}
                      className="w-full bg-slate-100/90 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                {/* 2. Profit Section (readonly) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      লাভ / Profit (৳)
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">(মোট বিল - খরচ)</span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    id="input-profit-amount"
                    value={`৳ ${Utils.toCleanString(profit)}`}
                    className="w-full bg-slate-100/90 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-emerald-800 cursor-not-allowed select-none"
                  />
                </div>

                {/* 3. Cashout Section: STM (editable) & Cashout Amount (readonly) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      ক্যাশআউট বিবরণ (cashoutStm)
                    </label>
                    <textarea
                      id="input-cashout-stm"
                      rows={3}
                      value={cashoutStm}
                      onChange={(e) => setCashoutStm(e.target.value)}
                      placeholder="যেমন: ১০০০+৫০০"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#00796B] resize-y min-h-[70px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">
                        ক্যাশআউট / Cashout (৳)
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">(স্বয়ংক্রিয়)</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      id="input-cashout-amount"
                      value={`৳ ${Utils.toCleanString(cashout)}`}
                      className="w-full bg-slate-100/90 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                {/* 4. Credit Section (readonly) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      ক্রেডিট / Credit (৳)
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">(জমা - ক্যাশআউট)</span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    id="input-credit-amount"
                    value={`৳ ${Utils.toCleanString(credit)}`}
                    className="w-full bg-slate-100/90 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-blue-800 cursor-not-allowed select-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Error Banner */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs font-bold flex items-center space-x-2 shadow-xs">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-[#0D47A1] hover:bg-blue-900 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-base active:scale-98"
        >
          {isEditMode ? <RotateCw size={20} /> : <Save size={20} />}
          <span>{isEditMode ? 'আপডেট করুন' : 'ডাটা সেভ করুন'}</span>
        </button>
      </form>
    </div>
  );
};

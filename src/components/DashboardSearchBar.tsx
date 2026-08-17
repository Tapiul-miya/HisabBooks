import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface DashboardSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClose?: () => void;
  isFocused?: boolean;
}

export const DashboardSearchBar: React.FC<DashboardSearchBarProps> = ({
  query,
  onQueryChange,
  onClose
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="px-3.5 pt-2 pb-1">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center px-3.5 py-2">
        <Search size={18} className="text-[#1B5E20] mr-2 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="খুঁজুন (নাম, তারিখ, কাজ)..."
          className="w-full bg-transparent text-slate-800 text-sm focus:outline-none placeholder-slate-400"
        />
        {query ? (
          <button
            onClick={() => onQueryChange('')}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500 shrink-0 ml-1"
            title="Clear search"
          >
            <X size={16} />
          </button>
        ) : onClose ? (
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-400 shrink-0 ml-1"
            title="Close search bar"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
};

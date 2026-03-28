import React, { useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

interface FilterOption {
    value: string;
    label: string;
    count?: number;
}

interface CompactFilterProps {
    searchPlaceholder?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    filters: {
        [key: string]: {
            label: string;
            options: FilterOption[];
            value: string;
            onChange: (value: string) => void;
        };
    };
    onReset?: () => void;
    compact?: boolean;
}

export const CompactFilter: React.FC<CompactFilterProps> = ({
    searchPlaceholder = "Search...",
    searchValue,
    onSearchChange,
    filters,
    onReset,
    compact = true,
}) => {
    const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
    const activeFiltersCount = Object.values(filters).filter(f => f.value !== 'ALL').length;

    return (
        <div className={`bg-white rounded-lg border border-slate-200 ${compact ? 'p-3' : 'p-6'} space-y-3`}>
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className={`w-full pl-10 pr-4 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        compact ? 'py-2 text-sm' : 'py-3'
                    }`}
                />
                {searchValue && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Filters */}
            {Object.entries(filters).length > 0 && (
                <div className="space-y-2">
                    {Object.entries(filters).map(([key, filter]) => (
                        <div key={key} className="relative">
                            <button
                                onClick={() => setExpandedFilter(expandedFilter === key ? null : key)}
                                className={`w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 text-left transition ${
                                    compact ? 'text-sm' : ''
                                }`}
                            >
                                <div>
                                    <span className="font-medium text-slate-700">{filter.label}</span>
                                    <span className="text-slate-500 text-xs ml-2">
                                        ({filter.options.find(o => o.value === filter.value)?.label || 'All'})
                                    </span>
                                </div>
                                <ChevronDown
                                    size={16}
                                    className={`text-slate-400 transition ${
                                        expandedFilter === key ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>

                            {/* Dropdown */}
                            {expandedFilter === key && (
                                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                                    {filter.options.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                filter.onChange(option.value);
                                                setExpandedFilter(null);
                                            }}
                                            className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-50 transition text-sm border-b border-slate-100 last:border-b-0 ${
                                                filter.value === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                                            }`}
                                        >
                                            <span>{option.label}</span>
                                            {option.count !== undefined && (
                                                <span className="text-xs text-slate-500">({option.count})</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Active Filters Chips & Reset */}
            {(activeFiltersCount > 0 || searchValue) && (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Active:</span>
                    {searchValue && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                            Search: "{searchValue}"
                            <button onClick={() => onSearchChange('')} className="hover:text-blue-900">
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {Object.entries(filters).map(([key, filter]) => {
                        if (filter.value === 'ALL' || !filter.value) return null;
                        const label = filter.options.find(o => o.value === filter.value)?.label;
                        return (
                            <span
                                key={key}
                                className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full flex items-center gap-1"
                            >
                                {filter.label}: {label}
                                <button
                                    onClick={() => filter.onChange('ALL')}
                                    className="hover:text-slate-900"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        );
                    })}
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="text-xs text-slate-600 hover:text-slate-900 font-medium ml-auto"
                        >
                            Reset All
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default CompactFilter;


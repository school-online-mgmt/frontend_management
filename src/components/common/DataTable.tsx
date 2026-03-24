import React from 'react';
import { ArrowUpDown } from 'lucide-react';

interface ColumnConfig<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  rowActions?: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id?: string | number }>(
  { data, columns, onRowClick, isLoading = false, emptyMessage = "No data found", rowActions }: DataTableProps<T>
) {
  const [sortColumn, setSortColumn] = React.useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });
    
    return sorted;
  }, [data, sortColumn, sortDirection]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100 bg-white shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${column.className || ''}`}
                style={{ width: column.width }}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="hover:text-slate-900 transition-colors"
                    >
                      <ArrowUpDown size={14} />
                    </button>
                  )}
                </div>
              </th>
            ))}
            {rowActions && <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr
              key={row.id || index}
              className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className={`px-6 py-4 text-sm text-slate-900 ${column.className || ''}`}
                  style={{ width: column.width }}
                >
                  {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                </td>
              ))}
              {rowActions && (
                <td className="px-6 py-4 text-sm">
                  {rowActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============= TABS COMPONENT =============
interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, defaultTab, onChange }) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id || '');

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabContent = tabs.find(t => t.id === activeTab);

  return (
    <div>
      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-6 py-4 border-b-2 font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="py-6">
        {activeTabContent?.content}
      </div>
    </div>
  );
};

// ============= PAGINATION COMPONENT =============
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 10,
  totalItems = 0,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(page => {
    const distance = Math.abs(page - currentPage);
    return distance === 0 || distance === 1 || page === 1 || page === totalPages;
  });

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-600">
        Showing {startItem} to {endItem} of {totalItems} results
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        
        {visiblePages.map((page, index) => {
          const showEllipsis = index > 0 && visiblePages[index - 1] !== page - 1;
          return (
            <React.Fragment key={page}>
              {showEllipsis && <span className="px-2 text-slate-400">...</span>}
              <button
                onClick={() => onPageChange(page)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  currentPage === page
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            </React.Fragment>
          );
        })}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};


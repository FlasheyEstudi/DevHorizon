import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SortOption {
  value: string;
  label: string;
}

interface Props {
  currentSort: string;
  options: SortOption[];
  className?: string;
  triggerClassName?: string;
}

export default function SortSelect({
  currentSort,
  options,
  className = '',
  triggerClassName = '',
}: Props) {
  const handleValueChange = (val: string) => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (val === '-created_at' || !val) {
        url.searchParams.delete('sort');
      } else {
        url.searchParams.set('sort', val);
      }
      window.location.href = `${url.pathname}${url.search}`;
    } catch {
      // fallback if URL constructor fails
    }
  };

  const validValues = options.map((o) => o.value);
  const activeValue = validValues.includes(currentSort) ? currentSort : '-created_at';

  return (
    <div className={className}>
      <Select value={activeValue} onValueChange={handleValueChange}>
        <SelectTrigger
          className={`h-9 px-3 text-xs font-semibold bg-fondo border-borde rounded-lg text-texto cursor-pointer focus:ring-primary/40 focus:border-primary ${triggerClassName}`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <ArrowUpDown className="size-3.5 text-texto-secundario flex-shrink-0" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

import React from 'react';
import { MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  departments: readonly string[];
  selectedDepartment: string | null;
  allLabel: string;
  currentUrl?: string;
  counts?: Record<string, number>;
  totalCount?: number;
}

export default function DepartmentSelect({
  departments,
  selectedDepartment,
  allLabel,
  currentUrl,
  counts = {},
  totalCount,
}: Props) {
  const handleValueChange = (val: string) => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (val === 'all' || !val) {
        url.searchParams.delete('departamento');
      } else {
        url.searchParams.set('departamento', val);
      }
      window.location.href = `${url.pathname}${url.search}`;
    } catch {
      // fallback if URL constructor fails
    }
  };

  const currentValue =
    selectedDepartment && (departments as readonly string[]).includes(selectedDepartment)
      ? selectedDepartment
      : 'all';

  return (
    <div className="w-full">
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full h-11 bg-fondo/80 border-borde rounded-xl font-medium focus:ring-primary/40 focus:border-primary">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="size-4 text-primary flex-shrink-0" />
            <SelectValue placeholder={allLabel} />
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="all" className="font-semibold text-primary">
            <div className="flex items-center justify-between w-full gap-2">
              <span>{allLabel}</span>
              {totalCount !== undefined && totalCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono ml-auto">
                  {totalCount}
                </span>
              )}
            </div>
          </SelectItem>
          {departments.map((dept) => {
            const count = counts[dept];
            return (
              <SelectItem key={dept} value={dept}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{dept}</span>
                  {count !== undefined && count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fondo dark:bg-[#1e293b] text-texto-secundario font-mono ml-auto">
                      {count}
                    </span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

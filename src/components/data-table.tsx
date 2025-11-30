'use client';

import { useState, useMemo } from 'react';
import type { CsvRow } from '@/lib/csv-parser';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';

type DataTableProps = {
  headers: string[];
  data: CsvRow[];
  suggestedFilters: string[];
  fileName: string;
  onReset: () => void;
};

type SortConfig = {
  key: string;
  direction: 'ascending' | 'descending';
} | null;

export function DataTable({ headers, data, suggestedFilters, fileName, onReset }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    headers.reduce((acc, header) => ({ ...acc, [header]: true }), {})
  );
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);


  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    suggestedFilters.forEach((header) => {
      if (headers.includes(header)) {
        const uniqueValues = [...new Set(data.map((row) => row[header]))].filter(
          (value): value is string => typeof value === 'string' && value.trim() !== ''
        );
        if (uniqueValues.length > 1 && uniqueValues.length < 50) {
          options[header] = uniqueValues.sort();
        }
      }
    });
    return options;
  }, [data, headers, suggestedFilters]);

  const filteredData = useMemo(() => {
    let filtered = [...data];

    if (searchTerm) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) => String(value).toLowerCase().includes(lowercasedSearchTerm))
      );
    }

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter((row) => row[key] === value);
      }
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, activeFilters]);

    const paginatedData = useMemo(() => {
    if (rowsPerPage === data.length) {
      return filteredData;
    }
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, rowsPerPage, data.length]);

  const totalPages = useMemo(() => {
     if (rowsPerPage === data.length) return 1;
    return Math.ceil(filteredData.length / rowsPerPage);
  }, [filteredData.length, rowsPerPage, data.length]);


  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (column: string, value: string) => {
    setCurrentPage(1);
    if (value) {
      setActiveFilters((prev) => ({
        ...prev,
        [column]: value,
      }));
    } else {
      clearFilter(column);
    }
  };

  const clearFilter = (column: string) => {
    setCurrentPage(1);
    const newFilters = { ...activeFilters };
    delete newFilters[column];
    setActiveFilters(newFilters);
  };
  
  const handleClearAllFilters = () => {
    setActiveFilters({});
    setCurrentPage(1);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const currentHeaders = headers.filter((h) => visibleColumns[h]);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div>
          <h2 className="text-2xl font-headline font-bold">{fileName}</h2>
          <p className="text-muted-foreground">{data.length} rows</p>
        </div>
        <Button onClick={onReset} variant="outline">
          Upload New File
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-4">
        <div className="relative flex-grow min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {Object.entries(filterOptions).map(([header, options]) => (
          <Select key={header} value={activeFilters[header] || ''} onValueChange={(value) => handleFilterChange(header, value)}>
            <SelectTrigger className="w-full md:w-[180px] bg-primary/10 border-primary/50 text-primary">
              <SelectValue placeholder={`Filter by ${header}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              <SlidersHorizontal className="mr-2 h-4 w-4" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {headers.map((header) => (
              <DropdownMenuCheckboxItem
                key={header}
                className="capitalize"
                checked={visibleColumns[header]}
                onCheckedChange={(value) => setVisibleColumns((prev) => ({ ...prev, [header]: !!value }))}
              >
                {header}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {Object.values(activeFilters).some(v => v) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Active Filters:</span>
          {Object.entries(activeFilters).map(
            ([key, value]) =>
              value && (
                <Badge key={key} variant="secondary" className="flex items-center gap-1">
                  {key}: {value}
                  <button onClick={() => clearFilter(key)} className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
          )}
          <Button variant="ghost" size="sm" onClick={handleClearAllFilters}>
            Clear all
          </Button>
        </div>
      )}

      <Card className="shadow-lg">
        <ScrollArea className="w-full whitespace-nowrap">
          <Table>
            <TableHeader className="bg-primary/20">
              <TableRow>
                {currentHeaders.map((header) => (
                  <TableHead key={header} className="font-bold text-primary-foreground">
                    <Button variant="ghost" onClick={() => requestSort(header)} className="px-2 py-1 hover:bg-primary/20 text-primary">
                      {header}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {currentHeaders.map((header) => (
                      <TableCell key={header}>{row[header]}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={currentHeaders.length} className="h-24 text-center">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
         <div className="flex items-center justify-between p-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={rowsPerPage === data.length ? 'all' : String(rowsPerPage)}
              onValueChange={(value) => {
                setRowsPerPage(value === 'all' ? data.length : Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

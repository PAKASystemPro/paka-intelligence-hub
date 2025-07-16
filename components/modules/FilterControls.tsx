'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface FilterControlsProps {
  year: string;
  n: number;
  productFilter: string;
  onFilterChange: (filterName: string, value: string | number) => void;
}

const productOptions = ['ALL', '深睡寶寶', '天皇丸', '皇后丸'];
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

export default function FilterControls({ year, n, productFilter, onFilterChange }: FilterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-0 mb-0">
      {/* Year Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="year-select" className="text-sm font-medium">Year</label>
        <Select value={year} onValueChange={(value) => onFilterChange('year', value)}>
          <SelectTrigger className="w-[120px] !bg-white border-gray-200 shadow-sm" style={{backgroundColor: 'white'}} id="year-select">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent className="bg-white shadow-md">
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y} className="hover:bg-gray-100">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nth Order Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="nth-order-select" className="text-sm font-medium">Nth Order</label>
        <Select value={n.toString()} onValueChange={(value) => onFilterChange('n', parseInt(value, 10))}>
          <SelectTrigger className="w-[150px] !bg-white border-gray-200 shadow-sm" style={{backgroundColor: 'white'}} id="nth-order-select">
            <SelectValue placeholder="Select Nth Order" />
          </SelectTrigger>
          <SelectContent className="bg-white shadow-md">
            <SelectItem value="2" className="hover:bg-gray-100">2nd Order</SelectItem>
            <SelectItem value="3" className="hover:bg-gray-100">3rd Order</SelectItem>
            <SelectItem value="4" className="hover:bg-gray-100">4th Order</SelectItem>
            <SelectItem value="5" className="hover:bg-gray-100">5th Order</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="product-select" className="text-sm font-medium">Product</label>
        <Select value={productFilter} onValueChange={(value) => onFilterChange('productFilter', value)}>
          <SelectTrigger className="w-[150px] !bg-white border-gray-200 shadow-sm" style={{backgroundColor: 'white'}} id="product-select">
            <SelectValue placeholder="Select Product" />
          </SelectTrigger>
          <SelectContent className="bg-white shadow-md">
            {productOptions.map((product) => (
              <SelectItem key={product} value={product} className="hover:bg-gray-100">
                {product}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
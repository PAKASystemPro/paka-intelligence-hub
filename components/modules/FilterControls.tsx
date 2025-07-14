'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
    <div className="flex items-center space-x-4 mb-8">
      {/* Year Filter */}
      <div>
        <label className="mr-2 text-sm font-medium">Year</label>
        <Select value={year} onValueChange={(value) => onFilterChange('year', value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nth Order Filter */}
      <div>
        <label className="mr-2 text-sm font-medium">Nth Order</label>
        <Select value={n.toString()} onValueChange={(value) => onFilterChange('n', parseInt(value, 10))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Nth Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2nd Order</SelectItem>
            <SelectItem value="3">3rd Order</SelectItem>
            <SelectItem value="4">4th Order</SelectItem>
            <SelectItem value="5">5th Order</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Filter */}
      <div>
        <label className="mr-2 text-sm font-medium">Product</label>
        <ToggleGroup
          type="single"
          value={productFilter}
          onValueChange={(value) => {
            if (value) onFilterChange('productFilter', value);
          }}
          className="items-center"
        >
          {productOptions.map((product) => (
            <ToggleGroupItem key={product} value={product} aria-label={`Toggle ${product}`}>
              {product}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}

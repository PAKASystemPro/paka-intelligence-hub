"use client";

import React from 'react';
import RetentionDonut from './retention-donut';

export default function RetentionStats({ percentage }) {
  // Calculate the non-retention percentage
  const nonRetention = 100 - percentage;
  
  return (
    <div className="bg-white p-4 rounded-md shadow-sm">
      <h3 className="font-medium text-gray-700 mb-2">Overall Retention</h3>
      <div className="flex flex-col items-center">
        <RetentionDonut percentage={percentage} />
        <div className="mt-3 text-center">
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-sm text-gray-700">Retained: {percentage}%</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-full bg-gray-200"></div>
            <span className="text-sm text-gray-700">Not Retained: {nonRetention}%</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Based on {1958} customers from Jan-Jun 2025
          </div>
        </div>
      </div>
    </div>
  );
}

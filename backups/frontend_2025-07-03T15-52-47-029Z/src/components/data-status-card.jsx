"use client";

import React from 'react';
import RetentionDonut from './retention-donut';

export default function DataStatusCard() {
  const retentionRate = 35.7;
  const totalCustomers = 1958;
  const dateRange = "January - June 2025";
  const lastUpdated = "July 2, 2025";
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 w-full">
      <h2 className="text-xl font-semibold mb-5 text-gray-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
        Data Status
      </h2>
      
      <div className="flex flex-col items-start">
        <div className="flex flex-col md:flex-row w-full gap-8 items-start">
          {/* Left side - Text information */}
          <div className="flex flex-col items-start md:w-1/2">
            {/* Total Customers */}
            <div className="mb-4 text-left">
              <h3 className="font-medium text-gray-700 mb-1">Total Customers</h3>
              <p className="text-3xl font-bold">{totalCustomers.toLocaleString()}</p>
            </div>
            
            {/* Date Range */}
            <div className="mb-4 text-left">
              <p className="text-sm text-gray-500">{dateRange}</p>
              <p className="text-xs text-gray-400">Last updated: {lastUpdated}</p>
            </div>
          </div>
          
          {/* Right side - Retention Chart */}
          <div className="md:w-1/2">
            <h3 className="font-medium text-gray-700 mb-1 text-left">Overall Retention</h3>
            <div className="flex flex-col items-center">
              <RetentionDonut percentage={retentionRate} />
              <div className="mt-2 flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-gray-700">Retained: {retentionRate}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-100"></div>
                  <span className="text-sm text-gray-700">Not Retained: {(100 - retentionRate).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

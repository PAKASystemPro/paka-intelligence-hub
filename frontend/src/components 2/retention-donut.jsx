"use client";

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register the required Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function RetentionDonut({ percentage }) {
  // Convert percentage to a number if it's a string
  const retentionRate = typeof percentage === 'string' 
    ? parseFloat(percentage.replace('%', '')) 
    : percentage;
  
  const remainingRate = 100 - retentionRate;
  
  const data = {
    labels: ['Retained', 'Not Retained'],
    datasets: [
      {
        data: [retentionRate, remainingRate],
        backgroundColor: [
          '#10b981', // Emerald-500 for retention (more vibrant green)
          '#f1f5f9', // Slate-100 for non-retention (softer gray)
        ],
        borderColor: [
          '#10b981',
          '#f1f5f9',
        ],
        borderWidth: 0,
        cutout: '75%', // Makes it a donut chart with slightly larger hole
        borderRadius: 5, // Rounded edges for a modern look
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false, // Hide the legend
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.raw}%`;
          }
        }
      }
    },
  };
  
  return (
    <div className="relative w-36 h-36 mx-auto">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-800">{retentionRate}%</span>
      </div>
    </div>
  );
}

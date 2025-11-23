import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { FlavorProfile, FlavorDimension } from '../types';

interface Props {
  data: FlavorProfile;
  compareData?: FlavorProfile; // Optional data to compare against (e.g. a specific drink vs user palate)
}

const FlavorRadar: React.FC<Props> = ({ data, compareData }) => {
  // Transform key-value object to array for Recharts
  const chartData = Object.values(FlavorDimension).map((dim) => ({
    subject: dim,
    A: data[dim] || 0,
    B: compareData ? compareData[dim] : 0,
    fullMark: 10,
  }));

  return (
    <div className="w-full h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#44403c" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#a8a29e', fontSize: 12 }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
          
          <Radar
            name="My Palate"
            dataKey="A"
            stroke="#b91c1c" 
            strokeWidth={2}
            fill="#b91c1c" 
            fillOpacity={0.5}
          />
          
          {compareData && (
            <Radar
              name="Drink Profile"
              dataKey="B"
              stroke="#ca8a04"
              strokeWidth={2}
              fill="#ca8a04"
              fillOpacity={0.4}
            />
          )}
          <Tooltip 
             contentStyle={{ backgroundColor: '#1c1917', borderColor: '#292524', color: '#f5f5f4' }}
             itemStyle={{ color: '#e7e5e4' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FlavorRadar;
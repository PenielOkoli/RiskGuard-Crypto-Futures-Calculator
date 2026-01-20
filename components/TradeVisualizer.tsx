import React from 'react';
import { PositionType, TradeParams } from '../types';

interface Props {
  params: TradeParams;
}

const TradeVisualizer: React.FC<Props> = ({ params }) => {
  const { entryPrice, stopLossPrice, takeProfitPrice, positionType } = params;

  // Safety checks for rendering
  if (!entryPrice || !stopLossPrice || !takeProfitPrice) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 text-sm p-8 shadow-sm">
        Enter trade parameters to visualize
      </div>
    );
  }

  // Calculate relative heights for visualization
  const maxPrice = Math.max(entryPrice, stopLossPrice, takeProfitPrice);
  const minPrice = Math.min(entryPrice, stopLossPrice, takeProfitPrice);
  const totalRange = maxPrice - minPrice;
  
  // Avoid division by zero
  if (totalRange === 0) return null;

  // Helper to map price to percentage from bottom (0 to 100)
  const getPos = (price: number) => ((price - minPrice) / totalRange) * 100;

  const entryPos = getPos(entryPrice);
  const slPos = getPos(stopLossPrice);
  const tpPos = getPos(takeProfitPrice);

  const isLong = positionType === PositionType.LONG;

  // Colors
  // Using explicit RGBA for backgrounds to ensure they look good on both white and dark bg
  const profitColor = 'border-green-500 dark:border-green-500';
  const lossColor = 'border-red-500 dark:border-red-500';
  const entryColor = 'border-gray-400 dark:border-gray-500';

  return (
    <div className="h-[400px] w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 relative overflow-hidden flex flex-col justify-center items-center p-4 shadow-sm transition-colors duration-300">
      <div className="absolute right-4 top-4 text-xs font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wider">Risk Visualizer</div>
      
      {/* Chart Area */}
      <div className="relative h-full w-32 sm:w-40">
        {/* Central dashed line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed border-gray-300 dark:border-gray-700 transform -translate-x-1/2"></div>

        {/* Profit Zone Box */}
        <div 
          className={`absolute left-0 right-0 border-2 ${profitColor} transition-all duration-500 rounded-sm`}
          style={{
            bottom: `${Math.min(entryPos, tpPos)}%`,
            height: `${Math.abs(tpPos - entryPos)}%`,
            backgroundColor: isLong ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.15)'
          }}
        >
          <div className={`absolute ${isLong ? '-top-6' : '-bottom-6'} left-0 right-0 text-center text-xs font-bold text-green-600 dark:text-green-400 bg-white/80 dark:bg-gray-900/80 rounded px-1`}>
            TP: {takeProfitPrice}
          </div>
        </div>

        {/* Loss Zone Box */}
        <div 
          className={`absolute left-0 right-0 border-2 ${lossColor} transition-all duration-500 rounded-sm`}
          style={{
            bottom: `${Math.min(entryPos, slPos)}%`,
            height: `${Math.abs(slPos - entryPos)}%`,
            backgroundColor: isLong ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.15)'
          }}
        >
          <div className={`absolute ${isLong ? '-bottom-6' : '-top-6'} left-0 right-0 text-center text-xs font-bold text-red-600 dark:text-red-400 bg-white/80 dark:bg-gray-900/80 rounded px-1`}>
            SL: {stopLossPrice}
          </div>
        </div>

        {/* Entry Line */}
        <div 
          className={`absolute left-0 right-0 border-b-2 ${entryColor} transition-all duration-500 z-10`}
          style={{ bottom: `${entryPos}%` }}
        >
          <div className="absolute -right-28 top-1/2 transform -translate-y-1/2 text-xs font-mono font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm border border-gray-200 dark:border-gray-700">
            Entry: {entryPrice}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeVisualizer;
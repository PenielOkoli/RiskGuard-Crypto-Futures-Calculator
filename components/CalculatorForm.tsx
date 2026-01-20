import React, { useState, useEffect } from 'react';
import { TradeParams, PositionType, TradeResults, RiskMode } from '../types';
import { getTradeAdvice } from '../services/geminiService';

interface Props {
  params: TradeParams;
  setParams: React.Dispatch<React.SetStateAction<TradeParams>>;
  results: TradeResults;
}

const CalculatorForm: React.FC<Props> = ({ params, setParams, results }) => {
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  // Debounced advice fetching
  useEffect(() => {
    if (results.isValid) {
      const timer = setTimeout(async () => {
        setLoadingAdvice(true);
        const tip = await getTradeAdvice(results.actualRiskAmount, results.riskRewardRatio, results.stopLossPercentage);
        setAdvice(tip);
        setLoadingAdvice(false);
      }, 1500); // 1.5s debounce
      return () => clearTimeout(timer);
    } else {
      setAdvice('');
    }
  }, [results.isValid, results.actualRiskAmount, results.riskRewardRatio, results.stopLossPercentage]);

  const handleChange = (field: keyof TradeParams, value: string | number | boolean) => {
    setParams(prev => ({
      ...prev,
      [field]: typeof value === 'string' && field !== 'riskMode' ? parseFloat(value) || 0 : value
    }));
  };

  const toggleType = (type: PositionType) => {
    setParams(prev => ({ ...prev, positionType: type }));
  };

  const setRiskMode = (mode: RiskMode) => {
    setParams(prev => ({ ...prev, riskMode: mode }));
  };

  return (
    <div className="space-y-6">
      {/* Position Type Toggle */}
      <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => toggleType(PositionType.LONG)}
          className={`py-2 text-sm font-bold rounded-md transition-all duration-200 ${
            params.positionType === PositionType.LONG
              ? 'bg-green-600 text-white shadow-md'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          LONG
        </button>
        <button
          onClick={() => toggleType(PositionType.SHORT)}
          className={`py-2 text-sm font-bold rounded-md transition-all duration-200 ${
            params.positionType === PositionType.SHORT
              ? 'bg-red-600 text-white shadow-md'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          SHORT
        </button>
      </div>

      {/* Risk Management Section */}
      <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-4 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
           <button 
             onClick={() => setRiskMode(RiskMode.FIXED)}
             className={`text-xs font-bold uppercase pb-2 -mb-2.5 border-b-2 transition-all ${params.riskMode === RiskMode.FIXED ? 'text-brand-600 dark:text-brand-400 border-brand-500' : 'text-gray-400 border-transparent hover:text-gray-500'}`}
           >
             Fixed Risk ($)
           </button>
           <button 
             onClick={() => setRiskMode(RiskMode.PORTFOLIO)}
             className={`text-xs font-bold uppercase pb-2 -mb-2.5 border-b-2 transition-all ${params.riskMode === RiskMode.PORTFOLIO ? 'text-brand-600 dark:text-brand-400 border-brand-500' : 'text-gray-400 border-transparent hover:text-gray-500'}`}
           >
             Portfolio %
           </button>
        </div>

        {params.riskMode === RiskMode.FIXED ? (
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Risk Amount</label>
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold">$</span>
              <input
                type="number"
                value={params.riskAmount || ''}
                onChange={(e) => handleChange('riskAmount', e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-8 pr-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono shadow-sm"
                placeholder="50"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Account Size</label>
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold">$</span>
                <input
                  type="number"
                  value={params.portfolioSize || ''}
                  onChange={(e) => handleChange('portfolioSize', e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-8 pr-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono shadow-sm"
                  placeholder="1000"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Risk %</label>
              <div className="relative group">
                <input
                  type="number"
                  value={params.riskPercentage || ''}
                  onChange={(e) => handleChange('riskPercentage', e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono shadow-sm"
                  placeholder="1.0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Price Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Entry Price</label>
          <input
            type="number"
            value={params.entryPrice || ''}
            onChange={(e) => handleChange('entryPrice', e.target.value)}
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-mono shadow-sm"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Stop Loss</label>
          <input
            type="number"
            value={params.stopLossPrice || ''}
            onChange={(e) => handleChange('stopLossPrice', e.target.value)}
            className={`w-full bg-white dark:bg-gray-800 border rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all font-mono shadow-sm ${
              params.positionType === PositionType.LONG 
                ? 'border-gray-200 dark:border-red-900/50 focus:ring-red-500' 
                : 'border-gray-200 dark:border-red-900/50 focus:ring-red-500'
            }`}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Take Profit</label>
          <input
            type="number"
            value={params.takeProfitPrice || ''}
            onChange={(e) => handleChange('takeProfitPrice', e.target.value)}
            className={`w-full bg-white dark:bg-gray-800 border rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all font-mono shadow-sm ${
               params.positionType === PositionType.LONG 
                ? 'border-gray-200 dark:border-green-900/50 focus:ring-green-500' 
                : 'border-gray-200 dark:border-green-900/50 focus:ring-green-500'
            }`}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Leverage & Fees */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
        <div>
           <div className="flex justify-between items-center mb-1">
             <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Leverage</label>
             <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">{params.leverage}x</span>
           </div>
           <input 
             type="range" 
             min="1" 
             max="125" 
             value={params.leverage}
             onChange={(e) => handleChange('leverage', e.target.value)}
             className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
           />
           <div className="flex justify-between text-[10px] text-gray-400 mt-1">
             <span>1x</span>
             <span>50x</span>
             <span>125x</span>
           </div>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50 h-[56px]">
          <input 
            type="checkbox" 
            id="fees"
            checked={params.includeFees}
            onChange={(e) => handleChange('includeFees', e.target.checked)}
            className="w-4 h-4 text-brand-600 rounded border-gray-300 dark:border-gray-600 focus:ring-brand-500"
          />
          <label htmlFor="fees" className="text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
            Include Est. Fees <br/>
            <span className="text-[10px] text-gray-400">~0.06% Taker (Roundtrip)</span>
          </label>
        </div>
      </div>

      {/* AI Advice */}
      {results.isValid && (
        <div className="bg-brand-50/50 dark:bg-gray-800/50 rounded-lg p-4 border border-brand-100 dark:border-gray-700/50 min-h-[80px]">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-brand-600 dark:text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-500 uppercase tracking-wide">AI Assistant</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
            {loadingAdvice ? (
              <span className="animate-pulse">Analyzing risk profile...</span>
            ) : (
              advice || "Enter parameters to get AI insights."
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default CalculatorForm;

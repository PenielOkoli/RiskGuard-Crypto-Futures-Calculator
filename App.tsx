import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PositionType, TradeParams, TradeResults, RiskMode } from './types';
import CalculatorForm from './components/CalculatorForm';
import TradeVisualizer from './components/TradeVisualizer';
import { analyzeChartImage } from './services/geminiService';

const App: React.FC = () => {
  // Initialize from local storage or default to true (dark mode)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
       const saved = localStorage.getItem('theme');
       return saved ? saved === 'dark' : true;
    }
    return true;
  });

  const [params, setParams] = useState<TradeParams>({
    riskMode: RiskMode.FIXED,
    riskAmount: 50,
    portfolioSize: 1000,
    riskPercentage: 1,
    entryPrice: 0,
    stopLossPrice: 0,
    takeProfitPrice: 0,
    positionType: PositionType.LONG,
    leverage: 10,
    includeFees: false,
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Theme Logic ---
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // --- Calculation Logic ---
  const results: TradeResults = useMemo(() => {
    const { 
      entryPrice, stopLossPrice, takeProfitPrice, positionType, 
      riskMode, riskAmount, portfolioSize, riskPercentage,
      leverage, includeFees
    } = params;
    
    // 1. Determine Actual Risk Amount ($)
    let actualRisk = 0;
    if (riskMode === RiskMode.FIXED) {
      actualRisk = riskAmount;
    } else {
      actualRisk = portfolioSize * (riskPercentage / 100);
    }

    // Basic validation
    if (!actualRisk || !entryPrice || !stopLossPrice) {
      return {
        positionSizeUSDT: 0, quantity: 0, riskRewardRatio: 0, 
        stopLossPercentage: 0, takeProfitPercentage: 0, potentialProfit: 0,
        netProfit: 0, estimatedFees: 0, requiredMargin: 0, actualRiskAmount: 0,
        isValid: false, error: 'Enter required fields'
      };
    }

    const isLong = positionType === PositionType.LONG;
    const priceDiff = Math.abs(entryPrice - stopLossPrice);
    
    // Logical validation
    if (isLong && stopLossPrice >= entryPrice) {
      return { ...params, positionSizeUSDT: 0, quantity: 0, riskRewardRatio: 0, stopLossPercentage: 0, takeProfitPercentage: 0, potentialProfit: 0, netProfit: 0, estimatedFees: 0, requiredMargin: 0, actualRiskAmount: 0, isValid: false, error: 'SL must be below Entry' };
    }
    if (!isLong && stopLossPrice <= entryPrice) {
      return { ...params, positionSizeUSDT: 0, quantity: 0, riskRewardRatio: 0, stopLossPercentage: 0, takeProfitPercentage: 0, potentialProfit: 0, netProfit: 0, estimatedFees: 0, requiredMargin: 0, actualRiskAmount: 0, isValid: false, error: 'SL must be above Entry' };
    }
    if (priceDiff === 0) {
       return { ...params, positionSizeUSDT: 0, quantity: 0, riskRewardRatio: 0, stopLossPercentage: 0, takeProfitPercentage: 0, potentialProfit: 0, netProfit: 0, estimatedFees: 0, requiredMargin: 0, actualRiskAmount: 0, isValid: false, error: 'Price difference is zero' };
    }

    // 2. Core Math
    const quantity = actualRisk / priceDiff;
    const positionSizeUSDT = quantity * entryPrice;
    const slPercent = (priceDiff / entryPrice) * 100;
    const requiredMargin = positionSizeUSDT / (leverage || 1);

    let rr = 0;
    let grossProfit = 0;
    let tpPercent = 0;
    let totalFees = 0;

    // 3. Profit Calculation
    if (takeProfitPrice) {
      const profitDiff = Math.abs(takeProfitPrice - entryPrice);
      grossProfit = quantity * profitDiff;
      rr = grossProfit / actualRisk;
      tpPercent = (profitDiff / entryPrice) * 100;
    }

    // 4. Fees Calculation (Est. 0.06% Taker Fee per side)
    if (includeFees) {
      const feeRate = 0.0006; // 0.06%
      const openFee = positionSizeUSDT * feeRate;
      const closeFee = quantity * (takeProfitPrice || entryPrice) * feeRate;
      totalFees = openFee + closeFee;
    }

    return {
      positionSizeUSDT,
      quantity,
      riskRewardRatio: rr,
      stopLossPercentage: slPercent,
      takeProfitPercentage: tpPercent,
      potentialProfit: grossProfit,
      netProfit: grossProfit - totalFees,
      estimatedFees: totalFees,
      requiredMargin,
      actualRiskAmount: actualRisk,
      isValid: true
    };
  }, [params]);

  // --- Handlers ---
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const analysis = await analyzeChartImage(base64String);
          if (analysis) {
            setParams(prev => ({
              ...prev,
              entryPrice: analysis.entry || prev.entryPrice,
              stopLossPrice: analysis.stopLoss || prev.stopLossPrice,
              takeProfitPrice: analysis.takeProfit || prev.takeProfitPrice,
              positionType: (analysis.entry && analysis.stopLoss) 
                ? (analysis.entry > analysis.stopLoss ? PositionType.LONG : PositionType.SHORT)
                : prev.positionType
            }));
          }
        } catch (err) {
          alert("Could not analyze image. Make sure it's a clear trading chart.");
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 p-4 sm:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-600/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 36v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">RiskGuard</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Futures Position Calculator</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Image Upload Button */}
          <div className="relative">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                isAnalyzing 
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-brand-600 dark:text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Import Chart
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm transition-colors duration-300">
            <CalculatorForm params={params} setParams={setParams} results={results} />
          </div>

          {/* Key Metrics Summary Card (Small) */}
          {results.isValid && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm transition-colors duration-300">
                 <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">R:R Ratio</p>
                 <p className={`text-2xl font-mono font-bold ${results.riskRewardRatio >= 2 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                   {results.riskRewardRatio.toFixed(2)}
                 </p>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm transition-colors duration-300">
                 <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Margin Req.</p>
                 <p className="text-xl sm:text-2xl font-mono font-bold text-gray-900 dark:text-white truncate">
                   ${Math.ceil(results.requiredMargin).toLocaleString()}
                 </p>
                 <p className="text-[10px] text-gray-500">@{params.leverage}x Leverage</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Results & Visualization */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Main Result Display */}
          <div className={`bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border ${results.isValid ? 'border-brand-200 dark:border-brand-500/30 ring-1 ring-brand-100 dark:ring-0' : 'border-gray-200 dark:border-gray-800'} shadow-lg transition-all duration-300 relative overflow-hidden`}>
            {!results.isValid && results.error && (
              <div className="absolute inset-0 bg-white/90 dark:bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm">
                 <span className="text-red-500 font-bold text-lg">{results.error}</span>
              </div>
            )}

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase tracking-wide">Position Size</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white font-mono tracking-tighter">
                    ${Math.floor(results.positionSizeUSDT).toLocaleString()}
                  </span>
                  <span className="text-lg text-gray-400 dark:text-gray-500 font-mono">
                    .{results.positionSizeUSDT.toFixed(2).split('.')[1]}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">Total Trade Value</p>
                  {params.riskMode === RiskMode.PORTFOLIO && (
                    <span className="text-[10px] bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded border border-brand-200 dark:border-brand-800">
                      Risking ${results.actualRiskAmount.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-center sm:items-end sm:text-right border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-700 pt-4 sm:pt-0 sm:pl-8">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mb-1 uppercase tracking-wide">Quantity</p>
                <p className="text-2xl font-bold text-brand-600 dark:text-brand-400 font-mono mb-4">
                  {results.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} <span className="text-sm text-gray-400 dark:text-gray-600">Units</span>
                </p>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mb-1 uppercase tracking-wide">
                  {params.includeFees ? 'Net Profit' : 'Potential Profit'}
                </p>
                <div className="flex flex-col sm:items-end">
                  <p className={`text-2xl font-bold font-mono ${results.netProfit > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {results.netProfit >= 0 ? '+' : ''}${results.netProfit.toFixed(2)}
                  </p>
                  {params.includeFees && (
                    <p className="text-xs text-gray-400 mt-1">
                      (Fees: -${results.estimatedFees.toFixed(2)})
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Visualizer */}
          <TradeVisualizer params={params} />

        </div>
      </div>
    </div>
  );
};

export default App;

export enum PositionType {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export enum RiskMode {
  FIXED = 'FIXED',
  PORTFOLIO = 'PORTFOLIO'
}

export interface TradeParams {
  // Core Data
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  positionType: PositionType;

  // Risk Management
  riskMode: RiskMode;
  riskAmount: number;     // Used when mode is FIXED
  portfolioSize: number;  // Used when mode is PORTFOLIO
  riskPercentage: number; // Used when mode is PORTFOLIO
  
  // Execution
  leverage: number;
  includeFees: boolean;
}

export interface TradeResults {
  positionSizeUSDT: number;
  quantity: number;
  riskRewardRatio: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  
  // Financials
  potentialProfit: number; // Gross Profit
  netProfit: number;       // Profit after fees
  estimatedFees: number;   // Total roundtrip fees estimate
  requiredMargin: number;  // Cost to open trade
  actualRiskAmount: number; // The actual $ risk calculated
  
  isValid: boolean;
  error?: string;
}

export interface AIAnalysisResult {
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning?: string;
}

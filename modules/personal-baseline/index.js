/**
 * MEDULA — Module 02: Personal Baseline Engine (PBE)
 * Public Module API
 */

export {
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  calculateMAD,
  calculatePercentile,
  calculateBaseline,
  extractMetricData,
  BaselineConfidence,
  METRIC_UNITS,
  ACCEPTED_UNIT_VARIANTS,
} from './services/baselineCalculationService.js';

export { BaselineStorageService } from './services/baselineStorageService.js';

export {
  BaselineComparisonService,
  compareWithBaseline,
  ComparisonDirection,
  MedianDirection,
} from './services/baselineComparisonService.js';

export {
  BaselineTrendService,
  analyseTrend,
  TrendDirection,
} from './services/baselineTrendService.js';

export { BaselineSummary } from './components/BaselineSummary.jsx';
export { BaselineComparison } from './components/BaselineComparison.jsx';
export { BaselineTrendChart } from './components/BaselineTrendChart.jsx';
export { BaselineConfidenceBadge } from './components/BaselineConfidence.jsx';
export { PersonalBaselinePage } from './PersonalBaselinePage.jsx';


/**
 * MEDULA — Module 03: Multi-Indicator Health Pattern Detection Engine (MHPDE)
 * Public Module API
 */

export {
  PatternDetectionService,
  analyseHealthDomain,
  detectPatternsAcrossDomains,
  OperationalState,
  PatternConfidence,
  HealthDomains,
  DOMAIN_METRICS,
} from './services/patternDetectionService.js';

export {
  PatternStorageService,
  savePatternResult,
  getPatternsByAstronaut,
  getPatternHistory,
  getAllPatterns,
} from './services/patternStorageService.js';

export { HealthDomainOverview } from './components/HealthDomainOverview.jsx';
export { PatternAlertCard } from './components/PatternAlertCard.jsx';
export { IndicatorCorrelationView } from './components/IndicatorCorrelationView.jsx';
export { PatternExplanation } from './components/PatternExplanation.jsx';
export { PatternTimeline } from './components/PatternTimeline.jsx';
export { HealthPatternDetectionPage } from './HealthPatternDetectionPage.jsx';


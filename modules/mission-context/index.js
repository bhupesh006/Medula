/**
 * MEDULA — Module 04: Mission Context Engine (MCE)
 * Public Module API
 */

export {
  MissionContextService,
  TimelineEventType,
  DEFAULT_MISSION_EPOCH,
  calculateMissionDay,
  getMissionTimeline,
  getRecentMissionEvents,
  analyseActivityContext,
  getEnvironmentalContext,
  getRadiationContext,
  getContextForHealthPattern,
  saveContextSnapshot,
} from './services/missionContextService.js';

export { ActivityContextCard } from './components/ActivityContextCard.jsx';
export { EnvironmentalContextCard } from './components/EnvironmentalContextCard.jsx';
export { RadiationContextCard } from './components/RadiationContextCard.jsx';
export { ContextualExplanation } from './components/ContextualExplanation.jsx';
export { MissionTimeline } from './components/MissionTimeline.jsx';
export { MissionContextPage } from './MissionContextPage.jsx';


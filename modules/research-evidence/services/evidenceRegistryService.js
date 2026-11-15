import registryData from '../data/nasaEvidenceRegistry.json';
import { localDb } from '../../../database/localDatabase.js';

/**
 * Valid official NASA research domain regex
 */
const VALID_NASA_DOMAIN_REGEX = /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:nasa\.gov|osdr\.nasa\.gov)(?:\/.*)?$/i;

/**
 * Validates whether a URL belongs to official NASA web resources
 * @param {string} url 
 * @returns {boolean}
 */
export function isValidNasaUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return VALID_NASA_DOMAIN_REGEX.test(url.trim());
}

/**
 * Get all NASA research evidence entries
 * @param {Object} [filter] Optional filter by hazard, domain, or evidenceType
 * @returns {Array<Object>}
 */
export function getEvidenceRegistry(filter = {}) {
  let entries = [...registryData];

  if (filter.hazard) {
    const targetHazard = filter.hazard.toLowerCase();
    entries = entries.filter(
      (e) => e.relatedHazard && e.relatedHazard.toLowerCase().includes(targetHazard)
    );
  }

  if (filter.domain) {
    const targetDomain = filter.domain.toLowerCase();
    entries = entries.filter(
      (e) => e.relatedHealthDomain && e.relatedHealthDomain.toLowerCase() === targetDomain
    );
  }

  if (filter.evidenceType) {
    entries = entries.filter((e) => e.evidenceType === filter.evidenceType);
  }

  if (filter.indicator) {
    const targetIndicator = filter.indicator.toLowerCase();
    entries = entries.filter(
      (e) => Array.isArray(e.relatedIndicators) && e.relatedIndicators.some((ind) => ind.toLowerCase() === targetIndicator)
    );
  }

  return entries;
}

/**
 * Retrieve single evidence record by ID
 * @param {string} evidenceId 
 * @returns {Object|null}
 */
export function getEvidenceById(evidenceId) {
  if (!evidenceId) return null;
  return registryData.find((e) => e.evidenceId === evidenceId) || null;
}

/**
 * Retrieve evidence entries related to a specific NASA hazard
 * @param {string} hazardName 
 * @returns {Array<Object>}
 */
export function getEvidenceByHazard(hazardName) {
  return getEvidenceRegistry({ hazard: hazardName });
}

/**
 * Retrieve evidence entries related to a health domain
 * @param {string} domain 
 * @returns {Array<Object>}
 */
export function getEvidenceByDomain(domain) {
  return getEvidenceRegistry({ domain });
}

/**
 * Retrieve supporting evidence entries for a specific health indicator
 * @param {string} indicator 
 * @returns {Array<Object>}
 */
export function getEvidenceForIndicator(indicator) {
  return getEvidenceRegistry({ indicator });
}

/**
 * Validates integrity of all registry entries
 * @param {Array<Object>} [entries] 
 * @returns {{ valid: boolean, errors: Array<string>, totalCount: number }}
 */
export function validateEvidenceRegistry(entries = registryData) {
  const errors = [];

  entries.forEach((entry, idx) => {
    const prefix = `[Entry ${idx} - ${entry.evidenceId || 'MISSING_ID'}]`;

    if (!entry.evidenceId) errors.push(`${prefix} Missing evidenceId`);
    if (!entry.sourceTitle) errors.push(`${prefix} Missing sourceTitle`);
    if (!entry.sourceOrganization) errors.push(`${prefix} Missing sourceOrganization`);
    if (!entry.sourceURL) {
      errors.push(`${prefix} Missing sourceURL`);
    } else if (!isValidNasaUrl(entry.sourceURL)) {
      errors.push(`${prefix} Invalid non-NASA sourceURL: ${entry.sourceURL}`);
    }
    if (!entry.relatedHazard) errors.push(`${prefix} Missing relatedHazard`);
    if (!entry.relatedHealthDomain) errors.push(`${prefix} Missing relatedHealthDomain`);
    if (!entry.researchSummary) errors.push(`${prefix} Missing researchSummary`);
    if (!entry.limitations) errors.push(`${prefix} Missing limitations statement`);
    if (!entry.attribution) errors.push(`${prefix} Missing official attribution`);
  });

  return {
    valid: errors.length === 0,
    errors,
    totalCount: entries.length,
  };
}

/**
 * Cache research registry entries into local Dexie IndexedDB for offline resilience
 * @returns {Promise<{ cachedCount: number }>}
 */
export async function cacheRegistryLocally() {
  if (!localDb || !localDb.researchEvidence) {
    return { cachedCount: 0 };
  }

  const entriesToStore = registryData.map((e) => ({
    ...e,
    cachedAt: new Date().toISOString(),
  }));

  await localDb.researchEvidence.bulkPut(entriesToStore);
  const count = await localDb.researchEvidence.count();
  return { cachedCount: count };
}

/**
 * Get count of cached research evidence entries
 * @returns {Promise<number>}
 */
export async function getCachedRegistryCount() {
  if (!localDb || !localDb.researchEvidence) return 0;
  return await localDb.researchEvidence.count();
}


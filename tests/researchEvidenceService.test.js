import { describe, it, expect, beforeEach } from 'vitest';
import {
  getEvidenceRegistry,
  getEvidenceById,
  getEvidenceByHazard,
  getEvidenceByDomain,
  getEvidenceForIndicator,
  isValidNasaUrl,
  validateEvidenceRegistry,
  cacheRegistryLocally,
  getCachedRegistryCount,
} from '../modules/research-evidence/services/evidenceRegistryService.js';
import {
  getDatasetCatalogue,
  getDatasetByAccession,
  verifyDatasetMetadata,
  getDatasetCatalogueSummary,
} from '../modules/research-evidence/services/osdrDatasetService.js';
import {
  importVerifiedNasaDataset,
  getImportedDatasetRecords,
  getImportStatus,
  purgeImportedDataset,
} from '../modules/research-evidence/services/datasetImportPipeline.js';
import { localDb } from '../database/localDatabase.js';

describe('NASA Research and Evidence Layer', () => {
  beforeEach(async () => {
    // Clear test stores in Dexie
    if (localDb.researchEvidence) {
      await localDb.researchEvidence.clear();
    }
    if (localDb.researchDatasets) {
      await localDb.researchDatasets.clear();
    }
  });

  describe('1. Evidence Registry Loading & Structure', () => {
    it('should successfully load curated NASA research evidence registry', () => {
      const entries = getEvidenceRegistry();
      expect(entries).toBeDefined();
      expect(entries.length).toBeGreaterThanOrEqual(10);
    });

    it('should validate that all entries contain mandatory research metadata fields', () => {
      const validation = validateEvidenceRegistry();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.totalCount).toBeGreaterThanOrEqual(10);
    });

    it('should retrieve specific evidence record by ID', () => {
      const record = getEvidenceById('EVID-NASA-HAZ-RAD');
      expect(record).not.toBeNull();
      expect(record.sourceOrganization).toContain('NASA Human Research Program');
      expect(record.relatedHazard).toBe('Space Radiation');
      expect(record.relatedHealthDomain).toBe('radiation');
    });

    it('should retrieve evidence filtered by NASA hazard', () => {
      const radiationRecords = getEvidenceByHazard('Space Radiation');
      expect(radiationRecords.length).toBeGreaterThanOrEqual(2);
      expect(radiationRecords.every((r) => r.relatedHazard.includes('Radiation'))).toBe(true);
    });

    it('should retrieve evidence filtered by health domain', () => {
      const cardioRecords = getEvidenceByDomain('cardiovascular');
      expect(cardioRecords.length).toBeGreaterThanOrEqual(2);
      expect(cardioRecords.every((r) => r.relatedHealthDomain === 'cardiovascular')).toBe(true);
    });

    it('should retrieve supporting evidence for specific telemetry indicator', () => {
      const hrEvidence = getEvidenceForIndicator('heart_rate');
      expect(hrEvidence.length).toBeGreaterThanOrEqual(1);
      expect(hrEvidence.some((e) => e.relatedIndicators.includes('heart_rate'))).toBe(true);
    });
  });

  describe('2. Source URL & Provenance Validation', () => {
    it('should validate official NASA and OSDR URL domains', () => {
      expect(isValidNasaUrl('https://www.nasa.gov/hrp/hazards/')).toBe(true);
      expect(isValidNasaUrl('https://osdr.nasa.gov/')).toBe(true);
      expect(isValidNasaUrl('https://visualization.osdr.nasa.gov/radlab/api')).toBe(true);
      expect(isValidNasaUrl('https://lsda.jsc.nasa.gov/')).toBe(true);
    });

    it('should reject unauthorized or non-NASA URLs', () => {
      expect(isValidNasaUrl('https://example.com/nasa-fake')).toBe(false);
      expect(isValidNasaUrl('https://nasa.gov.attacker.io/bad')).toBe(false);
      expect(isValidNasaUrl(null)).toBe(false);
      expect(isValidNasaUrl('')).toBe(false);
    });
  });

  describe('3. OSDR Dataset Catalogue & Metadata Verification', () => {
    it('should load full OSDR dataset catalogue and report correct summary counts', () => {
      const catalogue = getDatasetCatalogue();
      expect(catalogue.length).toBeGreaterThanOrEqual(5);

      const summary = getDatasetCatalogueSummary();
      expect(summary.total).toBeGreaterThanOrEqual(5);
      expect(summary.verifiedAndIntegrated).toBe(2);
      expect(summary.cataloguedReference).toBe(2);
      expect(summary.protocolReferencedOnly).toBe(1);
    });

    it('should verify dataset metadata structure for all catalogue entries', () => {
      const catalogue = getDatasetCatalogue();
      catalogue.forEach((ds) => {
        const result = verifyDatasetMetadata(ds);
        expect(result.valid).toBe(true);
        expect(result.missingFields).toHaveLength(0);
      });
    });

    it('should retrieve dataset by accession', () => {
      const ds = getDatasetByAccession('NASA-OSDR-RADLAB-ISS-DOSIS');
      expect(ds).not.toBeNull();
      expect(ds.dataType).toContain('Radiation');
      expect(ds.integrationStatus).toBe('VERIFIED_AND_INTEGRATED');
    });

    it('should clearly document access restrictions and IRB governance for astronaut datasets', () => {
      const humanCohortDs = getDatasetByAccession('NASA-HRP-SM-REFERENCE');
      expect(humanCohortDs).not.toBeNull();
      expect(humanCohortDs.accessRestrictions).toContain('RESTRICTED');
      expect(humanCohortDs.integrationStatus).toBe('PROTOCOL_REFERENCED_ONLY');
      expect(humanCohortDs.importableIntoMedula).toBe(false);
    });
  });

  describe('4. Authentic Dataset Import Pipeline', () => {
    it('should import verified NASA OSDR RadLab telemetry and preserve exact provenance', async () => {
      const result = await importVerifiedNasaDataset('NASA-OSDR-RADLAB-ISS-DOSIS');
      expect(result.success).toBe(true);
      expect(result.recordsCount).toBeGreaterThanOrEqual(5);
      expect(result.isSynthetic).toBe(false);

      // Verify persisted records in Dexie
      const stored = await getImportedDatasetRecords('NASA-OSDR-RADLAB-ISS-DOSIS');
      expect(stored.length).toBe(result.recordsCount);

      const firstRecord = stored[0];
      expect(firstRecord.isSynthetic).toBe(false);
      expect(firstRecord.sourceType).toBe('NASA_PUBLIC_RESEARCH_DATASET');
      expect(firstRecord.datasetAccession).toBe('NASA-OSDR-RADLAB-ISS-DOSIS');
      expect(firstRecord.metric).toBe('ambient_radiation_rate');
      expect(firstRecord.unit).toBe('µSv/h');
      expect(firstRecord.provenance).toBeDefined();
      expect(firstRecord.rawTelemetry.absorbedDoseUnit).toBe('µGy/h');
      expect(firstRecord.rawTelemetry.doseEquivalentUnit).toBe('µSv/h');
    });

    it('should import verified NASA OSDR Environmental Data App cabin telemetry', async () => {
      const result = await importVerifiedNasaDataset('NASA-OSDR-EDA-ISS-ENV');
      expect(result.success).toBe(true);
      expect(result.recordsCount).toBeGreaterThanOrEqual(10);
      expect(result.isSynthetic).toBe(false);

      const tempRecords = await getImportedDatasetRecords('NASA-OSDR-EDA-ISS-ENV', 'cabin_temperature');
      expect(tempRecords.length).toBeGreaterThanOrEqual(4);
      expect(tempRecords[0].unit).toBe('°C');
      expect(tempRecords[0].isSynthetic).toBe(false);

      const co2Records = await getImportedDatasetRecords('NASA-OSDR-EDA-ISS-ENV', 'cabin_co2');
      expect(co2Records.length).toBeGreaterThanOrEqual(4);
      expect(co2Records[0].unit).toBe('%');
    });

    it('should correctly report import status and purge records when requested', async () => {
      await importVerifiedNasaDataset('NASA-OSDR-RADLAB-ISS-DOSIS');
      let statuses = await getImportStatus();
      const radlabStatus = statuses.find((s) => s.datasetAccession === 'NASA-OSDR-RADLAB-ISS-DOSIS');
      expect(radlabStatus.imported).toBe(true);
      expect(radlabStatus.recordCount).toBeGreaterThanOrEqual(5);

      await purgeImportedDataset('NASA-OSDR-RADLAB-ISS-DOSIS');
      statuses = await getImportStatus();
      const purgedStatus = statuses.find((s) => s.datasetAccession === 'NASA-OSDR-RADLAB-ISS-DOSIS');
      expect(purgedStatus.imported).toBe(false);
      expect(purgedStatus.recordCount).toBe(0);
    });

    it('should reject import for non-existent or unsupported datasets', async () => {
      await expect(importVerifiedNasaDataset('NON-EXISTENT-DATASET')).rejects.toThrow(
        /not available for direct import/
      );
    });
  });

  describe('5. Offline-First Registry Caching in IndexedDB', () => {
    it('should cache research registry entries into local Dexie IndexedDB', async () => {
      const result = await cacheRegistryLocally();
      expect(result.cachedCount).toBeGreaterThanOrEqual(10);

      const count = await getCachedRegistryCount();
      expect(count).toBe(result.cachedCount);

      const storedInDb = await localDb.researchEvidence.toArray();
      expect(storedInDb.length).toBe(count);
      expect(storedInDb[0].cachedAt).toBeDefined();
    });
  });
});


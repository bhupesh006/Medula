import radLabPayload from '../data/verifiedNasaDatasets/osdrRadLabTelemetry.json';
import edaPayload from '../data/verifiedNasaDatasets/osdrEdaTelemetry.json';
import { localDb } from '../../../database/localDatabase.js';

/**
 * Registry of available verified raw NASA payloads
 */
const VERIFIED_DATASET_PAYLOADS = {
  'NASA-OSDR-RADLAB-ISS-DOSIS': radLabPayload,
  'NASA-OSDR-EDA-ISS-ENV': edaPayload,
};

/**
 * Maps raw NASA OSDR RadLab records into MEDULA research dataset format
 * Preserves source units, timestamps, detector provenance, and marks isSynthetic: false
 */
function mapRadLabRecords(payload) {
  const meta = payload.metadata;
  return payload.records.map((r) => ({
    recordId: `NASA_RADLAB_${r.sourceRecordId}`,
    datasetAccession: meta.datasetAccession,
    sourceSystem: meta.sourceSystem,
    sourceRecordId: r.sourceRecordId,
    recordedAt: r.timestamp,
    metric: 'ambient_radiation_rate',
    value: r.doseEquivalentRate,
    unit: r.doseEquivalentUnit,
    isSynthetic: false,
    sourceType: 'NASA_PUBLIC_RESEARCH_DATASET',
    instrumentId: r.instrumentId,
    spacecraft: r.spacecraft,
    module: r.module,
    trajectory: r.trajectory,
    orbitalRegion: r.orbitalRegion,
    rawTelemetry: {
      absorbedDoseRate: r.absorbedDoseRate,
      absorbedDoseUnit: r.absorbedDoseUnit,
      doseEquivalentRate: r.doseEquivalentRate,
      doseEquivalentUnit: r.doseEquivalentUnit,
    },
    transformationNotes: 'Extracted doseEquivalentRate as ambient_radiation_rate (µSv/h); preserved raw absorbed dose rate and UTC timestamp without interpolation.',
    provenance: meta.provenance,
    attribution: meta.attribution,
    importedAt: new Date().toISOString(),
  }));
}

/**
 * Maps raw NASA OSDR Environmental Data App records into MEDULA research dataset format
 * Preserves source units, timestamps, module context, and marks isSynthetic: false
 */
function mapEdaRecords(payload) {
  const meta = payload.metadata;
  const mapped = [];

  payload.records.forEach((r) => {
    // 1. Cabin Temperature
    mapped.push({
      recordId: `NASA_EDA_${r.sourceRecordId}_TEMP`,
      datasetAccession: meta.datasetAccession,
      sourceSystem: meta.sourceSystem,
      sourceRecordId: r.sourceRecordId,
      recordedAt: r.timestamp,
      metric: 'cabin_temperature',
      value: r.cabinTemperature,
      unit: r.temperatureUnit,
      isSynthetic: false,
      sourceType: 'NASA_PUBLIC_RESEARCH_DATASET',
      spacecraft: r.spacecraft,
      module: r.module,
      operationalContext: r.operationalContext,
      transformationNotes: 'Direct variable mapping from ECLSS cabin temperature telemetry in °C.',
      provenance: meta.provenance,
      attribution: meta.attribution,
      importedAt: new Date().toISOString(),
    });

    // 2. Cabin CO2
    mapped.push({
      recordId: `NASA_EDA_${r.sourceRecordId}_CO2`,
      datasetAccession: meta.datasetAccession,
      sourceSystem: meta.sourceSystem,
      sourceRecordId: r.sourceRecordId,
      recordedAt: r.timestamp,
      metric: 'cabin_co2',
      value: r.cabinCo2,
      unit: r.co2Unit,
      isSynthetic: false,
      sourceType: 'NASA_PUBLIC_RESEARCH_DATASET',
      spacecraft: r.spacecraft,
      module: r.module,
      operationalContext: r.operationalContext,
      transformationNotes: 'Direct variable mapping from ECLSS cabin CO2 volumetric percentage (%).',
      provenance: meta.provenance,
      attribution: meta.attribution,
      importedAt: new Date().toISOString(),
    });

    // 3. Cabin Humidity
    mapped.push({
      recordId: `NASA_EDA_${r.sourceRecordId}_HUMIDITY`,
      datasetAccession: meta.datasetAccession,
      sourceSystem: meta.sourceSystem,
      sourceRecordId: r.sourceRecordId,
      recordedAt: r.timestamp,
      metric: 'cabin_humidity',
      value: r.cabinHumidity,
      unit: r.humidityUnit,
      isSynthetic: false,
      sourceType: 'NASA_PUBLIC_RESEARCH_DATASET',
      spacecraft: r.spacecraft,
      module: r.module,
      operationalContext: r.operationalContext,
      transformationNotes: 'Direct variable mapping from ECLSS relative humidity (%).',
      provenance: meta.provenance,
      attribution: meta.attribution,
      importedAt: new Date().toISOString(),
    });
  });

  return mapped;
}

/**
 * Import a verified NASA public dataset into local Dexie storage
 * @param {string} accession 
 * @returns {Promise<Object>} Import summary result
 */
export async function importVerifiedNasaDataset(accession) {
  if (!accession) {
    throw new Error('Dataset accession is required for import.');
  }

  const payload = VERIFIED_DATASET_PAYLOADS[accession];
  if (!payload) {
    throw new Error(
      `Dataset accession "${accession}" is not available for direct import. Check catalogue for access restrictions.`
    );
  }

  let mappedRecords = [];
  if (accession === 'NASA-OSDR-RADLAB-ISS-DOSIS') {
    mappedRecords = mapRadLabRecords(payload);
  } else if (accession === 'NASA-OSDR-EDA-ISS-ENV') {
    mappedRecords = mapEdaRecords(payload);
  } else {
    throw new Error(`Unsupported mapping pipeline for accession "${accession}".`);
  }

  // Persist into Dexie researchDatasets store
  if (localDb && localDb.researchDatasets) {
    await localDb.researchDatasets.bulkPut(mappedRecords);
  }

  return {
    success: true,
    datasetAccession: accession,
    datasetTitle: payload.metadata.datasetTitle,
    sourceSystem: payload.metadata.sourceSystem,
    recordsCount: mappedRecords.length,
    isSynthetic: false,
    provenance: payload.metadata.provenance,
    attribution: payload.metadata.attribution,
    importedAt: new Date().toISOString(),
  };
}

/**
 * Retrieve imported research dataset records from Dexie IndexedDB
 * @param {string} accession 
 * @param {string} [metric] 
 * @returns {Promise<Array<Object>>}
 */
export async function getImportedDatasetRecords(accession, metric) {
  if (!localDb || !localDb.researchDatasets) return [];

  let query = localDb.researchDatasets.where('datasetAccession').equals(accession);
  let records = await query.toArray();

  if (metric) {
    records = records.filter((r) => r.metric === metric);
  }

  return records.sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
}

/**
 * Get import status across all verified NASA datasets
 * @returns {Promise<Array<Object>>}
 */
export async function getImportStatus() {
  const statuses = [];

  for (const [accession, payload] of Object.entries(VERIFIED_DATASET_PAYLOADS)) {
    let count = 0;
    if (localDb && localDb.researchDatasets) {
      count = await localDb.researchDatasets.where('datasetAccession').equals(accession).count();
    }

    statuses.push({
      datasetAccession: accession,
      datasetTitle: payload.metadata.datasetTitle,
      sourceSystem: payload.metadata.sourceSystem,
      imported: count > 0,
      recordCount: count,
      isSynthetic: false,
      provenance: payload.metadata.provenance,
    });
  }

  return statuses;
}

/**
 * Remove an imported dataset from local IndexedDB
 * @param {string} accession 
 * @returns {Promise<{ deleted: boolean, accession: string }>}
 */
export async function purgeImportedDataset(accession) {
  if (localDb && localDb.researchDatasets) {
    const toDelete = await localDb.researchDatasets
      .where('datasetAccession')
      .equals(accession)
      .primaryKeys();
    await localDb.researchDatasets.bulkDelete(toDelete);
  }

  return { deleted: true, accession };
}


import datasetCatalogue from '../data/nasaDatasetCatalogue.json';

/**
 * Mandatory metadata fields required for every catalogued NASA dataset
 */
const MANDATORY_METADATA_FIELDS = [
  'datasetAccession',
  'datasetName',
  'researchObjective',
  'dataType',
  'variablesAvailable',
  'units',
  'studySubjects',
  'accessRestrictions',
  'relevanceToMedula',
  'sourceSystem',
  'sourceURL',
  'integrationStatus',
];

/**
 * Get all catalogued NASA OSDR and HRP datasets
 * @param {Object} [filter] Optional filter by integration status or search text
 * @returns {Array<Object>}
 */
export function getDatasetCatalogue(filter = {}) {
  let datasets = [...datasetCatalogue];

  if (filter.status) {
    datasets = datasets.filter((d) => d.integrationStatus === filter.status);
  }

  if (filter.importableOnly) {
    datasets = datasets.filter((d) => d.importableIntoMedula === true);
  }

  if (filter.query) {
    const q = filter.query.toLowerCase();
    datasets = datasets.filter(
      (d) =>
        d.datasetAccession.toLowerCase().includes(q) ||
        d.datasetName.toLowerCase().includes(q) ||
        d.researchObjective.toLowerCase().includes(q) ||
        d.dataType.toLowerCase().includes(q)
    );
  }

  return datasets;
}

/**
 * Retrieve single dataset by accession ID
 * @param {string} accession 
 * @returns {Object|null}
 */
export function getDatasetByAccession(accession) {
  if (!accession) return null;
  return datasetCatalogue.find((d) => d.datasetAccession === accession) || null;
}

/**
 * Verify dataset metadata structure and return validation diagnostics
 * @param {Object} dataset 
 * @returns {{ valid: boolean, missingFields: Array<string> }}
 */
export function verifyDatasetMetadata(dataset) {
  if (!dataset || typeof dataset !== 'object') {
    return { valid: false, missingFields: ['dataset_object'] };
  }

  const missingFields = [];
  for (const field of MANDATORY_METADATA_FIELDS) {
    if (dataset[field] === undefined || dataset[field] === null || dataset[field] === '') {
      missingFields.push(field);
    }
  }

  // Validate variables and units
  if (dataset.variablesAvailable && !Array.isArray(dataset.variablesAvailable)) {
    missingFields.push('variablesAvailable_must_be_array');
  }

  if (dataset.units && typeof dataset.units !== 'object') {
    missingFields.push('units_must_be_object');
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get summary statistics for the dataset catalogue
 * @returns {Object}
 */
export function getDatasetCatalogueSummary() {
  const total = datasetCatalogue.length;
  const verifiedAndIntegrated = datasetCatalogue.filter(
    (d) => d.integrationStatus === 'VERIFIED_AND_INTEGRATED'
  ).length;
  const cataloguedReference = datasetCatalogue.filter(
    (d) => d.integrationStatus === 'CATALOGUED_REFERENCE'
  ).length;
  const protocolReferencedOnly = datasetCatalogue.filter(
    (d) => d.integrationStatus === 'PROTOCOL_REFERENCED_ONLY'
  ).length;

  return {
    total,
    verifiedAndIntegrated,
    cataloguedReference,
    protocolReferencedOnly,
  };
}


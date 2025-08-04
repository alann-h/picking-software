// src/api/runs.ts
import { apiCallGet, apiCallPost, apiCallPut } from '../utils/apiHelpers';
import { Run } from '../utils/types';

/**
 * Creates a new run entry.
 * @param {number} quoteId The ID of the quote to associate with the run.
 * @param {string} companyId The ID of the company creating the run.
 * @returns {Promise<Run>} The newly created run object.
 */
export const createRunFromQuotes  = async (orderedQuoteIds: number[], companyId: string): Promise<Run> => {
  // Use apiCallPost for POST requests
  const data = await apiCallPost('runs/bulk', { orderedQuoteIds, companyId });
  return data;
};

/**
 * Fetches all active runs for a specific company.
 * @param {string} companyId The ID of the company.
 * @returns {Promise<Run[]>} A list of run objects.
 */
export const getRuns = async (companyId: string): Promise<Run[]> => {
  // Use apiCallGet for GET requests with a path parameter
  const data = await apiCallGet(`runs/company/${companyId}`);
  return data;
};

/**
 * Updates the status of an existing run.
 * @param {string} runId The ID of the run to update.
 * @param {'pending' | 'checking' | 'finalised'} status The new status to set.
 * @returns {Promise<Run>} The updated run object.
 */
export const updateRunStatus = async (runId: string, status: 'pending' | 'checking' | 'finalised'): Promise<Run> => {
  const data = await apiCallPut(`runs/${runId}/status`, { status });
  return data;
};
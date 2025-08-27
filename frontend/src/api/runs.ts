// src/api/runs.ts
import { apiCallDelete, apiCallGet, apiCallPost, apiCallPut } from '../utils/apiHelpers';
import { Run } from '../utils/types';
import { RUNS_BASE } from './config';

/**
 * Creates a new run entry.
 * @param {number} quoteId The ID of the quote to associate with the run.
 * @param {string} companyId The ID of the company creating the run.
 * @returns {Promise<Run>} The newly created run object.
 */
export const createRunFromQuotes  = async (orderedQuoteIds: string[], companyId: string): Promise<Run> => {
  const data = await apiCallPost(`${RUNS_BASE}/bulk`, { orderedQuoteIds, companyId });
  return data;
};

/**
 * Fetches all active runs for a specific company.
 * @param {string} companyId The ID of the company.
 * @returns {Promise<Run[]>} A list of run objects.
 */
export const getRuns = async (companyId: string): Promise<Run[]> => {
  const data = await apiCallGet(`${RUNS_BASE}/company/${companyId}`);
  return data;
};

/**
 * Updates the status of an existing run.
 * @param {string} runId The ID of the run to update.
 * @param {'pending' | 'checking' | 'finalised'} status The new status to set.
 * @returns {Promise<Run>} The updated run object.
 */
export const updateRunStatus = async (runId: string, status: 'pending' | 'checking' | 'finalised'): Promise<Run> => {
  const data = await apiCallPut(`${RUNS_BASE}/${runId}/status`, { status });
  return data;
};

export const updateRunQuotes  = async (runId: string, orderedQuoteIds: string[]): Promise<Run> => {
  const data = await apiCallPost(`${RUNS_BASE}/${runId}`, { orderedQuoteIds });
  return data;
};

export const deleteRun  = async (runId: string): Promise<void> => {
  const data = await apiCallDelete(`${RUNS_BASE}/${runId}`);
  return data;
};

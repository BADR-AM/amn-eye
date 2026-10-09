import { QUERY_CATALOG } from './queryCatalog.js';

/**
 * Validated schema for AI intent extraction.
 * Guarantees that any extracted intent strictly corresponds to an allowlisted query ID.
 */

export const ALLOWED_INTENT_IDS = Object.keys(QUERY_CATALOG);

export function validateIntent(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const { intent, params } = parsed;
  if (!intent || !ALLOWED_INTENT_IDS.includes(intent)) {
    return null;
  }

  const cleanParams = {};
  if (params && typeof params === 'object') {
    if (typeof params.query === 'string') cleanParams.query = params.query.slice(0, 100).trim();
    if (typeof params.term === 'string') cleanParams.query = params.term.slice(0, 100).trim();
    if (typeof params.national_id === 'string') cleanParams.national_id = params.national_id.replace(/\D/g, '').slice(0, 14);
    if (typeof params.company === 'string') cleanParams.company = params.company.slice(0, 50).trim();
    if (typeof params.trade === 'string') cleanParams.trade = params.trade.slice(0, 50).trim();
    if (typeof params.location === 'string') cleanParams.location = params.location.slice(0, 50).trim();
    if (typeof params.hospital === 'string') cleanParams.hospital = params.hospital.slice(0, 50).trim();
    if (params.batchId) cleanParams.batchId = parseInt(params.batchId, 10) || undefined;
    if (params.status === 'open' || params.status === 'closed') cleanParams.status = params.status;
  }

  return {
    intent,
    params: cleanParams,
    userFacingExplanation: parsed.explanation || 'تنفيذ الاستعلام الأمني المعتمد'
  };
}

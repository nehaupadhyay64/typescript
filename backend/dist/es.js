import { Client } from '@elastic/elasticsearch';
import { config } from './config.js';
export const es = new Client({ node: config.elasticsearchUrl });
export async function ensureEmailIndex() { try {
    await es.indices.exists({ index: 'emails' }).then(async (r) => { if (!r)
        await es.indices.create({ index: 'emails' }); });
}
catch { } }
export async function indexEmail(doc) { try {
    await es.index({ index: 'emails', id: String(doc.id), document: doc, refresh: 'wait_for' });
}
catch (e) {
    console.warn('Elasticsearch unavailable; skipped indexing');
} }
export async function searchEmails(q, tenantId) { try {
    const r = await es.search({ index: 'emails', query: { bool: { must: [{ term: { tenantId } }, { multi_match: { query: q, fields: ['recipient', 'subject', 'sender'] } }] } } });
    return r.hits.hits.map(h => h._source);
}
catch {
    return [];
} }

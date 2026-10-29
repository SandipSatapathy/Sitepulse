import { query } from '../client.js';
export class StripeRepository {
    inMemoryCache = new Set();
    async hasProcessedStripeEvent(eventId) {
        if (this.inMemoryCache.has(eventId))
            return true;
        try {
            const res = await query('SELECT event_id FROM stripe_events WHERE event_id = $1', [eventId]);
            if (res.rowCount && res.rowCount > 0) {
                this.inMemoryCache.add(eventId);
                return true;
            }
        }
        catch { }
        return false;
    }
    async markStripeEventProcessed(eventId, eventType) {
        this.inMemoryCache.add(eventId);
        try {
            await query(`INSERT INTO stripe_events (event_id, event_type, processed_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id) DO NOTHING`, [eventId, eventType, new Date().toISOString()]);
        }
        catch { }
    }
}
export const stripeRepository = new StripeRepository();

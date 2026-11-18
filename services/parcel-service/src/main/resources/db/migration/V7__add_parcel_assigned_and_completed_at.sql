-- Record when a parcel was assigned to its current courier and when it reached a
-- terminal status (DELIVERED, FAILED, CANCELLED). The courier run sheet uses
-- assigned_at to order open work and completed_at to filter history by day,
-- instead of relying on created_at or the general-purpose updated_at.
ALTER TABLE parcels
    ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- Backfill assigned_at from the latest assignment entry in status_history.
UPDATE parcels p
SET assigned_at = COALESCE(
        (SELECT MAX(h.created_at)
         FROM status_history h
         WHERE h.parcel_id = p.id
           AND (h.reason LIKE 'Assigned to courier %' OR h.reason LIKE 'Reassigned to courier %')),
        p.updated_at)
WHERE p.courier_id IS NOT NULL;

-- Backfill completed_at from the history entry that moved the parcel to its terminal status.
UPDATE parcels p
SET completed_at = COALESCE(
        (SELECT MAX(h.created_at)
         FROM status_history h
         WHERE h.parcel_id = p.id
           AND h.to_status = p.status),
        p.updated_at)
WHERE p.status IN ('DELIVERED', 'FAILED', 'CANCELLED');

CREATE INDEX idx_parcels_courier_status ON parcels (courier_id, status);
CREATE INDEX idx_parcels_courier_completed_at ON parcels (courier_id, completed_at);

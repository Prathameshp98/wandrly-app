'use client';

import { TripListView } from '@/components/dashboard/TripListView';

/**
 * FR-TRIP-08. Note the query value is `archive`, not `archived` — the contract
 * is specific, and the backend's own journey test tripped on exactly that.
 */
export default function ArchivePage() {
  return (
    <TripListView
      view="archive"
      eyebrow="The archive"
      title="Past & shelved journeys."
      empty={{
        title: 'Nothing archived yet',
        body: 'Archived journeys are kept here, out of the way but never deleted.',
      }}
    />
  );
}

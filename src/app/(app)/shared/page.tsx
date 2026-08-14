'use client';

import { TripListView } from '@/components/dashboard/TripListView';

/** FR-COLLAB-11: trips you are a member of but do not own. Always unfiled. */
export default function SharedPage() {
  return (
    <TripListView
      view="shared"
      eyebrow="Shared with you"
      title="Trips from your crews."
      empty={{
        title: 'Nothing shared with you yet',
        body: 'When someone adds you to a journey, it appears here.',
      }}
    />
  );
}

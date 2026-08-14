'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { TripListView } from '@/components/dashboard/TripListView';
import { useFolders } from '@/lib/api/hooks/useTrips';

/**
 * FR-FOLD-03. The dashboard layout, filtered to one folder, with a dismissable
 * pill that returns you to the unfiltered board.
 */
export default function FolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = use(params);
  const router = useRouter();
  const { data: folders } = useFolders();

  const folder = folders?.items?.find((candidate) => candidate.id === folderId);

  return (
    <TripListView
      view="folder"
      folderId={folderId}
      eyebrow="Folder"
      // The heading waits for the folder rather than flashing a placeholder
      // name that then changes under the reader.
      title={folder ? `${folder.emoji}  ${folder.name}` : 'Folder'}
      filter={
        folder
          ? { label: `${folder.emoji} ${folder.name}`, onClear: () => router.push('/') }
          : undefined
      }
      empty={{
        title: 'This folder is empty',
        body: 'Drag a journey onto it, or use “Move to folder…” from any trip card.',
        cta: 'Begin a Journey',
      }}
    />
  );
}

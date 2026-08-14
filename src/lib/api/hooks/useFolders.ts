'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { userMessage } from '../errors';
import { keys } from '../keys';
import { toast } from '@/stores/toasts';
import type { CreateFolderBody, Folder, Folders } from '@/types/domain';

/** The five tones PRD §12 offers for a folder. */
export const FOLDER_TONES = ['gold', 'teal', 'sienna', 'forest', 'sand'] as const;
export type FolderTone = (typeof FOLDER_TONES)[number];

/** The twelve-emoji palette from the prototype's NewFolderModal (D-05). */
export const FOLDER_EMOJI = [
  '🗺',
  '🌅',
  '✈️',
  '🏔',
  '🏝',
  '🍜',
  '🌃',
  '🌸',
  '🗾',
  '⛰',
  '🏛',
  '🌙',
] as const;

function useFolderMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  options: {
    optimistic?: (previous: Folders | undefined, input: TInput) => Folders | undefined;
    errorPrefix: string;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    onMutate: async (input: TInput) => {
      if (!options.optimistic) return {};
      await queryClient.cancelQueries({ queryKey: keys.folders });
      const previous = queryClient.getQueryData<Folders>(keys.folders);
      queryClient.setQueryData<Folders>(keys.folders, (data) => options.optimistic!(data, input));
      return { previous };
    },

    onError: (error, _input, context) => {
      if (context && 'previous' in context) {
        queryClient.setQueryData(keys.folders, context.previous);
      }
      toast.error(`${options.errorPrefix} — ${userMessage(error)}`);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keys.folders });
      // Folder membership changes trip counts and the folder filter.
      void queryClient.invalidateQueries({ queryKey: keys.trips });
    },
  });
}

export function useCreateFolder() {
  return useFolderMutation<CreateFolderBody, Folder>(
    (body) => api<Folder>('/v1/folders', { method: 'POST', body }),
    { errorPrefix: 'Could not create that folder' },
  );
}

export function useUpdateFolder() {
  return useFolderMutation<{ id: string } & Partial<Folder>, Folder>(
    ({ id, ...body }) => api<Folder>(`/v1/folders/${id}`, { method: 'PATCH', body }),
    {
      optimistic: (previous, { id, ...patch }) => {
        if (!previous?.items) return previous;
        return {
          ...previous,
          items: previous.items.map((folder) =>
            folder.id === id ? { ...folder, ...patch } : folder,
          ),
        };
      },
      errorPrefix: 'Could not update that folder',
    },
  );
}

/**
 * Deleting a folder unfiles its trips; it does not delete them (FR-FOLD-07).
 * The trips query is invalidated in `onSettled`, so they reappear unfiled.
 */
export function useDeleteFolder() {
  return useFolderMutation<{ id: string; name?: string }, void>(
    ({ id }) => api<void>(`/v1/folders/${id}`, { method: 'DELETE' }),
    {
      optimistic: (previous, { id }) => {
        if (!previous?.items) return previous;
        return { ...previous, items: previous.items.filter((folder) => folder.id !== id) };
      },
      errorPrefix: 'Could not delete that folder',
    },
  );
}

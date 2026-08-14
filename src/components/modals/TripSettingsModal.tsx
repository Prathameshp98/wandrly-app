'use client';

import { useEffect, useState } from 'react';
import { Button, Input, ModalShell, Select } from '@/components/primitives';
import { DateChangeModal, type DateChangeDetail, type DateChangeStrategy } from './DateChangeModal';
import { DateChangeRequired, useFolders, useUpdateTrip } from '@/lib/api/hooks/useTrips';
import { fieldErrors } from '@/lib/api/errors';
import { toast } from '@/stores/toasts';
import type { Trip } from '@/types/domain';
import styles from './modals.module.css';

const STATUSES = ['DRAFT', 'PLANNING', 'CONFIRMED', 'COMPLETED'] as const;

/**
 * FR-TRIP-06 — trip settings.
 *
 * `version` goes with every write. Trips carry an optimistic-concurrency
 * version and the server rejects a stale one with `409 CONFLICT_STALE`, which
 * is how FR-COLLAB-07 prevents a silent lost update when two people edit at
 * once. The value sent is the one this form was opened with.
 */
export function TripSettingsModal({
  trip,
  open,
  onClose,
}: {
  trip: Trip | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: folders } = useFolders();
  const updateTrip = useUpdateTrip();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<string>('PLANNING');
  const [folderId, setFolderId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // The date-change prompt, held until the server asks for a decision.
  const [dateConflict, setDateConflict] = useState<DateChangeDetail | null>(null);

  useEffect(() => {
    if (!open || !trip) return;
    setTitle(trip.title ?? '');
    setSubtitle(trip.subtitle ?? '');
    setDestination(trip.destination ?? '');
    setStartDate(trip.startDate ?? '');
    setEndDate(trip.endDate ?? '');
    setStatus(trip.status ?? 'PLANNING');
    setFolderId(trip.folderId ?? '');
    setErrors({});
    setDateConflict(null);
  }, [open, trip]);

  if (!trip) return null;

  const datesInverted = Boolean(startDate && endDate && endDate < startDate);

  function buildPatch(strategy?: DateChangeStrategy) {
    return {
      tripId: trip!.id,
      version: trip!.version,
      title: title.trim(),
      subtitle: subtitle.trim(),
      destination: destination.trim(),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      status: status as never,
      ...(folderId ? { folderId } : {}),
      ...(strategy ? { dateChangeStrategy: strategy } : {}),
    };
  }

  async function save(strategy?: DateChangeStrategy) {
    setErrors({});

    if (datesInverted) {
      setErrors({ endDate: 'The end date comes before the start date.' });
      return;
    }

    try {
      await updateTrip.mutateAsync(buildPatch(strategy));
      toast.success(`Saved “${title.trim() || trip!.title}”`);
      setDateConflict(null);
      onClose();
    } catch (error) {
      // Not a failure — the server is asking a question only the user can
      // answer, so the prompt opens rather than an error appearing.
      if (error instanceof DateChangeRequired) {
        setDateConflict((error.detail.details as DateChangeDetail) ?? {});
        return;
      }
      const fields = fieldErrors(error);
      if (Object.keys(fields).length > 0) setErrors(fields);
    }
  }

  return (
    <>
      <ModalShell
        open={open && !dateConflict}
        onClose={onClose}
        title="Trip settings"
        lede="Rename it, move it, or change when you are going."
        footer={
          <>
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="trip-settings-form"
              variant="primary"
              loading={updateTrip.isPending}
              disabled={!title.trim() || !destination.trim() || datesInverted}
            >
              Save changes
            </Button>
          </>
        }
      >
        <form
          id="trip-settings-form"
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          noValidate
        >
          <Input
            label="Title"
            value={title}
            maxLength={80}
            showCounter
            onChange={(event) => setTitle(event.target.value)}
            error={errors.title}
            required
          />

          <Input
            label="Subtitle"
            optional
            value={subtitle}
            maxLength={120}
            showCounter
            onChange={(event) => setSubtitle(event.target.value)}
            error={errors.subtitle}
          />

          <Input
            label="Destination"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            error={errors.destination}
            required
          />

          <div className={styles.pair}>
            <Input
              label="Start date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              error={errors.startDate}
            />
            <Input
              label="End date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              error={errors.endDate ?? (datesInverted ? 'Before the start date.' : undefined)}
            />
          </div>

          <div className={styles.pair}>
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0) + option.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>

            <Select
              label="Folder"
              optional
              value={folderId}
              onChange={(event) => setFolderId(event.target.value)}
            >
              <option value="">No folder</option>
              {folders?.items?.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.emoji} {folder.name}
                </option>
              ))}
            </Select>
          </div>
        </form>
      </ModalShell>

      <DateChangeModal
        open={Boolean(dateConflict)}
        detail={dateConflict ?? {}}
        pending={updateTrip.isPending}
        onClose={() => setDateConflict(null)}
        onConfirm={(strategy) => void save(strategy)}
      />
    </>
  );
}

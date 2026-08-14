'use client';

import { useEffect, useState } from 'react';
import { Button, Input, ModalShell, Select } from '@/components/primitives';
import { useCreateTrip, useFolders } from '@/lib/api/hooks/useTrips';
import { fieldErrors } from '@/lib/api/errors';
import { toast } from '@/stores/toasts';
import styles from './modals.module.css';

/**
 * FR-TRIP-01. Destination is the only required field — the trip is created as
 * a DRAFT with one Main variant and one empty day per date, and everything
 * else is editable afterwards. Asking for less up front is the point.
 */
export function NewTripModal({
  open,
  onClose,
  onCreated,
  defaultFolderId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (tripId: string) => void;
  defaultFolderId?: string;
}) {
  const { data: folders } = useFolders();
  const createTrip = useCreateTrip();

  const [destination, setDestination] = useState('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [folderId, setFolderId] = useState(defaultFolderId ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset on open, so a cancelled attempt does not prefill the next one.
  useEffect(() => {
    if (!open) return;
    setDestination('');
    setTitle('');
    setStartDate('');
    setEndDate('');
    setFolderId(defaultFolderId ?? '');
    setErrors({});
  }, [open, defaultFolderId]);

  const datesInverted = Boolean(startDate && endDate && endDate < startDate);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    if (datesInverted) {
      setErrors({ endDate: 'The end date comes before the start date.' });
      return;
    }

    try {
      const trip = await createTrip.mutateAsync({
        destination: destination.trim(),
        // The server titles the trip after the destination when none is given.
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(folderId ? { folderId } : {}),
      });

      toast.success(`Created “${trip.title}”`);
      onCreated(trip.id);
    } catch (error) {
      // Field-level messages go back to their inputs; anything else already
      // surfaced as a toast from the mutation.
      const fields = fieldErrors(error);
      if (Object.keys(fields).length > 0) setErrors(fields);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Begin a journey"
      lede="Where to next?"
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-trip-form"
            variant="primary"
            loading={createTrip.isPending}
            disabled={!destination.trim() || datesInverted}
          >
            Create journey
          </Button>
        </>
      }
    >
      <form id="new-trip-form" className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          label="Destination"
          placeholder="Kyoto, Japan"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          error={errors.destination}
          required
          autoFocus
        />

        <Input
          label="Title"
          optional
          hint="Defaults to the destination"
          placeholder="Kyoto in Spring"
          value={title}
          maxLength={80}
          showCounter
          onChange={(event) => setTitle(event.target.value)}
          error={errors.title}
        />

        <div className={styles.pair}>
          <Input
            label="Start date"
            optional
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            error={errors.startDate}
          />
          <Input
            label="End date"
            optional
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
            error={errors.endDate ?? (datesInverted ? 'Before the start date.' : undefined)}
          />
        </div>

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
      </form>
    </ModalShell>
  );
}

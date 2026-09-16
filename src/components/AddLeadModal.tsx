import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { LEAD_SOURCES, SOURCE_LABELS } from '../types';
import { LeadValidationError, normalizeLeadInput, isLikelyDuplicate } from '../data/leadIntake';
import { Button, Field, Input, Modal, Select, Textarea } from './ui';

const BLANK = {
  name: '',
  email: '',
  phone: '',
  address: '',
  description: '',
  source: 'website_form',
};

/**
 * Mirrors the website quote form field-for-field. Submitting calls
 * store.createLead — the same entry point an automation would hit later.
 */
export function AddLeadModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const { createLead, snapshot } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set(key: keyof typeof BLANK, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function close() {
    setForm(BLANK);
    setErrors({});
    onClose();
  }

  async function submit() {
    setSaving(true);
    setErrors({});
    try {
      const normalized = normalizeLeadInput(form);
      const duplicate = snapshot.leads.find((lead) => isLikelyDuplicate(normalized, lead));
      if (
        duplicate &&
        !window.confirm(
          `${duplicate.name} already has a record with that email or phone. Add this as a separate lead anyway?`,
        )
      ) {
        setSaving(false);
        return;
      }

      const lead = await createLead(form);
      close();
      navigate(`/leads/${lead.id}`);
    } catch (err) {
      if (err instanceof LeadValidationError) {
        setErrors(err.fieldErrors);
      } else {
        setErrors({ name: err instanceof Error ? err.message : 'Could not save the lead.' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Add lead"
      onClose={close}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={saving}>
            {saving ? 'Saving…' : 'Save lead'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" error={errors.name}>
          <Input
            value={form.name}
            autoFocus
            placeholder="Homeowner name"
            onChange={(event) => set('name', event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              inputMode="email"
              value={form.email}
              placeholder="name@example.com"
              onChange={(event) => set('email', event.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input
              type="tel"
              inputMode="tel"
              value={form.phone}
              placeholder="(612) 555-0100"
              onChange={(event) => set('phone', event.target.value)}
            />
          </Field>
        </div>

        <Field label="Project address">
          <Input
            value={form.address}
            placeholder="Street, city, state"
            onChange={(event) => set('address', event.target.value)}
          />
        </Field>

        <Field label="Project description">
          <Textarea
            value={form.description}
            placeholder="What are they asking for?"
            onChange={(event) => set('description', event.target.value)}
          />
        </Field>

        <Field label="Lead source">
          <Select value={form.source} onChange={(event) => set('source', event.target.value)}>
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {SOURCE_LABELS[source]}
              </option>
            ))}
          </Select>
        </Field>

        <p className="text-xs text-steel-500">
          Photos and files can be attached on the lead page after saving.
        </p>
      </div>
    </Modal>
  );
}

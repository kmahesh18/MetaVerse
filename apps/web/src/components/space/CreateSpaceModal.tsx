'use client';

import { useState, type FormEvent } from 'react';
import { CURATED_ROOM_TEMPLATES } from '@metaverse/shared';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { RetroSelect } from '@/components/ui/Select';

interface CreateSpaceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface RoomBlueprintForm {
  id: string;
  templateKey: string;
  name: string;
  isDefault: boolean;
}

const DEFAULT_BLUEPRINTS: RoomBlueprintForm[] = [
  {
    id: 'friendly-lobby',
    templateKey: 'friendly-lobby',
    name: 'Welcome Lobby',
    isDefault: true,
  },
  {
    id: 'open-office',
    templateKey: 'open-office',
    name: 'Open Office',
    isDefault: false,
  },
];

const TEMPLATE_LABELS = Object.fromEntries(
  CURATED_ROOM_TEMPLATES.map((template) => [template.key, template.name])
);

function createBlueprintId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CreateSpaceModal({ open, onClose, onCreated }: CreateSpaceModalProps) {
  const token = useAuthStore((s) => s.accessToken);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'invite-only'>('private');
  const [roomBlueprints, setRoomBlueprints] = useState<RoomBlueprintForm[]>(DEFAULT_BLUEPRINTS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setName('');
    setSlug('');
    setDescription('');
    setVisibility('private');
    setRoomBlueprints(DEFAULT_BLUEPRINTS);
    setError('');
    setLoading(false);
  }

  function handleNameChange(value: string) {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40)
    );
  }

  function updateBlueprint(id: string, patch: Partial<RoomBlueprintForm>) {
    setRoomBlueprints((current) =>
      current.map((blueprint) => {
        if (blueprint.id !== id) return blueprint;

        if (patch.templateKey) {
          return {
            ...blueprint,
            templateKey: patch.templateKey,
            name: patch.name ?? TEMPLATE_LABELS[patch.templateKey] ?? blueprint.name,
            isDefault: patch.isDefault ?? blueprint.isDefault,
          };
        }

        return { ...blueprint, ...patch };
      })
    );
  }

  function setDefaultBlueprint(id: string) {
    setRoomBlueprints((current) =>
      current.map((blueprint) => ({
        ...blueprint,
        isDefault: blueprint.id === id,
      }))
    );
  }

  function moveBlueprint(id: string, direction: -1 | 1) {
    setRoomBlueprints((current) => {
      const index = current.findIndex((blueprint) => blueprint.id === id);
      if (index === -1) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function addBlueprint() {
    if (roomBlueprints.length >= 8) return;
    const template = CURATED_ROOM_TEMPLATES[roomBlueprints.length % CURATED_ROOM_TEMPLATES.length];
    setRoomBlueprints((current) => [
      ...current,
      {
        id: createBlueprintId(),
        templateKey: template.key,
        name: template.name,
        isDefault: false,
      },
    ]);
  }

  function duplicateBlueprint(id: string) {
    if (roomBlueprints.length >= 8) return;
    const original = roomBlueprints.find((blueprint) => blueprint.id === id);
    if (!original) return;
    setRoomBlueprints((current) => [
      ...current,
      {
        ...original,
        id: createBlueprintId(),
        name: `${original.name} Copy`,
        isDefault: false,
      },
    ]);
  }

  function removeBlueprint(id: string) {
    setRoomBlueprints((current) => {
      if (current.length === 1) return current;
      const next = current.filter((blueprint) => blueprint.id !== id);
      if (next.some((blueprint) => blueprint.isDefault)) {
        return next;
      }
      return next.map((blueprint, index) => ({
        ...blueprint,
        isDefault: index === 0,
      }));
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api('/spaces', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({
          name,
          slug,
          description,
          visibility,
          roomBlueprints: roomBlueprints.map((blueprint) => ({
            templateKey: blueprint.templateKey,
            name: blueprint.name,
            isDefault: blueprint.isDefault,
          })),
        }),
      });
      onCreated();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create space');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md">
      <div className="retro-panel w-full max-w-4xl rounded-[32px] p-6 text-foreground shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="retro-display text-[11px] text-foreground/50">Builder</p>
            <h2 className="mt-2 text-2xl font-semibold">Create a collaborative space</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Start with a lobby and office, then shape the room mix your team actually needs.
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="rounded-full border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
          <div className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="retro-display text-[11px] text-muted-foreground">Space Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  required
                  maxLength={60}
                  className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  placeholder="Open Source Lab"
                />
              </label>
              <label className="space-y-2">
                <span className="retro-display text-[11px] text-muted-foreground">Slug</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  required
                  maxLength={40}
                  pattern="^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$"
                  className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  placeholder="open-source-lab"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="retro-display text-[11px] text-muted-foreground">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="retro-input w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none"
                placeholder="A friendly shared office for building and reviewing together."
              />
            </label>

            <div>
              <p className="retro-display text-[11px] text-muted-foreground">Visibility</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['private', 'invite-only', 'public'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setVisibility(option)}
                    className={`rounded-full px-4 py-2 text-sm capitalize transition-colors ${
                      visibility === option
                        ? 'retro-button'
                        : 'retro-button-subtle text-foreground/80 hover:bg-muted'
                    }`}
                  >
                    {option.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-muted p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="retro-display text-[11px] text-foreground/50">Room Builder</p>
                <h3 className="mt-1 text-lg font-semibold">Choose 1 to 8 rooms</h3>
              </div>
              <button
                type="button"
                onClick={addBlueprint}
                disabled={roomBlueprints.length >= 8}
                className="retro-button rounded-full px-4 py-2 text-sm disabled:opacity-45"
              >
                + Add Room
              </button>
            </div>

            <div className="space-y-3">
              {roomBlueprints.map((blueprint, index) => (
                <div key={blueprint.id} className="rounded-[24px] border border-border bg-secondary p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDefaultBlueprint(blueprint.id)}
                        className={`rounded-full px-3 py-1 text-[11px] retro-display ${
                          blueprint.isDefault
                            ? 'bg-foreground/15 text-foreground'
                            : 'bg-background text-muted-foreground'
                        }`}
                      >
                        {blueprint.isDefault ? 'Entry Room' : 'Set Entry'}
                      </button>
                      <span className="text-xs text-muted-foreground">Room {index + 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => moveBlueprint(blueprint.id, -1)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
                        ↑
                      </button>
                      <button type="button" onClick={() => moveBlueprint(blueprint.id, 1)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
                        ↓
                      </button>
                      <button type="button" onClick={() => duplicateBlueprint(blueprint.id)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted">
                        Duplicate
                      </button>
                      <button type="button" onClick={() => removeBlueprint(blueprint.id)} disabled={roomBlueprints.length === 1} className="rounded-full border border-destructive/20 px-3 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-45">
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <label className="space-y-2">
                      <span className="retro-display text-[10px] text-muted-foreground">Template</span>
                      <RetroSelect
                        value={blueprint.templateKey}
                        onChange={(val) => updateBlueprint(blueprint.id, { templateKey: val })}
                        options={CURATED_ROOM_TEMPLATES.map(t => ({ label: t.name, value: t.key }))}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="retro-display text-[10px] text-muted-foreground">Room Name</span>
                      <input
                        type="text"
                        value={blueprint.name}
                        onChange={(event) => updateBlueprint(blueprint.id, { name: event.target.value })}
                        maxLength={60}
                        required
                        className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
              <span>{roomBlueprints.length} / 8 rooms selected</span>
              <span>Only one room can be the default entry point.</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 lg:col-span-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="rounded-full border border-border bg-secondary px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="retro-button rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-45"
            >
              {loading ? 'Creating space...' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

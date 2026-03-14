'use client';

import { useState, type FormEvent } from 'react';
import { CURATED_ROOM_TEMPLATES } from '@metaverse/shared';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';

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
      <div className="retro-panel w-full max-w-4xl rounded-[32px] p-6 text-white shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="retro-display text-[11px] text-[#9ae6c1]/70">Builder</p>
            <h2 className="mt-2 text-2xl font-semibold">Create a collaborative space</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300/80">
              Start with a lobby and office, then shape the room mix your team actually needs.
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200/80 transition-colors hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
          <div className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="retro-display text-[11px] text-slate-300/70">Space Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  required
                  maxLength={60}
                  className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary"
                  placeholder="Open Source Lab"
                />
              </label>
              <label className="space-y-2">
                <span className="retro-display text-[11px] text-slate-300/70">Slug</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  required
                  maxLength={40}
                  pattern="^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$"
                  className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary"
                  placeholder="open-source-lab"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="retro-display text-[11px] text-slate-300/70">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="retro-input w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="A friendly shared office for building and reviewing together."
              />
            </label>

            <div>
              <p className="retro-display text-[11px] text-slate-300/70">Visibility</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['private', 'invite-only', 'public'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setVisibility(option)}
                    className={`rounded-full px-4 py-2 text-sm capitalize transition-colors ${
                      visibility === option
                        ? 'retro-button'
                        : 'retro-button-subtle text-slate-100/80 hover:bg-white/10'
                    }`}
                  >
                    {option.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="retro-display text-[11px] text-amber-200/70">Room Builder</p>
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
                <div key={blueprint.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDefaultBlueprint(blueprint.id)}
                        className={`rounded-full px-3 py-1 text-[11px] retro-display ${
                          blueprint.isDefault
                            ? 'bg-primary/20 text-primary-foreground'
                            : 'bg-white/5 text-slate-300/80'
                        }`}
                      >
                        {blueprint.isDefault ? 'Entry Room' : 'Set Entry'}
                      </button>
                      <span className="text-xs text-slate-300/70">Room {index + 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => moveBlueprint(blueprint.id, -1)} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-200/80 hover:bg-white/10">
                        ↑
                      </button>
                      <button type="button" onClick={() => moveBlueprint(blueprint.id, 1)} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-200/80 hover:bg-white/10">
                        ↓
                      </button>
                      <button type="button" onClick={() => duplicateBlueprint(blueprint.id)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200/80 hover:bg-white/10">
                        Duplicate
                      </button>
                      <button type="button" onClick={() => removeBlueprint(blueprint.id)} disabled={roomBlueprints.length === 1} className="rounded-full border border-rose-300/20 px-3 py-1 text-xs text-rose-100/80 hover:bg-rose-400/10 disabled:opacity-45">
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <label className="space-y-2">
                      <span className="retro-display text-[10px] text-slate-300/70">Template</span>
                      <select
                        value={blueprint.templateKey}
                        onChange={(event) =>
                          updateBlueprint(blueprint.id, { templateKey: event.target.value })
                        }
                        className="retro-input w-full rounded-2xl px-4 py-3 text-sm outline-none"
                      >
                        {CURATED_ROOM_TEMPLATES.map((template) => (
                          <option key={template.key} value={template.key} className="text-black">
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="retro-display text-[10px] text-slate-300/70">Room Name</span>
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

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs text-slate-300/75">
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
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-200/80 transition-colors hover:bg-white/10"
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

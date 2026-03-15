'use client';

import Link from 'next/link';

interface SpaceData {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  visibility: string;
  myRole?: string;
}

export function SpaceCard({ space }: { space: SpaceData }) {
  return (
    <Link
      href={`/space/${space.slug}`}
      className="retro-panel group rounded-[28px] p-5 text-foreground transition-transform hover:-translate-y-1"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="marquee-glow flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/10 text-2xl">
            🏢
          </div>
          <div>
            <p className="retro-display text-[11px] text-foreground/50">{space.visibility}</p>
            <h3 className="mt-1 text-lg font-semibold group-hover:text-foreground/70 transition-colors">
              {space.name}
            </h3>
          </div>
        </div>
        {space.myRole && (
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs capitalize text-muted-foreground">
            {space.myRole}
          </span>
        )}
      </div>

      <p className="min-h-12 text-sm leading-6 text-muted-foreground">
        {space.description || 'No description yet. Open the space and shape the workflow.'}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="retro-display text-[10px] text-foreground/50">Open Workspace</span>
        <span>Enter space</span>
      </div>
    </Link>
  );
}

import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import type { AttachmentKind, AttachmentOwner } from '../types';
import { fileSize } from '../lib/format';
import { Button } from './ui';

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function AttachmentGrid({
  ownerType,
  ownerId,
  kind,
  label,
  emptyText,
}: {
  ownerType: AttachmentOwner;
  ownerId: string;
  kind: AttachmentKind;
  label: string;
  emptyText: string;
}) {
  const { snapshot, addAttachment, deleteAttachment } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const files = snapshot.attachments.filter(
    (file) => file.ownerType === ownerType && file.ownerId === ownerId && file.kind === kind,
  );

  async function onPick(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy(true);
    setProblem(null);
    try {
      for (const file of Array.from(list)) {
        await addAttachment(ownerType, ownerId, kind, file);
      }
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-steel-700">{label}</p>
        <Button onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : '+ Add'}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={kind === 'file' ? undefined : 'image/*'}
        className="hidden"
        onChange={(event) => void onPick(event.target.files)}
      />

      {problem ? <p className="mt-2 text-xs text-red-600">{problem}</p> : null}

      {files.length === 0 ? (
        <p className="mt-3 text-sm text-steel-500">{emptyText}</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((file) => (
            <li key={file.id} className="group relative overflow-hidden rounded-lg border border-steel-200">
              <a href={file.url} target="_blank" rel="noreferrer" className="block">
                {isImage(file.mimeType) ? (
                  <img src={file.url} alt={file.name} className="h-28 w-full object-cover" />
                ) : (
                  <div className="flex h-28 w-full items-center justify-center bg-steel-50 text-3xl">
                    📄
                  </div>
                )}
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs font-medium text-steel-700">{file.name}</p>
                  <p className="text-[11px] text-steel-500">{fileSize(file.size)}</p>
                </div>
              </a>
              <button
                type="button"
                aria-label={`Delete ${file.name}`}
                className="absolute top-1 right-1 rounded-full bg-white/90 px-2 py-0.5 text-xs text-red-600 shadow ring-1 ring-steel-200"
                onClick={() => {
                  if (window.confirm(`Delete ${file.name}?`)) void deleteAttachment(file.id);
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

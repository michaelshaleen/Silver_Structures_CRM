import type { LineItem } from '../types';
import { currency } from '../lib/format';
import { documentTotal, lineTotal } from '../lib/derive';
import { uid } from '../lib/id';
import { Button, Input } from './ui';

export function LineItemsEditor({
  items,
  readOnly,
  onChange,
}: {
  items: LineItem[];
  readOnly?: boolean;
  onChange(next: LineItem[]): void;
}) {
  function update(id: string, patch: Partial<LineItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="px-4 py-4">
      <div className="hidden grid-cols-12 gap-2 pb-2 text-xs font-semibold tracking-wide text-steel-500 uppercase sm:grid">
        <span className="col-span-6">Description</span>
        <span className="col-span-2 text-right">Qty</span>
        <span className="col-span-2 text-right">Unit price</span>
        <span className="col-span-2 text-right">Total</span>
      </div>

      <ul className="space-y-3 sm:space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-12 items-center gap-2 rounded-lg border border-steel-200 p-2 sm:border-0 sm:p-0"
          >
            <div className="col-span-12 sm:col-span-6">
              <Input
                value={item.description}
                placeholder="Description of work"
                readOnly={readOnly}
                onChange={(event) => update(item.id, { description: event.target.value })}
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                className="text-right"
                value={item.qty}
                readOnly={readOnly}
                onChange={(event) => update(item.id, { qty: Number(event.target.value) })}
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                className="text-right"
                value={item.unitPrice}
                readOnly={readOnly}
                onChange={(event) => update(item.id, { unitPrice: Number(event.target.value) })}
              />
            </div>
            <div className="col-span-4 flex items-center justify-end gap-2 sm:col-span-2">
              <span className="text-sm font-medium tabular-nums text-steel-800">
                {currency(lineTotal(item))}
              </span>
              {readOnly ? null : (
                <button
                  type="button"
                  aria-label="Remove line"
                  className="rounded px-1 text-steel-400 hover:text-red-600"
                  onClick={() => onChange(items.filter((row) => row.id !== item.id))}
                >
                  ✕
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-steel-200 pt-3">
        {readOnly ? (
          <span />
        ) : (
          <Button
            onClick={() =>
              onChange([...items, { id: uid('li'), description: '', qty: 1, unitPrice: 0 }])
            }
          >
            + Line item
          </Button>
        )}
        <div className="text-right">
          <p className="text-xs tracking-wide text-steel-500 uppercase">Total</p>
          <p className="text-xl font-semibold tabular-nums text-steel-900">
            {currency(documentTotal(items))}
          </p>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useStore } from '../state/store';
import { BOARD_STAGES, PIPELINE_STAGES, STAGE_LABELS, type Lead, type Stage } from '../types';
import { documentTotal, estimatesForLead } from '../lib/derive';
import { currency, shortDate } from '../lib/format';
import { Badge, Card, Select } from '../components/ui';

export function Board() {
  const { snapshot, setLeadStage, loading } = useStore();
  const [dragging, setDragging] = useState<Lead | null>(null);
  const [showLost, setShowLost] = useState(false);

  const sensors = useSensors(
    // A small drag threshold so a tap on a phone still opens the lead.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const columns = useMemo(() => {
    const stages: Stage[] = showLost ? [...BOARD_STAGES, 'lost'] : BOARD_STAGES;
    return stages.map((stage) => ({
      stage,
      leads: snapshot.leads.filter((lead) => lead.stage === stage),
    }));
  }, [snapshot.leads, showLost]);

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const leadId = String(event.active.id);
    const target = event.over?.id as Stage | undefined;
    if (!target) return;
    const lead = snapshot.leads.find((row) => row.id === leadId);
    if (!lead || lead.stage === target) return;
    void setLeadStage(leadId, target);
  }

  function onDragStart(event: DragStartEvent) {
    const lead = snapshot.leads.find((row) => row.id === String(event.active.id));
    setDragging(lead ?? null);
  }

  if (loading) return <p className="py-12 text-center text-sm text-steel-500">Loading…</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-steel-900">Pipeline board</h1>
          <p className="text-xs text-steel-500">
            Drag a card between columns, or use the stage picker on the card.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-steel-600">
          <input
            type="checkbox"
            checked={showLost}
            onChange={(event) => setShowLost(event.target.checked)}
            className="h-4 w-4 rounded border-steel-300"
          />
          Show lost
        </label>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {columns.map(({ stage, leads }) => (
            <Column key={stage} stage={stage} count={leads.length}>
              {leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </Column>
          ))}
        </div>

        <DragOverlay>
          {dragging ? (
            <div className="w-72 rotate-1">
              <CardBody lead={dragging} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  stage,
  count,
  children,
}: {
  stage: Stage;
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });

  return (
    <section
      ref={setNodeRef}
      className={`flex w-72 shrink-0 snap-start flex-col rounded-xl border p-2 transition ${
        isOver ? 'border-steel-400 bg-steel-200/70' : 'border-steel-200 bg-steel-200/40'
      }`}
    >
      <header className="flex items-center justify-between px-2 py-1.5">
        <h2 className="text-sm font-semibold text-steel-700">{STAGE_LABELS[stage]}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-steel-500">
          {count}
        </span>
      </header>
      <div className="flex min-h-24 flex-col gap-2">{children}</div>
    </section>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`touch-manipulation ${isDragging ? 'opacity-40' : ''}`}
    >
      <CardBody lead={lead} />
    </div>
  );
}

function CardBody({ lead }: { lead: Lead }) {
  const { snapshot, setLeadStage } = useStore();
  const estimates = estimatesForLead(snapshot, lead.id);
  const value = estimates.reduce((max, est) => Math.max(max, documentTotal(est.lineItems)), 0);

  return (
    <Card className="p-3">
      <Link
        to={`/leads/${lead.id}`}
        className="block text-sm font-semibold text-steel-900 hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {lead.name}
      </Link>
      <p className="mt-1 line-clamp-2 text-xs text-steel-500">
        {lead.description || lead.address || 'No description yet'}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {value > 0 ? <Badge tone="green">{currency(value)}</Badge> : null}
        <Badge>{shortDate(lead.createdAt)}</Badge>
      </div>
      <div className="mt-2 md:hidden">
        <Select
          aria-label={`Move ${lead.name} to another stage`}
          value={lead.stage}
          className="py-1 text-xs"
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => void setLeadStage(lead.id, event.target.value as Stage)}
        >
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </Select>
      </div>
    </Card>
  );
}

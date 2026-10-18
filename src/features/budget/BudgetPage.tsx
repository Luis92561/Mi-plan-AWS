import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHead,
  EmptyState,
  Skeleton,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDb } from '@/data/db';
import { useAppState } from '@/data/store';
import type { BudgetItem, Voucher } from '@/data/types';
import {
  budgetTotals,
  cumulativeSpend,
  expireVouchers,
  remainingRouteCost,
  voucherFromApproval,
  vouchersExpiringSoon,
} from '@/domain/budget';
import { localDate } from '@/lib/dates';
import { useT } from '@/lib/i18n/useT';
import { BudgetItemFormModal } from './components/BudgetItemFormModal';
import { BudgetLedger } from './components/BudgetLedger';
import { RouteProjection } from './components/RouteProjection';
import { SpendChart } from './components/SpendChart';
import { VoucherFormModal } from './components/VoucherFormModal';
import { VoucherSimulator } from './components/VoucherSimulator';
import { VouchersPanel } from './components/VouchersPanel';
import {
  changedVouchers,
  pendingSteps,
  projectionRows,
  simulateApprovals,
  sortLedger,
} from './helpers';

/**
 * Presupuesto (§7.6, M7).
 * Ledger de `budgetItems` con totales, proyección de la ruta restante, simulador de
 * vouchers (estado derivado, sin escribir en la base), CRUD de vouchers y gasto acumulado.
 */
export function BudgetPage() {
  const { t, f } = useT();
  const { state, ready } = useAppState();
  const { notify } = useToast();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const [deleting, setDeleting] = useState<BudgetItem | null>(null);
  const [voucherDraft, setVoucherDraft] = useState<{ voucher: Voucher | null } | null>(null);
  const [deletingVoucher, setDeletingVoucher] = useState<Voucher | null>(null);
  const [approvedSim, setApprovedSim] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => localDate(now), [now]);

  const ledger = useMemo(() => sortLedger(state.budgetItems), [state.budgetItems]);
  const totals = useMemo(() => budgetTotals(state.budgetItems), [state.budgetItems]);
  const spend = useMemo(() => cumulativeSpend(state.budgetItems), [state.budgetItems]);
  const upcoming = useMemo(() => vouchersExpiringSoon(state.vouchers, today), [state.vouchers, today]);
  const steps = useMemo(
    () => pendingSteps(state.planItems, state.certifications),
    [state.planItems, state.certifications],
  );

  const projection = useMemo(
    () =>
      remainingRouteCost({
        planItems: state.planItems,
        certifications: state.certifications,
        vouchers: state.vouchers,
        today,
      }),
    [state.planItems, state.certifications, state.vouchers, today],
  );

  const simulation = useMemo(
    () =>
      simulateApprovals({
        planItems: state.planItems,
        certifications: state.certifications,
        vouchers: state.vouchers,
        approvedCertIds: approvedSim,
        now,
      }),
    [state.planItems, state.certifications, state.vouchers, approvedSim, now],
  );

  const simProjection = useMemo(
    () =>
      remainingRouteCost({
        planItems: simulation.planItems,
        certifications: state.certifications,
        vouchers: simulation.vouchers,
        today,
      }),
    [simulation.planItems, simulation.vouchers, state.certifications, today],
  );

  const simulatedLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of simulation.simulated) {
      map.set(
        entry.voucher.id,
        t('budget.sim.voucher', {
          percent: f.percent(entry.voucher.percent / 100),
          code: entry.code,
        }),
      );
    }
    return map;
  }, [simulation.simulated, t, f]);

  const labelOfVoucher = useCallback(
    (voucherId: string): string | null =>
      simulatedLabels.get(voucherId) ??
      state.vouchers.find((voucher) => voucher.id === voucherId)?.label ??
      null,
    [simulatedLabels, state.vouchers],
  );

  const projectionView = useMemo(
    () => projectionRows(projection, state.certifications, labelOfVoucher),
    [projection, state.certifications, labelOfVoucher],
  );

  const simulationView = useMemo(
    () => projectionRows(simProjection, state.certifications, labelOfVoucher),
    [simProjection, state.certifications, labelOfVoucher],
  );

  const budgetedUsd = totals.plannedUsd + totals.paidUsd;
  const burnRatio = budgetedUsd > 0 ? totals.paidUsd / budgetedUsd : 0;
  // §8.5: el gasto real supera el 120 % de lo planeado (lo que queda planeado).
  const overBudget = totals.plannedUsd > 0 && totals.paidUsd > totals.plannedUsd * 1.2;

  const toggleStatus = async (item: BudgetItem) => {
    const next = item.status === 'pagado' ? 'planeado' : 'pagado';
    try {
      await getDb().budgetItems.update(item.id, { status: next });
      notify(
        next === 'pagado'
          ? t('budget.row.paid', { concept: item.concept })
          : t('budget.row.planned', { concept: item.concept }),
        'ok',
      );
    } catch (cause) {
      notify(t('budget.row.error', { message: (cause as Error).message }), 'err');
    }
  };

  const confirmDeleteItem = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await getDb().budgetItems.delete(deleting.id);
      notify(t('budget.delete.done', { concept: deleting.concept }), 'ok');
      setDeleting(null);
    } catch (cause) {
      notify(t('budget.delete.error', { message: (cause as Error).message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteVoucher = async () => {
    if (!deletingVoucher) return;
    setBusy(true);
    try {
      await getDb().vouchers.delete(deletingVoucher.id);
      notify(t('budget.voucherDelete.done', { label: deletingVoucher.label }), 'ok');
      setDeletingVoucher(null);
    } catch (cause) {
      notify(t('budget.voucherDelete.error', { message: (cause as Error).message }), 'err');
    } finally {
      setBusy(false);
    }
  };

  const toggleVoucherStatus = async (voucher: Voucher) => {
    const next = voucher.status === 'usado' ? 'disponible' : 'usado';
    try {
      await getDb().vouchers.update(voucher.id, { status: next });
      notify(
        next === 'usado'
          ? t('budget.vouchers.used', { label: voucher.label })
          : t('budget.vouchers.available', { label: voucher.label }),
        'ok',
      );
    } catch (cause) {
      notify(t('budget.vouchers.error', { message: (cause as Error).message }), 'err');
    }
  };

  const expireAll = async () => {
    const next = expireVouchers(state.vouchers, today);
    const changed = changedVouchers(state.vouchers, next);
    if (changed.length === 0) {
      notify(t('budget.vouchers.expire.none'), 'neutral');
      return;
    }
    try {
      await getDb().vouchers.bulkPut(changed);
      notify(t('budget.vouchers.expire.done', { count: changed.length }), 'ok');
    } catch (cause) {
      notify(t('budget.vouchers.error', { message: (cause as Error).message }), 'err');
    }
  };

  const addApprovalVoucher = async (certId: string) => {
    const cert = state.certifications.find((entry) => entry.id === certId);
    if (!cert) return;
    const voucher = voucherFromApproval(cert.code, now);
    try {
      await getDb().vouchers.put(voucher);
      notify(t('budget.vouchers.approval.added', { label: voucher.label }), 'ok');
    } catch (cause) {
      notify(t('budget.vouchers.error', { message: (cause as Error).message }), 'err');
    }
  };

  if (!ready) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h2 font-bold">
            <span aria-hidden="true" className="mr-1.5 text-accent">
              ❯
            </span>
            {t('budget.title')}
          </h1>
          <p className="mt-1 max-w-prose text-ui text-muted">{t('budget.lead')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setVoucherDraft({ voucher: null })}
            aria-label={t('budget.action.newVoucher')}
          >
            {t('budget.action.newVoucher')}
          </Button>
          <Button
            variant="primary"
            glyph
            onClick={() => setCreating(true)}
            aria-label={t('budget.action.newItem')}
          >
            {t('budget.action.newItem')}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('budget.kpi.planned')}</span>
            <span className="tnum text-h3 font-bold text-text">{f.currency(totals.plannedUsd)}</span>
            <span className="text-meta text-muted">{t('budget.kpi.plannedHint')}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('budget.kpi.paid')}</span>
            <span className="tnum text-h3 font-bold text-text">{f.currency(totals.paidUsd)}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('budget.kpi.remaining')}</span>
            <span className="tnum text-h3 font-bold text-text">
              {f.currency(totals.remainingUsd)}
            </span>
            <span className="text-meta text-muted">{t('budget.kpi.remainingHint')}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-1 py-2.5">
            <span className="label-mono">{t('budget.kpi.burn')}</span>
            <span className="tnum text-h3 font-bold text-accent">{f.percent(burnRatio)}</span>
            <span className="text-meta text-muted">{t('budget.kpi.burnHint')}</span>
          </CardBody>
        </Card>
      </div>

      <div aria-live="polite">
        {overBudget ? (
          <div className="rounded-card border border-warn/45 bg-panel px-3 py-2.5">
            <p className="flex flex-wrap items-baseline gap-x-2 text-ui text-warn">
              <span aria-hidden="true">▲</span>
              <span className="font-bold">{t('budget.overBudget.title')}</span>
            </p>
            <p className="mt-0.5 text-meta text-muted">
              {t('budget.overBudget', {
                paid: f.currency(totals.paidUsd),
                planned: f.currency(totals.plannedUsd),
              })}
            </p>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('budget.chart.title')}</h2>
          <span className="text-meta text-muted">{t('budget.chart.hint')}</span>
        </CardHead>
        <CardBody>
          {spend.length >= 2 ? (
            <SpendChart points={spend} />
          ) : (
            <p className="rounded-card border border-dashed border-line px-3 py-6 text-center text-ui text-muted">
              {t('budget.chart.empty')}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('budget.projection.title')}</h2>
          <span className="text-meta text-muted">{t('budget.projection.hint')}</span>
        </CardHead>
        <CardBody>
          <RouteProjection
            rows={projectionView}
            withVouchersUsd={projection.withVouchersUsd}
            withoutVouchersUsd={projection.withoutVouchersUsd}
            savingsUsd={projection.savingsUsd}
            emptyText={t('budget.projection.empty')}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('budget.sim.title')}</h2>
        </CardHead>
        <CardBody>
          <VoucherSimulator
            steps={steps}
            approvedCertIds={approvedSim}
            onApprove={(certId) =>
              setApprovedSim((current) => (current.includes(certId) ? current : [...current, certId]))
            }
            onUndo={(certId) => setApprovedSim((current) => current.filter((id) => id !== certId))}
            onReset={() => setApprovedSim([])}
            rows={simulationView}
            withVouchersUsd={simProjection.withVouchersUsd}
            withoutVouchersUsd={simProjection.withoutVouchersUsd}
            savingsUsd={simProjection.savingsUsd}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('budget.vouchers.title')}</h2>
        </CardHead>
        <CardBody>
          <VouchersPanel
            vouchers={state.vouchers}
            upcoming={upcoming}
            certifications={state.certifications}
            defaultCertId={state.settings.activeCertId ?? undefined}
            onEdit={(voucher) => setVoucherDraft({ voucher })}
            onDelete={(voucher) => setDeletingVoucher(voucher)}
            onToggleStatus={(voucher) => {
              void toggleVoucherStatus(voucher);
            }}
            onExpireAll={() => {
              void expireAll();
            }}
            onAddApproval={(certId) => {
              void addApprovalVoucher(certId);
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHead>
          <h2 className="text-h3 font-bold">{t('budget.ledger.title')}</h2>
          <span className="text-meta text-muted">{t('budget.ledger.hint')}</span>
        </CardHead>
        <CardBody className="p-0">
          {ledger.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={t('budget.ledger.empty.title')}
                body={t('budget.ledger.empty.body')}
                action={
                  <Button variant="primary" glyph onClick={() => setCreating(true)}>
                    {t('budget.ledger.empty.cta')}
                  </Button>
                }
              />
            </div>
          ) : (
            <BudgetLedger
              items={ledger}
              certifications={state.certifications}
              vouchers={state.vouchers}
              onEdit={(item) => setEditing(item)}
              onDelete={(item) => setDeleting(item)}
              onToggleStatus={(item) => {
                void toggleStatus(item);
              }}
            />
          )}
        </CardBody>
      </Card>

      {creating ? (
        <BudgetItemFormModal
          key="new-budget-item"
          item={null}
          defaultCertId={state.settings.activeCertId ?? undefined}
          onOpenChange={(open) => {
            if (!open) setCreating(false);
          }}
        />
      ) : null}

      {editing ? (
        <BudgetItemFormModal
          key={editing.id}
          item={editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}

      {voucherDraft ? (
        <VoucherFormModal
          key={voucherDraft.voucher?.id ?? 'new-voucher'}
          voucher={voucherDraft.voucher}
          onOpenChange={(open) => {
            if (!open) setVoucherDraft(null);
          }}
        />
      ) : null}

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t('budget.delete.title')}
        description={deleting ? t('budget.delete.body', { concept: deleting.concept }) : undefined}
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeleteItem} disabled={busy}>
              {t('budget.delete.confirm')}
            </Button>
          </>
        }
      >
        {deleting ? (
          <p className="flex flex-wrap items-baseline gap-x-2 text-ui text-text">
            <span aria-hidden="true" className="text-warn">
              ▲
            </span>
            <span>{deleting.concept}</span>
            <span className="tnum text-muted">{f.currency(deleting.amountUsd)}</span>
          </p>
        ) : null}
      </Modal>

      <Modal
        open={deletingVoucher !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingVoucher(null);
        }}
        title={t('budget.voucherDelete.title')}
        description={
          deletingVoucher
            ? t('budget.voucherDelete.body', { label: deletingVoucher.label })
            : undefined
        }
        closeLabel={t('common.close')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingVoucher(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeleteVoucher} disabled={busy}>
              {t('budget.voucherDelete.confirm')}
            </Button>
          </>
        }
      >
        {deletingVoucher ? (
          <p className="flex flex-wrap items-baseline gap-x-2 text-ui text-text">
            <span aria-hidden="true" className="text-warn">
              ▲
            </span>
            <span>{deletingVoucher.label}</span>
            <span className="tnum text-muted">{f.percent(deletingVoucher.percent / 100)}</span>
          </p>
        ) : null}
      </Modal>

      <Button
        variant="primary"
        glyph
        onClick={() => setCreating(true)}
        aria-label={t('budget.action.newItem')}
        className="fixed bottom-24 right-4 z-40 shadow-overlay md:hidden"
      >
        <Plus size={15} aria-hidden="true" />
        {t('budget.action.newItem')}
      </Button>
    </div>
  );
}

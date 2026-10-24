"use client";

import { AlertTriangle, Play, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { JsonViewer } from "@/components/audit/json-viewer";
import { LatencyBadge } from "@/components/dashboard/latency-badge";
import { PageHeader } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { rawRequest } from "@/lib/api/client";
import { USE_MOCKS } from "@/lib/api/config";
import { MAX_LIMIT, paginationSchema } from "@/lib/api/schemas";
import { buildUrl, type HttpMethod } from "@/lib/api/transport";
import { cn } from "@/lib/utils";

type RunResult = { status: number; latencyMs: number; body: unknown; at: Date } | { error: string; at: Date };

function useRunner() {
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const run = async (method: HttpMethod, path: string, query?: Record<string, string | number>) => {
    setRunning(true);
    try {
      const res = await rawRequest({ method, path, query });
      setResult({ ...res, at: new Date() });
      return res;
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Error de red", at: new Date() });
      return null;
    } finally {
      setRunning(false);
    }
  };
  return { result, running, run };
}

function StatusPill({ status, testId }: { status?: number; testId: string }) {
  const ok = status !== undefined && status >= 200 && status < 300;
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px]",
        status === undefined
          ? "border-white/10 text-white/40"
          : ok
            ? "border-success/30 bg-success/10 text-success"
            : "border-danger/30 bg-danger/10 text-danger",
      )}
    >
      {status === undefined ? "HTTP —" : `HTTP ${status}`}
    </span>
  );
}

function EndpointCard({
  id,
  method,
  path,
  description,
  destructive,
  controls,
  onRun,
  runner,
}: {
  id: string;
  method: HttpMethod;
  path: string;
  description: string;
  destructive?: boolean;
  controls?: React.ReactNode;
  onRun: () => void;
  runner: ReturnType<typeof useRunner>;
}) {
  const r = runner.result;
  const status = r && "status" in r ? r.status : undefined;
  const latency = r && "latencyMs" in r ? r.latencyMs : undefined;
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.035] to-white/[0.01]",
        destructive ? "border-danger/25" : "border-white/[0.07]",
      )}
      aria-labelledby={`${id}-title`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold",
                method === "GET" ? "bg-[#3987e5]/15 text-[#7fb6ff]" : "bg-ember/15 text-ember",
              )}
            >
              {method}
            </span>
            <h2 id={`${id}-title`} className="font-mono text-sm text-white">
              {path}
            </h2>
            {destructive && (
              <span className="inline-flex items-center gap-1 rounded-md bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">
                <AlertTriangle className="size-3" /> DESTRUCTIVO
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-sm text-white/50">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={status} testId={`audit-status-${id}`} />
          <LatencyBadge ms={latency} testId={`audit-latency-${id}`} />
        </div>
      </div>
      <div className="grid gap-4 p-5 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-3">
          {controls}
          <Button
            data-testid={`audit-run-${id}`}
            onClick={onRun}
            disabled={runner.running}
            variant={destructive ? "destructive" : "default"}
            className="h-9 w-full"
          >
            {destructive ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
            {runner.running ? "Ejecutando…" : destructive ? "Restablecer datos" : "Probar"}
          </Button>
          {r && <p className="text-[11px] text-white/35">Última ejecución: {r.at.toLocaleTimeString("es-MX")}</p>}
        </div>
        <div className="min-w-0">
          {runner.running ? (
            <div className="space-y-2 rounded-xl border border-white/[0.07] bg-black/40 p-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-3" style={{ width: `${40 + ((i * 17) % 50)}%` }} />
              ))}
            </div>
          ) : !r ? (
            <div className="grid h-full min-h-32 place-items-center rounded-xl border border-dashed border-white/10 text-sm text-white/35">
              Presiona “{destructive ? "Restablecer datos" : "Probar"}” para ver la respuesta.
            </div>
          ) : "error" in r ? (
            <div role="alert" className="rounded-xl border border-danger/25 bg-danger/[0.06] p-4 text-sm text-danger">
              {r.error}
            </div>
          ) : (
            <JsonViewer value={r.body} testId={`audit-json-${id}`} />
          )}
        </div>
      </div>
    </motion.section>
  );
}

export function AuditPanel() {
  const { mutate } = useSWRConfig();
  const analytics = useRunner();
  const kanban = useRunner();
  const testAnalytics = useRunner();
  const testKanban = useRunner();
  const contract = useRunner();
  const health = useRunner();
  const reset = useRunner();
  const [page, setPage] = useState("1");
  const [limit, setLimit] = useState("50");
  const [orderNumber, setOrderNumber] = useState("OM-TEST-1001");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const pag = paginationSchema.safeParse({ page, limit });

  const doReset = async () => {
    setConfirmOpen(false);
    setConfirmText("");
    const res = await reset.run("POST", "/api/internal/test-reset");
    if (res && res.status >= 200 && res.status < 300) {
      // Invalida todas las cachés: el resto del dashboard ve los datos nuevos.
      await mutate(() => true, undefined, { revalidate: true });
      toast.success("Datos restablecidos", { description: "Se cargó el conjunto de prueba conocido." });
    } else {
      toast.error("No se pudieron restablecer los datos", {
        description: res ? `HTTP ${res.status}` : "Error de red",
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Auditoría"
        accent="de API"
        description={`Panel de verificación: consulta la API y revisa código HTTP, latencia y JSON. El reset solo modifica fixtures de prueba.${USE_MOCKS ? " (modo mock activo)" : ""}`}
      />
      <div className="grid gap-5">
        <EndpointCard
          id="analytics"
          method="GET"
          path="/api/analytics"
          description="Métricas de ventas por día y categoría. Paginación en servidor con ?page=&limit=. SLA: < 300 ms."
          runner={analytics}
          onRun={() => {
            if (!pag.success) {
              toast.error("Parámetros inválidos", { description: pag.error.issues[0]?.message });
              return;
            }
            void analytics.run("GET", "/api/analytics", pag.data);
          }}
          controls={
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="audit-page" className="text-xs text-white/50">page</Label>
                <Input
                  id="audit-page"
                  data-testid="audit-input-page"
                  inputMode="numeric"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  aria-invalid={!pag.success}
                  className="h-9 font-mono"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="audit-limit" className="text-xs text-white/50">limit (≤ {MAX_LIMIT})</Label>
                <Input
                  id="audit-limit"
                  data-testid="audit-input-limit"
                  inputMode="numeric"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  aria-invalid={!pag.success}
                  className="h-9 font-mono"
                />
              </div>
              <p className="col-span-2 truncate font-mono text-[11px] text-white/35" title={buildUrl("/api/analytics", { page, limit })}>
                {buildUrl("/api/analytics", { page, limit })}
              </p>
              {!pag.success && (
                <p role="alert" className="col-span-2 text-xs text-danger">
                  {pag.error.issues[0]?.message}
                </p>
              )}
            </div>
          }
        />
        <EndpointCard
          id="kanban-status"
          method="GET"
          path="/api/orders?page=1&limit=50"
          description="Órdenes persistidas en el backend; esta ruta alimenta el tablero de operación."
          runner={kanban}
          onRun={() => void kanban.run("GET", "/api/orders", { page: 1, limit: 50 })}
        />
        <EndpointCard
          id="health"
          method="GET"
          path="/api/health"
          description="Comprueba disponibilidad de la API y conexión a la base de datos; Railway usa esta ruta para el healthcheck."
          runner={health}
          onRun={() => void health.run("GET", "/api/health")}
        />
        <EndpointCard
          id="test-analytics"
          method="GET"
          path="/api/test/analytics?page=1&limit=50"
          description="Consulta métricas de fixtures de evaluación. Disponible según la configuración del backend."
          runner={testAnalytics}
          onRun={() => void testAnalytics.run("GET", "/api/test/analytics", { page: 1, limit: 50 })}
        />
        <EndpointCard
          id="test-kanban-status"
          method="GET"
          path="/api/test/kanban-status?orderNumber=…"
          description="Consulta el tablero de fixtures; puedes filtrar por un número de orden de prueba."
          runner={testKanban}
          onRun={() => void testKanban.run("GET", "/api/test/kanban-status", { orderNumber: orderNumber.trim() })}
          controls={
            <div className="grid gap-1.5">
              <Label htmlFor="audit-order-number" className="text-xs text-white/50">orderNumber</Label>
              <Input id="audit-order-number" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} className="h-9 font-mono" />
            </div>
          }
        />
        <EndpointCard
          id="test-contract"
          method="GET"
          path="/api/test/contract"
          description="Devuelve el manifiesto de rutas de soporte para pruebas y evaluación."
          runner={contract}
          onRun={() => void contract.run("GET", "/api/test/contract")}
        />
        <EndpointCard
          id="reset-data"
          method="POST"
          path="/api/test/reset-data"
          destructive
          description="Restablece únicamente fixtures de prueba. La operación pasa por un proxy privado, exige sesión de administrador y TEST_API_TOKEN; producción también requiere ALLOW_TEST_DATA_RESET=true."
          runner={reset}
          onRun={() => setConfirmOpen(true)}
        />
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) setConfirmText("");
        }}
      >
        <DialogContent className="border-danger/30 bg-[#140a0e] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <AlertTriangle className="size-5" /> Acción destructiva
            </DialogTitle>
            <DialogDescription>
              Esto reemplaza las órdenes y métricas marcadas como fixtures de prueba. No se puede deshacer. Escribe{" "}
              <strong className="font-mono text-white">RESET</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (confirmText === "RESET") void doReset();
            }}
            className="grid gap-4"
          >
            <Input
              autoFocus
              data-testid="reset-confirm-input"
              aria-label="Escribe RESET para confirmar"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
              className="font-mono"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                data-testid="reset-confirm"
                disabled={confirmText !== "RESET"}
                className="bg-danger text-white hover:bg-danger/85"
              >
                Restablecer datos
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

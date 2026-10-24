import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  KanbanSquare,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { MiniBars } from "@/components/charts/mini-bars";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { LogoMark } from "@/components/brand/logo";

/** Mockup estático del dashboard (refs. NEAR / Starlight) para la landing. */
export function DashboardMockup() {
  return (
    <div className="relative flex h-full w-full overflow-hidden text-left">
      <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-40 [--grid-size:48px]" />
      {/* Sidebar */}
      <aside className="relative hidden w-56 shrink-0 flex-col border-r border-white/[0.06] bg-[#0a0a0f] p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-1 text-sm font-semibold text-white">
          <LogoMark className="size-5" /> OmniMarket
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center justify-between px-3 py-2.5 text-[13px] text-white">
            <span className="flex items-center gap-2">
              <LayoutDashboard className="size-4 text-brand-soft" /> Resumen
            </span>
            <ChevronDown className="size-3.5 text-white/40" />
          </div>
          {[
            ["Ingresos", "$1.24 M"],
            ["Órdenes", "8,412"],
            ["Margen", "46.2%"],
          ].map(([k, v]) => (
            <div key={k} className="border-t border-white/[0.04] px-3 py-2 pl-9">
              <div className="text-[11px] text-white/45">{k}</div>
              <div className="font-mono text-[11px] text-white/30">{v}</div>
            </div>
          ))}
        </div>
        <nav className="mt-4 space-y-1 text-[13px] text-white/50">
          {[
            [BarChart3, "Analítica"],
            [KanbanSquare, "Kanban"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof BarChart3;
            return (
              <div key={label as string} className="flex items-center gap-2 rounded-lg px-3 py-2">
                <I className="size-4" /> {label as string}
              </div>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2 rounded-xl border border-white/[0.06] p-2">
          <div className="size-7 rounded-full bg-gradient-to-br from-brand to-ember" />
          <div className="text-[11px] leading-tight">
            <div className="text-white">Ana Operaciones</div>
            <div className="text-white/40">Operador</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="relative flex-1 overflow-hidden p-5 md:p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-medium text-white md:text-2xl">Resumen</h3>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 sm:flex">
              <Search className="size-3.5" /> Buscar… <kbd className="font-mono text-[10px]">⌘K</kbd>
            </span>
            <span className="rounded-lg border border-ember/40 bg-ember/10 px-3 py-1.5 text-xs text-ember">Nueva orden</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-3 border-t border-white/[0.06] pt-6">
          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-white/40 uppercase">Ingresos 30 días</div>
            <div className="mt-1 font-mono text-3xl text-white md:text-4xl">
              $1,247,924<span className="align-top text-base text-white/50">.80</span>
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-white/40 uppercase">Órdenes</div>
            <div className="mt-1 font-mono text-xl text-white">8,412</div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-white/40 uppercase">Margen</div>
            <div className="mt-1 font-mono text-xl text-white">46.2<span className="text-sm text-white/50">%</span></div>
          </div>
        </div>

        <SegmentedBar
          className="mt-6"
          segments={[
            { label: "Electrónica", value: 41, color: "#7c5cff", display: "$512,330.10" },
            { label: "Hogar", value: 22, color: "#ff9a5c", display: "$274,540.22" },
            { label: "Moda", value: 18, color: "#ff6fa8", display: "$224,610.48" },
            { label: "Belleza", value: 11, color: "#3ddc97", display: "$137,270.00" },
            { label: "Deportes", value: 8, color: "#5cc8ff", display: "$99,174.00" },
          ]}
        />

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1.6fr]">
          {[
            { k: "Ticket promedio", v: "$1,483.50", d: "+5.3%", up: true, c: "#7c5cff", vals: [5, 8, 4, 7, 9, 6, 10, 7, 11] },
            { k: "Órdenes canceladas", v: "112", d: "-2.5%", up: false, c: "#ff9a5c", vals: [6, 9, 5, 7, 10, 6, 8, 9, 7] },
          ].map((m) => (
            <div key={m.k} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-[11px] text-white/45">{m.k}</div>
              <div className="mt-1 font-mono text-lg text-white">{m.v}</div>
              <div className={m.up ? "text-[11px] text-success" : "text-[11px] text-danger"}>{m.d}</div>
              <MiniBars className="mt-3" values={m.vals} color={m.c} height={46} />
            </div>
          ))}
          <div className="col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] lg:col-span-1">
            <div className="flex justify-between border-b border-white/[0.06] px-4 py-2.5 text-[11px] text-white/40">
              <span>Últimas órdenes</span>
              <span>Total</span>
            </div>
            {[
              ["OM-1093", "Valeria Hernández", "$4,290.00", "PROCESSING"],
              ["OM-1092", "Diego Ramírez", "$1,799.00", "SHIPPED"],
              ["OM-1091", "Sofía Martínez", "$918.00", "PENDING"],
            ].map(([id, name, total, st]) => (
              <div key={id} className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="grid size-7 place-items-center rounded-full bg-white/[0.06] text-[10px] text-white/60">
                    {name!.split(" ").map((p) => p[0]).join("")}
                  </div>
                  <div>
                    <div className="text-[12px] text-white">{name}</div>
                    <div className="font-mono text-[10px] text-white/35">{id} · {st}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-[12px] text-white/80">
                  {total}
                  <ChevronRight className="size-3.5 text-white/30" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

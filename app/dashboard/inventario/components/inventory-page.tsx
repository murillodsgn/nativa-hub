"use client";

import { useState, useEffect } from "react";
import { Plus, Minus, ArrowRight, MoreHorizontal, X, History } from "lucide-react";
import type { Product } from "../types";
import { AddStockModal, DeductStockModal, TransferModal, MovementsModal } from "./modals";

// Reliable JS-based breakpoints — avoids CSS caching and viewport ambiguity
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true); // default: table (SSR-safe)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false); // default: not mobile (SSR-safe)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type MenuActionType = "add" | "deduct" | "transfer" | "history";

type ModalState =
  | { type: "add"; product: Product }
  | { type: "deduct"; product: Product }
  | { type: "transfer"; product: Product }
  | { type: "history"; product: Product }
  | null;

type MenuPos = { top: number; right: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return (
    "$" +
    value.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ products }: { products: Product[] }) {
  const isMobile = useIsMobile();
  const active = products.filter((p) => p.active);
  const totalUnits = active.reduce(
    (s, p) => s + p.factory_stock + p.store_stock,
    0
  );
  const totalValue = active.reduce(
    (s, p) => s + (p.factory_stock + p.store_stock) * p.price,
    0
  );

  if (isMobile) {
    // Explicit flex layout — avoids Safari CSS Grid col-span issues
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ width: "calc(50% - 4px)" }} className="rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5">
            <p className="text-sm text-white/40 mb-1 leading-tight">Productos</p>
            <p className="text-base font-medium text-white tabular-nums">{String(active.length)}</p>
          </div>
          <div style={{ width: "calc(50% - 4px)" }} className="rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5">
            <p className="text-sm text-white/40 mb-1 leading-tight">En stock</p>
            <p className="text-base font-medium text-white tabular-nums">{String(totalUnits)}</p>
          </div>
        </div>
        <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5">
          <p className="text-sm text-white/40 mb-1 leading-tight">Valor</p>
          <p className="text-xl font-semibold text-white tabular-nums">{formatCurrency(totalValue)}</p>
        </div>
      </div>
    );
  }

  // Tablet / desktop — simple 3-col grid, no col-span tricks needed
  return (
    <div className="grid grid-cols-3 gap-2 lg:gap-3">
      <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5 lg:px-4 lg:py-3">
        <p className="text-[10px] lg:text-xs text-white/40 mb-1 leading-tight">Productos</p>
        <p className="text-base lg:text-xl font-semibold text-white tabular-nums">{String(active.length)}</p>
      </div>
      <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5 lg:px-4 lg:py-3">
        <p className="text-[10px] lg:text-xs text-white/40 mb-1 leading-tight">En stock</p>
        <p className="text-base lg:text-xl font-semibold text-white tabular-nums">{String(totalUnits)}</p>
      </div>
      <div className="rounded-xl bg-[#1a1a1a] border border-white/8 px-3 py-2.5 lg:px-4 lg:py-3">
        <p className="text-[10px] lg:text-xs text-white/40 mb-1 leading-tight">Valor</p>
        <p className="text-base lg:text-xl font-semibold text-white tabular-nums">{formatCurrency(totalValue)}</p>
      </div>
    </div>
  );
}

// ── Stock value — shared between table cell and card stat ─────────────────────

function StockValue({ value }: { value: number }) {
  return (
    <span className={`tabular-nums ${value === 0 ? "text-white/60" : "text-emerald-400"}`}>
      {value}
    </span>
  );
}

// ── Menu options ──────────────────────────────────────────────────────────────

const ALL_MENU_OPTIONS = [
  { type: "add" as MenuActionType, label: "Agregar", icon: Plus },
  { type: "deduct" as MenuActionType, label: "Descontar", icon: Minus },
  { type: "transfer" as MenuActionType, label: "Transferir a tienda", icon: ArrowRight },
  { type: "history" as MenuActionType, label: "Ver movimientos", icon: History },
];

function menuOptions(role: string) {
  return ALL_MENU_OPTIONS.filter((o) => o.type !== "transfer" || role === "admin");
}

// ── Desktop dropdown (lg+) ────────────────────────────────────────────────────

function DropdownMenu({
  product,
  pos,
  onAction,
  onClose,
  role,
}: {
  product: Product;
  pos: MenuPos;
  onAction: (type: MenuActionType) => void;
  onClose: () => void;
  role: string;
}) {
  return (
    <>
      <div className="hidden lg:block fixed top-0 left-0 right-0 bottom-0 z-40" onClick={onClose} />
      <div
        className="hidden lg:block fixed z-50 w-52 py-1"
        style={{
          top: pos.top,
          right: pos.right,
          backgroundColor: '#242424',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          borderRadius: '8px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
        }}
      >
        {menuOptions(role).map((o) => {
          const disabled = o.type === "transfer" && product.factory_stock === 0;
          return (
            <button
              key={o.type}
              onClick={() => {
                if (!disabled) onAction(o.type);
                onClose();
              }}
              disabled={disabled}
              className={[
                "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors",
                disabled
                  ? "text-white/20 cursor-not-allowed"
                  : "text-white/70 hover:text-white hover:bg-white/6",
              ].join(" ")}
            >
              <o.icon size={14} strokeWidth={2} />
              {o.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── Bottom sheet (below lg) ───────────────────────────────────────────────────

function BottomSheet({
  product,
  onAction,
  onClose,
  role,
}: {
  product: Product;
  onAction: (type: MenuActionType) => void;
  onClose: () => void;
  role: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <div
        className="hidden md:block lg:hidden fixed top-0 left-0 right-0 bottom-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          "hidden md:flex lg:hidden fixed left-0 right-0 bottom-0 z-50 flex-col bg-[#1a1a1a] border-t border-white/10 rounded-t-2xl",
          "transition-transform duration-300 ease-out",
          visible ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        <div className="px-5 pt-4 pb-3">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
          <p className="text-sm font-medium text-white">{product.name}</p>
          <p className="text-xs text-white/40 mt-0.5">Selecciona una acción</p>
        </div>
        <div className="px-3 pb-10">
          {menuOptions(role).map((o) => {
            const disabled = o.type === "transfer" && product.factory_stock === 0;
            return (
              <button
                key={o.type}
                onClick={() => {
                  if (!disabled) {
                    onAction(o.type);
                    onClose();
                  }
                }}
                disabled={disabled}
                className={[
                  "w-full flex items-center gap-4 px-4 py-4 rounded-xl text-sm transition-colors",
                  disabled
                    ? "text-white/20 cursor-not-allowed"
                    : "text-white/70 hover:text-white hover:bg-white/6",
                ].join(" ")}
              >
                <div className={`p-2.5 rounded-xl ${disabled ? "bg-white/4" : "bg-white/8"}`}>
                  <o.icon size={18} strokeWidth={1.75} />
                </div>
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Full-screen menu — mobile only (below md) ────────────────────────────────

function FullScreenMenu({
  product,
  onAction,
  onClose,
  role,
}: {
  product: Product;
  onAction: (type: MenuActionType) => void;
  onClose: () => void;
  role: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={[
        "fixed top-0 left-0 right-0 bottom-0 z-50 bg-[#0a0a0a] flex flex-col",
        "transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      {/* Close button */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <p className="text-lg font-semibold text-white">{product.name}</p>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/16 transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Options — centered vertically in remaining space */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
        {menuOptions(role).map((o) => {
          const disabled = o.type === "transfer" && product.factory_stock === 0;
          return (
            <button
              key={o.type}
              onClick={() => {
                if (!disabled) {
                  onAction(o.type);
                  onClose();
                }
              }}
              disabled={disabled}
              className={[
                "w-full flex items-center gap-5 px-6 py-5 rounded-2xl text-lg font-medium transition-colors",
                disabled
                  ? "text-white/20 bg-white/4 cursor-not-allowed"
                  : "text-white bg-white/8 hover:bg-white/12 active:bg-white/16",
              ].join(" ")}
            >
              <div className={`p-3 rounded-xl ${disabled ? "bg-white/4" : "bg-white/10"}`}>
                <o.icon size={24} strokeWidth={1.75} />
              </div>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Product cards — mobile/tablet (below lg) ──────────────────────────────────

function ProductCards({
  products,
  openMenuId,
  onMenuClick,
}: {
  products: Product[];
  openMenuId: string | null;
  onMenuClick: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#1a1a1a] px-6 py-12 text-center">
        <p className="text-sm text-white/30">No hay productos en el inventario.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-2">
      {products.map((p) => {
        const total = p.factory_stock + p.store_stock;
        return (
          <div
            key={p.id}
            className="rounded-xl bg-[#1a1a1a] border border-white/8 px-4 py-3"
          >
            {/* Name + menu button */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg md:text-sm font-semibold md:font-medium text-white">{p.name}</p>
              <button
                onClick={(e) => onMenuClick(e, p.id)}
                className={[
                  "p-1.5 rounded-md min-h-[44px] min-w-[44px] transition-colors",
                  openMenuId === p.id
                    ? "text-white bg-white/10"
                    : "text-white/50 hover:text-white hover:bg-white/8",
                ].join(" ")}
              >
                <MoreHorizontal size={16} className="w-6 h-6 md:w-4 md:h-4" />
              </button>
            </div>

            {/* Stats — 2×2 grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-sm md:text-xs text-white/40 mb-1">Stock fábrica</p>
                <p className="text-2xl md:text-base"><StockValue value={p.factory_stock} /></p>
              </div>
              <div>
                <p className="text-sm md:text-xs text-white/40 mb-1">Stock tienda</p>
                <p className="text-2xl md:text-base"><StockValue value={p.store_stock} /></p>
              </div>
              <div>
                <p className="text-sm md:text-xs text-white/40 mb-1">Total</p>
                <p className="text-2xl md:text-base font-medium text-white/80 tabular-nums">{total}</p>
              </div>
              <div>
                <p className="text-sm md:text-xs text-white/40 mb-1">Valor en stock</p>
                <p className="text-2xl md:text-base text-white/60 tabular-nums">{formatCurrency(total * p.price)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Desktop table (lg+) ───────────────────────────────────────────────────────

const HEADERS = [
  { label: "Nombre", right: false },
  { label: "Stock fábrica", right: true },
  { label: "Stock tienda", right: true },
  { label: "Total", right: true },
  { label: "Valor en stock", right: true },
  { label: "", right: true },
];

function ProductsTable({
  products,
  openMenuId,
  onMenuClick,
}: {
  products: Product[];
  openMenuId: string | null;
  onMenuClick: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#1a1a1a] px-6 py-12 text-center">
        <p className="text-sm text-white/30">No hay productos en el inventario.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1a1a1a] border-b border-white/8">
            {HEADERS.map(({ label, right }) => (
              <th
                key={label}
                className={`px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider whitespace-nowrap ${right ? "text-right" : "text-left"}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {products.map((p) => {
            const total = p.factory_stock + p.store_stock;
            return (
              <tr key={p.id} className="hover:bg-white/3 transition-colors">
                <td className="px-5 py-4 font-medium text-white whitespace-nowrap">
                  {p.name}
                </td>
                <td className="px-5 py-4 text-right">
                  <StockValue value={p.factory_stock} />
                </td>
                <td className="px-5 py-4 text-right">
                  <StockValue value={p.store_stock} />
                </td>
                <td className="px-5 py-4 text-right text-white/80 tabular-nums font-medium">
                  {total}
                </td>
                <td className="px-5 py-4 text-right text-white/60 tabular-nums">
                  {formatCurrency(total * p.price)}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={(e) => onMenuClick(e, p.id)}
                    className={[
                      "p-1.5 rounded-md transition-colors",
                      openMenuId === p.id
                        ? "text-white bg-white/10"
                        : "text-white/30 hover:text-white hover:bg-white/8",
                    ].join(" ")}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function InventarioPage({ products, role }: { products: Product[]; role: string }) {
  const [modal, setModal] = useState<ModalState>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const isDesktop = useIsDesktop();
  const isMobile = useIsMobile();

  const activeProducts = products.filter((p) => p.active);
  const openProduct = products.find((p) => p.id === openMenuId) ?? null;

  // Close desktop dropdown on scroll to avoid stale positioning
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => {
      if (window.innerWidth >= 1024) setOpenMenuId(null);
    };
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [openMenuId]);

  function handleMenuClick(
    e: React.MouseEvent<HTMLButtonElement>,
    productId: string
  ) {
    if (openMenuId === productId) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenMenuId(productId);
  }

  function handleAction(type: MenuActionType) {
    if (!openProduct) return;
    setModal({ type, product: openProduct });
    setOpenMenuId(null);
  }

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-xl font-semibold text-white">Inventario</h1>
      </div>

      {/* Summary cards — always 3-col */}
      <div className="mt-6">
        <SummaryCards products={products} />
      </div>

      {/* Card list — mobile/tablet | Table — desktop */}
      <div className="mt-6">
        {isDesktop ? (
          <ProductsTable
            products={activeProducts}
            openMenuId={openMenuId}
            onMenuClick={handleMenuClick}
          />
        ) : (
          <ProductCards
            products={activeProducts}
            openMenuId={openMenuId}
            onMenuClick={handleMenuClick}
          />
        )}
      </div>

      {/* Menus */}
      {openMenuId && openProduct && (
        <>
          {menuPos && (
            <DropdownMenu
              product={openProduct}
              pos={menuPos}
              onAction={handleAction}
              onClose={() => setOpenMenuId(null)}
              role={role}
            />
          )}
          {isMobile && (
            <FullScreenMenu
              product={openProduct}
              onAction={handleAction}
              onClose={() => setOpenMenuId(null)}
              role={role}
            />
          )}
          <BottomSheet
            product={openProduct}
            onAction={handleAction}
            onClose={() => setOpenMenuId(null)}
            role={role}
          />
        </>
      )}

      {/* Action modals */}
      {modal?.type === "add" && (
        <AddStockModal product={modal.product} role={role} isMobile={isMobile} onClose={() => setModal(null)} />
      )}
      {modal?.type === "deduct" && (
        <DeductStockModal
          product={modal.product}
          role={role}
          isMobile={isMobile}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "transfer" && (
        <TransferModal
          product={modal.product}
          isMobile={isMobile}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "history" && (
        <MovementsModal
          product={modal.product}
          isMobile={isMobile}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

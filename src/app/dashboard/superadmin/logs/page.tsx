"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ArrowLeft, Search, ShieldAlert, Banknote, Activity,
  FileSpreadsheet, Fingerprint, Calendar, Loader2,
  ShieldCheck, Globe, Server, ChevronLeft, ChevronRight,
  TrendingUp, AlertTriangle, BadgeCheck, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { AuditAction } from "@prisma/client";

// ─────────────────────────────────────────────
// TYPES — 100 % alignés sur le schéma Prisma
// ─────────────────────────────────────────────

type AuditCategory = "FINANCE" | "SECURITY" | "COMPLIANCE" | "SYSTEM";

interface AuditLogUser {
  name:  string | null;
  email: string;
  role:  string;
}

interface AuditLog {
  id:         string;
  action:     AuditAction;
  entityId:   string | null;
  entityType: string | null;
  userEmail:  string | null;
  metadata:   Record<string, unknown> | null;
  ipAddress:  string | null;
  userAgent:  string | null;
  createdAt:  string;
  user:       AuditLogUser | null;
}

interface StatEntry {
  action: AuditAction;
  count:  number;
}

interface Pagination {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

interface ApiResponse {
  success:    boolean;
  logs:       AuditLog[];
  pagination: Pagination;
  stats:      StatEntry[];
}

// ─────────────────────────────────────────────
// HELPERS — typage strict, zéro string.includes()
// ─────────────────────────────────────────────

const FINANCE_ACTIONS    = new Set<AuditAction>(["PAYMENT_SUCCESS", "BOOKING_PAYMENT_SUCCESS", "CROWDFUNDING_SUCCESS", "PAYMENT_FAILED"]);
const SECURITY_ACTIONS   = new Set<AuditAction>(["FRAUD_ATTEMPT", "USER_DELETED"]);
const COMPLIANCE_ACTIONS = new Set<AuditAction>(["KYC_VALIDATED"]);

const getCategory = (action: AuditAction): AuditCategory => {
  if (FINANCE_ACTIONS.has(action))    return "FINANCE";
  if (SECURITY_ACTIONS.has(action))   return "SECURITY";
  if (COMPLIANCE_ACTIONS.has(action)) return "COMPLIANCE";
  return "SYSTEM";
};

const ACTION_LABELS: Record<AuditAction, string> = {
  PAYMENT_SUCCESS: "Paiement Réussi",
  BOOKING_PAYMENT_SUCCESS: "Paiement Réservation",
  CROWDFUNDING_SUCCESS: "Investissement Réussi",
  PAYMENT_FAILED: "Paiement Échoué",
  FRAUD_ATTEMPT: "Tentative de Fraude",
  KYC_VALIDATED: "KYC Validé",
  KYC_REJECTED: "KYC Rejeté",
  USER_DELETED: "Utilisateur Supprimé",
  NOTICE_GIVEN: "Préavis Donné",
  NOTICE_ACKNOWLEDGED: "Préavis Accepté",
  DEPOSIT_REFUNDED: "Caution Remboursée",
  PROPERTY_CREATED: "Bien Créé",
  PROPERTY_UPDATED: "Bien Mis à Jour",
  AGENCY_CREATED: "Agence Créée",
  MISSION_CREATED: "Mission Créée",
  MISSION_ACCEPTED: "Mission Acceptée",
  LEASE_APPLICATION: "Candidature Bail",
  LEASE_SIGNED: "Bail Signé",
  LEASE_TERMINATED: "Bail Résilié",
  LISTING_CREATED: "Annonce Créée",
  LISTING_UPDATED: "Annonce Modifiée",
  SECURITY_ALERT: "Alerte Sécurité"
};

const ACTION_COLOR: Record<AuditAction, string> = {
  PAYMENT_SUCCESS: "text-green-600 bg-green-100",
  BOOKING_PAYMENT_SUCCESS: "text-blue-600 bg-blue-100",
  CROWDFUNDING_SUCCESS: "text-purple-600 bg-purple-100",
  PAYMENT_FAILED: "text-red-600 bg-red-100",
  FRAUD_ATTEMPT: "text-red-800 bg-red-200",
  KYC_VALIDATED: "text-emerald-600 bg-emerald-100",
  KYC_REJECTED: "text-orange-600 bg-orange-100",
  USER_DELETED: "text-gray-600 bg-gray-100",
  NOTICE_GIVEN: "text-orange-600 bg-orange-100",
  NOTICE_ACKNOWLEDGED: "text-teal-600 bg-teal-100",
  DEPOSIT_REFUNDED: "text-indigo-600 bg-indigo-100",
  PROPERTY_CREATED: "text-cyan-600 bg-cyan-100",
  PROPERTY_UPDATED: "text-blue-500 bg-blue-50",
  AGENCY_CREATED: "text-fuchsia-600 bg-fuchsia-100",
  MISSION_CREATED: "text-amber-600 bg-amber-100",
  MISSION_ACCEPTED: "text-lime-600 bg-lime-100",
  LEASE_APPLICATION: "text-sky-600 bg-sky-100",
  LEASE_SIGNED: "text-emerald-600 bg-emerald-100",
  LEASE_TERMINATED: "text-rose-600 bg-rose-100",
  LISTING_CREATED: "text-cyan-600 bg-cyan-100",
  LISTING_UPDATED: "text-blue-500 bg-blue-50",
  SECURITY_ALERT: "text-red-800 bg-red-200"
};

const CATEGORY_STYLE: Record<AuditCategory, { color: string; icon: React.ReactNode }> = {
  FINANCE:    { color: "text-emerald-400", icon: <Banknote   className="w-3.5 h-3.5" /> },
  SECURITY:   { color: "text-red-400",     icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  COMPLIANCE: { color: "text-blue-400",    icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  SYSTEM:     { color: "text-slate-400",   icon: <Activity    className="w-3.5 h-3.5" /> },
};

const renderMetadata = (meta: Record<string, unknown> | null): React.ReactNode => {
  if (!meta || Object.keys(meta).length === 0)
    return <span className="text-slate-600 italic">—</span>;

  if (typeof meta.amount === "number")
    return (
      <span className="text-emerald-400 font-bold">
        {meta.amount.toLocaleString("fr-FR")} FCFA
        {typeof meta.type === "string" ? ` · ${meta.type}` : ""}
      </span>
    );

  const summary = JSON.stringify(meta);
  return (
    <span
      className="text-slate-500 truncate block max-w-[220px] font-mono"
      title={summary}
    >
      {summary}
    </span>
  );
};

// ─────────────────────────────────────────────
// STATS CARD
// ─────────────────────────────────────────────
interface StatsCardProps {
  label:    string;
  value:    number;
  icon:     React.ReactNode;
  color:    string;
  bg:       string;
  border:   string;
}
const StatsCard = ({ label, value, icon, color, bg, border }: StatsCardProps) => (
  <div className={`flex items-center gap-3 p-4 rounded-xl border ${bg} ${border}`}>
    <div className={`p-2 rounded-lg ${bg} ${color}`}>{icon}</div>
    <div>
      <p className={`text-xl font-black ${color}`}>{value.toLocaleString("fr-FR")}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</p>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────
export default function AdminLogsPage() {
  const router = useRouter();

  const [logs,       setLogs]       = useState<AuditLog[]>([]);
  const [stats,      setStats]      = useState<StatEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 100, totalPages: 1 });
  const [loading,    setLoading]    = useState(true);

  // Filtres locaux
  const [searchTerm,  setSearchTerm]  = useState("");
  const [dateStart,   setDateStart]   = useState("");
  const [dateEnd,     setDateEnd]     = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "">("");
  const [currentPage,  setCurrentPage]  = useState(1);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page",  String(page));
      params.set("limit", "100");
      if (searchTerm)    params.set("search",    searchTerm);
      if (actionFilter)  params.set("action",    actionFilter);
      if (dateStart)     params.set("dateStart", dateStart);
      if (dateEnd)       params.set("dateEnd",   dateEnd);

      const res = await api.get<ApiResponse>(`/superadmin/logs?${params.toString()}`);

      if (res.data.success) {
        setLogs(res.data.logs);
        setPagination(res.data.pagination);
        setStats(res.data.stats);
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 401 || axiosError?.response?.status === 403) {
        toast.error("Accès refusé. Super Admin uniquement.");
        router.push("/login");
      } else {
        toast.error("Impossible de charger le registre d'audit.");
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, actionFilter, dateStart, dateEnd, router]);

  // Rechargement à chaque changement de filtre (reset page à 1)
  useEffect(() => {
    setCurrentPage(1);
    fetchLogs(1);
  }, [searchTerm, actionFilter, dateStart, dateEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchLogs(page);
  };

  // ─────────────────────────────────────────────
  // STATS AGRÉGÉES
  // ─────────────────────────────────────────────
  const countByCategory = stats.reduce<Record<AuditCategory, number>>(
    (acc, s) => {
      const cat = getCategory(s.action);
      acc[cat] = (acc[cat] ?? 0) + s.count;
      return acc;
    },
    { FINANCE: 0, SECURITY: 0, COMPLIANCE: 0, SYSTEM: 0 }
  );

  // ─────────────────────────────────────────────
  // EXPORT CSV
  // ─────────────────────────────────────────────
  const handleExportCSV = () => {
    if (logs.length === 0) return toast.error("Aucune donnée à exporter.");

    const headers = ["ID_LOG", "DATE_ISO", "CATEGORIE", "ACTION", "LIBELLE", "UTILISATEUR", "EMAIL", "ROLE", "ENTITE_TYPE", "ENTITE_ID", "IP", "DETAILS"];

    const rows = logs.map((log) => [
      `"${log.id}"`,
      `"${new Date(log.createdAt).toISOString()}"`,
      `"${getCategory(log.action)}"`,
      `"${log.action}"`,
      `"${ACTION_LABELS[log.action]}"`,
      `"${log.user?.name ?? log.userEmail ?? "SYSTEM"}"`,
      `"${log.user?.email ?? log.userEmail ?? ""}"`,
      `"${log.user?.role ?? "ROOT"}"`,
      `"${log.entityType ?? ""}"`,
      `"${log.entityId ?? ""}"`,
      `"${log.ipAddress ?? ""}"`,
      `"${log.metadata ? JSON.stringify(log.metadata).replace(/"/g, "'") : ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AUDIT_BABIMMO_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${logs.length} entrées exportées.`);
  };

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────
  if (loading && logs.length === 0)
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-slate-500 text-sm font-black uppercase tracking-widest">Déchiffrement du registre…</p>
      </div>
    );

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-6 md:p-8 font-sans pb-24">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/superadmin"
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 uppercase">
              <Fingerprint className="text-orange-500 w-6 h-6" />
              Registre d'Audit
            </h1>
            <p className="text-slate-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-widest">
              MASTER_LOG_V6 · {pagination.total.toLocaleString("fr-FR")} ENTRÉES SÉCURISÉES
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Exporter (.CSV)
        </button>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          label="Finance"
          value={countByCategory.FINANCE}
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-emerald-400"
          bg="bg-emerald-400/5"
          border="border-emerald-400/20"
        />
        <StatsCard
          label="Sécurité"
          value={countByCategory.SECURITY}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="text-red-400"
          bg="bg-red-400/5"
          border="border-red-400/20"
        />
        <StatsCard
          label="Conformité"
          value={countByCategory.COMPLIANCE}
          icon={<BadgeCheck className="w-4 h-4" />}
          color="text-blue-400"
          bg="bg-blue-400/5"
          border="border-blue-400/20"
        />
        <StatsCard
          label="Système"
          value={countByCategory.SYSTEM}
          icon={<Server className="w-4 h-4" />}
          color="text-slate-400"
          bg="bg-slate-400/5"
          border="border-slate-700"
        />
      </div>

      {/* ── FILTRES ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
        {/* Recherche */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="ID, nom, email, IP, entité…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B1120] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-orange-500 outline-none transition font-mono placeholder:text-slate-600"
          />
        </div>

        {/* Filtre action */}
        <div className="relative">
          <Filter className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as AuditAction | "")}
            className="w-full bg-[#0B1120] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-300 focus:border-orange-500 outline-none appearance-none cursor-pointer"
          >
            <option value="">Toutes les actions</option>
            {Object.values(AuditAction).map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
        </div>

        {/* Date début */}
        <div className="relative">
          <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="w-full bg-[#0B1120] border border-slate-800 rounded-xl py-2.5 pl-10 text-xs text-slate-300 focus:border-orange-500 outline-none"
          />
        </div>

        {/* Date fin */}
        <div className="relative">
          <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="w-full bg-[#0B1120] border border-slate-800 rounded-xl py-2.5 pl-10 text-xs text-slate-300 focus:border-orange-500 outline-none"
          />
        </div>
      </div>

      {/* ── TABLEAU ── */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-3 bg-orange-500/5 border-b border-orange-500/20">
            <Loader2 className="w-3 h-3 text-orange-400 animate-spin" />
            <span className="text-orange-400 text-[10px] font-bold uppercase tracking-widest">Mise à jour…</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0F172A] border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-widest font-mono">
              <tr>
                <th className="p-4 w-32">Horodatage</th>
                <th className="p-4 w-28">Catégorie</th>
                <th className="p-4 w-44">Utilisateur</th>
                <th className="p-4">Action & Détails</th>
                <th className="p-4 w-36">Entité</th>
                <th className="p-4 w-32">Origine</th>
                <th className="p-4 text-right w-28">Ref.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {logs.map((log) => {
                const category = getCategory(log.action);
                const catStyle = CATEGORY_STYLE[category];
                const actionColor = ACTION_COLOR[log.action];

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">

                    {/* Horodatage */}
                    <td className="p-4 font-mono text-[10px] whitespace-nowrap">
                      <span className="text-slate-200 font-bold">
                        {new Date(log.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                      <br />
                      <span className="text-slate-500">
                        {new Date(log.createdAt).toLocaleTimeString("fr-FR")}
                      </span>
                    </td>

                    {/* Catégorie */}
                    <td className="p-4">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-slate-950/80 text-[9px] font-black uppercase tracking-tight ${catStyle.color} border-slate-700`}>
                        {catStyle.icon}
                        {category}
                      </div>
                    </td>

                    {/* Utilisateur */}
                    <td className="p-4">
                      {log.user ? (
                        <>
                          <p className="text-slate-200 font-black text-xs uppercase tracking-tight truncate max-w-[160px]">
                            {log.user.name ?? "Utilisateur"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate max-w-[160px]">
                            {log.user.email}
                          </p>
                          <span className="text-[9px] text-slate-600 uppercase">{log.user.role}</span>
                        </>
                      ) : (
                        <>
                          <p className="text-orange-500 font-black text-xs">🤖 SYSTEM</p>
                          {log.userEmail && (
                            <p className="text-[10px] text-slate-600 font-mono truncate max-w-[160px]">
                              {log.userEmail}
                            </p>
                          )}
                        </>
                      )}
                    </td>

                    {/* Action & Détails */}
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tighter mb-1.5 ${actionColor}`}>
                        {ACTION_LABELS[log.action]}
                      </span>
                      <div className="text-[10px] font-mono">
                        {renderMetadata(log.metadata)}
                      </div>
                    </td>

                    {/* Entité */}
                    <td className="p-4">
                      {log.entityType ? (
                        <>
                          <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono uppercase">
                            {log.entityType}
                          </span>
                          {log.entityId && (
                            <p className="text-[9px] text-slate-600 font-mono mt-1 select-all cursor-copy hover:text-orange-400 transition-colors truncate max-w-[120px]">
                              {log.entityId.split("-")[0].toUpperCase()}…
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-700 text-[10px]">—</span>
                      )}
                    </td>

                    {/* Origine (IP) */}
                    <td className="p-4">
                      {log.ipAddress ? (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                          <Globe className="w-3 h-3 text-slate-600 shrink-0" />
                          <span className="truncate max-w-[90px]" title={log.ipAddress}>
                            {log.ipAddress}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-700 text-[10px]">—</span>
                      )}
                    </td>

                    {/* Référence */}
                    <td className="p-4 text-right">
                      <span className="font-mono text-[9px] text-slate-600 bg-slate-950 px-2 py-1 rounded select-all cursor-copy hover:text-orange-400 hover:bg-orange-500/10 transition-colors">
                        {log.id.split("-")[0].toUpperCase()}…
                      </span>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Vide */}
        {!loading && logs.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600 border border-slate-700">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-slate-500 font-black uppercase tracking-widest text-sm">
              Aucune trace sécurisée
            </h3>
            <p className="text-slate-600 text-xs font-mono uppercase mt-1">
              Vérifiez les paramètres de filtrage
            </p>
          </div>
        )}
      </div>

      {/* ── PAGINATION ── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-[11px] text-slate-600 font-mono">
            Page <span className="text-slate-400 font-bold">{currentPage}</span> / {pagination.totalPages}
            &nbsp;·&nbsp;
            <span className="text-slate-400 font-bold">{pagination.total.toLocaleString("fr-FR")}</span> entrées
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <button
              disabled={currentPage >= pagination.totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

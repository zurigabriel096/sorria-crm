// Objeto de estilos inline compartilhado entre componentes/páginas.
// Mantido como no protótipo original para minimizar risco na migração;
// numa próxima iteração isso pode virar CSS Modules ou styled-components.
import { T } from "../theme";

export const s = {
  root: { display: "flex", minHeight: "100vh", background: T.bg, color: T.ink, fontSize: 14 },
  main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  content: { padding: "22px clamp(16px,3vw,30px)", flex: 1, animation: "fadeUp .22s ease-out" },
  protoTag: { position: "fixed", bottom: 10, right: 12, fontSize: 10, letterSpacing: .3, color: T.inkSoft, background: T.cardBg, border: `1px solid ${T.line}`, padding: "4px 9px", borderRadius: 20, opacity: .9 },
  hr: { height: 1, background: T.line, margin: "6px 0 10px" },

  loginRoot: { display: "flex", minHeight: "100vh" },
  loginLeft: { flex: 1, background: `linear-gradient(150deg,${T.primary},${T.primaryDark})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 },
  loginH1: { fontSize: 32, fontWeight: 800, lineHeight: 1.15, margin: "30px 0 16px", letterSpacing: "-.02em" },
  loginSub: { fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,.9)" },
  loginRight: { width: "min(46%,520px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, background: T.bg },
  loginCard: { width: "100%", maxWidth: 380, background: T.cardBg, borderRadius: 20, padding: 34, boxShadow: "0 20px 50px rgba(20,40,55,.12)" },

  sidebar: { background: T.cardBg, borderRight: `1px solid ${T.line}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", transition: "width .22s cubic-bezier(.4,0,.2,1)", overflow: "hidden" },
  collapseBtn: { width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: T.cardBg, border: `1px solid ${T.line}` },
  navItem: { width: "100%", display: "flex", alignItems: "center", gap: 12, borderRadius: 11, color: T.inkSoft, fontWeight: 600, fontSize: 14, marginBottom: 3, transition: "background .15s", whiteSpace: "nowrap" },
  navItemActive: { background: T.primarySoft, color: T.primaryDark },

  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px clamp(16px,3vw,30px)", background: T.cardBg, borderBottom: `1px solid ${T.line}`, position: "sticky", top: 0, zIndex: 20 },
  waPill: { display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 20, border: "none" },
  avatar: { width: 36, height: 36, borderRadius: "50%", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" },
  profileMenu: { position: "absolute", top: 46, right: 0, width: 240, background: T.cardBg, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, boxShadow: "0 16px 40px rgba(20,40,55,.16)", zIndex: 30 },
  logoutBtn: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 8px", borderRadius: 9, color: T.coral, fontWeight: 700, fontSize: 13.5 },

  importBox: { display: "flex", alignItems: "center", gap: 14, padding: 22, border: `2px dashed ${T.primary}66`, borderRadius: 16, background: T.primarySoft + "66", cursor: "pointer", transition: "all .15s" },

  card: { background: T.cardBg, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 16 },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 14 },

  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 },
  kpiCard: { background: T.cardBg, border: `1px solid ${T.line}`, borderRadius: 16, padding: 18 },
  kpiHi: { background: `linear-gradient(150deg,${T.primary},${T.primaryDark})`, border: "none" },
  kpiIcon: { width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center" },

  segRow: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0" },
  segBadge: { fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 7, whiteSpace: "nowrap" },
  segBarTrack: { flex: 1, height: 8, background: T.lineSoft, borderRadius: 20, overflow: "hidden" }, segBarFill: { height: "100%", borderRadius: 20 },

  toolbar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  search: { display: "flex", alignItems: "center", gap: 8, background: T.cardBg, border: `1px solid ${T.line}`, borderRadius: 10, padding: "0 12px", height: 40 },
  searchInput: { border: "none", fontSize: 14, width: 160, background: "transparent" },

  tableScroll: { overflowX: "auto", margin: "0 -20px" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: { textAlign: "left", fontSize: 11.5, fontWeight: 600, color: T.inkSoft, padding: "12px 14px", borderBottom: `1px solid ${T.line}`, whiteSpace: "nowrap" },
  thL: { textAlign: "left", fontSize: 11.5, fontWeight: 600, color: T.inkSoft, padding: "12px 20px", borderBottom: `1px solid ${T.line}` },
  td: { padding: "12px 14px", borderBottom: `1px solid ${T.lineSoft}`, fontSize: 13.5 },
  tdL: { padding: "12px 20px", borderBottom: `1px solid ${T.lineSoft}` },
  tdNum: { padding: "12px 14px", borderBottom: `1px solid ${T.lineSoft}`, fontSize: 13, color: T.inkSoft, whiteSpace: "nowrap" },

  tagOk: { fontSize: 11.5, fontWeight: 700, color: "#0E9484", background: "#E1F4F0", padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" },
  tagBad: { fontSize: 11.5, fontWeight: 700, color: T.coral, background: "#FDE9E6", padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" },
  tagMuted: { fontSize: 11.5, fontWeight: 700, color: T.inkSoft, background: T.lineSoft, padding: "3px 10px", borderRadius: 20 },
  tagChip: { fontSize: 10.5, fontWeight: 600, color: T.primaryDark, background: T.primarySoft, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" },
  tagChipBig: { fontSize: 12.5, fontWeight: 600, color: T.primaryDark, background: T.primarySoft, padding: "5px 11px", borderRadius: 8, border: "none" },
  statusBadge: { fontWeight: 700, borderRadius: 20, whiteSpace: "nowrap" },
  // borderRadius 20 (pill) igual ao resto da familia de selos (tagOk/tagBad/tagMuted) -
  // antes era 7 (retangulo arredondado), inconsistente do lado do selo de canal na campanha.
  objTag: { fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: T.lineSoft, color: T.inkSoft },
  btnPreview: { fontSize: 11, fontWeight: 600, color: T.primaryDark, background: T.cardBg, border: `1px solid ${T.primary}55`, padding: "3px 9px", borderRadius: 6 },

  segCard: { background: T.cardBg, border: `1px solid ${T.line}`, borderRadius: 16, padding: 18 },
  countPill: { fontSize: 12, fontWeight: 700, color: T.primaryDark, background: T.primarySoft, padding: "5px 11px", borderRadius: 20, whiteSpace: "nowrap", height: "fit-content" },
  tagResult: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: T.lineSoft, borderRadius: 9, fontSize: 13.5 },

  // height:40 pra bater com s.select - senao o toggle fica uns 8px mais baixo
  // que o dropdown do lado quando os dois ficam juntos numa toolbar.
  toggle: { display: "flex", alignItems: "center", height: 40, background: T.lineSoft, borderRadius: 9, padding: 3, gap: 3 },
  toggleBtn: { height: 34, padding: "0 16px", display: "flex", alignItems: "center", borderRadius: 7, fontSize: 13, fontWeight: 700, color: T.inkSoft },
  condRow: { display: "flex", alignItems: "center", gap: 8, background: T.lineSoft, padding: "8px 10px", borderRadius: 10 },
  condSelect: { flex: 1, minWidth: 0, height: 36, border: `1px solid ${T.line}`, borderRadius: 8, padding: "0 8px", fontSize: 13, background: T.cardBg, color: T.ink },
  condRm: { width: 30, height: 30, borderRadius: 8, background: T.cardBg, border: `1px solid ${T.line}`, color: T.coral, fontSize: 18, fontWeight: 700, flexShrink: 0 },

  campCard: { background: T.cardBg, border: `1px solid ${T.line}`, borderRadius: 16, padding: 18 },
  tplGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 10 },
  tplPick: { textAlign: "left", background: T.cardBg, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12, cursor: "pointer" },

  planHero: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, background: `linear-gradient(150deg,${T.primary},${T.primaryDark})`, color: "#fff", borderRadius: 18, padding: "22px 24px", flexWrap: "wrap" },
  planUpgrade: { background: T.cardBg, color: T.primaryDark, fontWeight: 700, fontSize: 14, padding: "11px 18px", borderRadius: 11 },
  aviso: { fontSize: 12.5, color: "#8A5A2B", background: "#FBF1D8", border: "1px solid #EBD9A8", borderRadius: 12, padding: "12px 14px", lineHeight: 1.5 },
  volGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 },
  volCard: { background: T.cardBg, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14 },
  fatTd: { padding: "10px 4px", borderBottom: `1px solid ${T.lineSoft}`, fontSize: 13.5, color: T.inkSoft },

  summaryRow: { display: "flex", gap: 26, flexWrap: "wrap" },
  textarea: { width: "100%", border: `1px solid ${T.line}`, borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 1.5, resize: "vertical", color: T.ink, background: T.cardBg },
  waPreview: { background: "#E5DDD5", borderRadius: 12, padding: 14 },
  waBubble: { background: "#DCF8C6", borderRadius: "12px 12px 12px 3px", padding: "10px 13px", fontSize: 13.5, color: "#1B2A3D", maxWidth: 360, boxShadow: "0 1px 1px rgba(0,0,0,.1)", lineHeight: 1.45 },

  stepDot: { width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 },
  spinner: { width: 30, height: 30, border: `3px solid ${T.primarySoft}`, borderTopColor: T.primary, borderRadius: "50%", animation: "spin .8s linear infinite" },
  progTrack: { height: 10, background: T.lineSoft, borderRadius: 20, overflow: "hidden", marginBottom: 16 },
  progFill: { height: "100%", background: `linear-gradient(90deg,${T.primary},${T.wa})`, borderRadius: 20, transition: "width .4s" },
  feed: { display: "grid", gap: 8 }, feedRow: { display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, padding: "8px 12px", background: T.lineSoft, borderRadius: 10 },

  channelCard: { display: "flex", alignItems: "center", gap: 12, background: T.cardBg, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, transition: "all .15s", width: "100%" },
  channelIcon: { width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", flexShrink: 0 },
  slaCard: { background: T.cardBg, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16 },

  fieldLabel: { display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 7 },
  input: { width: "100%", height: 42, border: `1px solid ${T.line}`, borderRadius: 10, padding: "0 13px", fontSize: 14, color: T.ink, background: T.cardBg, transition: "all .15s" },
  select: { height: 40, border: `1px solid ${T.line}`, borderRadius: 10, padding: "0 12px", fontSize: 13.5, color: T.ink, background: T.cardBg },

  btnPrimary: { background: T.primary, color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "12px 20px", borderRadius: 11, width: "100%" },
  btnPrimarySm: { background: T.primary, color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "9px 16px", borderRadius: 10 },
  btnGhost: { background: T.cardBg, color: T.ink, fontWeight: 700, fontSize: 14, padding: "11px 18px", borderRadius: 11, border: `1px solid ${T.line}` },
  btnGhostSm: { background: T.cardBg, color: T.ink, fontWeight: 700, fontSize: 13, padding: "8px 13px", borderRadius: 9, border: `1px solid ${T.line}`, display: "inline-flex", alignItems: "center", gap: 6 },
  btnWa: { background: T.wa, color: "#fff", fontWeight: 700, fontSize: 14, padding: "11px 18px", borderRadius: 11, display: "inline-flex", alignItems: "center", gap: 8 },
  linkBtn: { color: T.primary, fontWeight: 600, fontSize: 13 },

  modalWrap: { position: "fixed", inset: 0, background: "rgba(20,40,55,.42)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 },
  modal: { position: "relative", background: T.cardBg, borderRadius: 18, padding: 24, width: "min(460px,100%)", boxShadow: "0 20px 60px rgba(0,0,0,.2)", maxHeight: "92vh", overflowY: "auto" },
  modalX: { position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: 8, background: T.lineSoft, color: T.inkSoft, fontSize: 20, fontWeight: 700, display: "grid", placeItems: "center", lineHeight: 1 },
  confirmBar: { display: "flex", alignItems: "center", gap: 10, marginTop: 16, padding: "12px 14px", background: "#FBF1D8", border: "1px solid #EBD9A8", borderRadius: 12, flexWrap: "wrap" },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.cardBg, color: T.ink, fontWeight: 600, fontSize: 13.5, padding: "12px 18px", borderRadius: 12, boxShadow: "0 10px 30px rgba(20,40,55,.18)", zIndex: 60 },
};

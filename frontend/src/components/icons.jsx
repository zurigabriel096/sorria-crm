import { T } from "../theme";

const I = (p) => ({ width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: p.color || T.inkSoft, strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" });

export const IconGrid = (p) => <svg {...I(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
export const IconUsers = (p) => <svg {...I(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 4a3 3 0 010 6M21 20c0-2.5-1.3-4-3-4.6" /></svg>;
export const IconFilter = (p) => <svg {...I(p)}><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" /></svg>;
// Megafone (bullhorn) de verdade, no estilo do ícone de Campanhas da RD Station.
export const IconMega = (p) => (
  <svg {...I(p)}>
    <path d="M3 10v4a1 1 0 001 1h2l1.2 4.4a1 1 0 00.96.6H10v-6" />
    <path d="M7 10l9-5.2a1 1 0 011.5.87v12.66a1 1 0 01-1.5.87L7 14" />
    <path d="M20 9.5a3 3 0 010 5" />
  </svg>
);
export const IconBook = (p) => (
  <svg {...I(p)}>
    <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 014 18.5v-13z" />
    <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 001.5-1.5v-13z" />
    <path d="M11 4v16" />
  </svg>
);
export const IconX = (p) => <svg {...I(p)} width={p.width || 18} height={p.height || 18}><path d="M18 6L6 18M6 6l12 12" /></svg>;
export const IconPanelLeft = (p) => (
  <svg {...I(p)}>
    <rect x="3" y="4" width="18" height="16" rx="3.5" />
    <path d="M9.5 4v16" />
  </svg>
);
export const IconChat = (p) => <svg {...I(p)}><path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>;
export const IconSend = (p) => <svg {...I(p)}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>;
export const IconTeam = (p) => <svg {...I(p)}><circle cx="12" cy="7" r="3.2" /><path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" /></svg>;
export const IconCard = (p) => <svg {...I(p)}><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></svg>;
export const IconLife = (p) => <svg {...I(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" /></svg>;
export const IconGear = (p) => <svg {...I(p)}><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
export const IconCheck = (p) => <svg {...I(p)}><path d="M20 6L9 17l-5-5" /></svg>;
export const IconSearch = (p) => <svg {...I(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>;
export const IconWa = (p) => <svg {...I(p)}><path d="M3 21l1.6-5A8 8 0 1112 20a8 8 0 01-4.4-1.3L3 21z" /></svg>;
export const IconMail = (p) => <svg {...I(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
export const IconLogout = (p) => <svg {...I(p)}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>;
export const IconUpload = (p) => <svg {...I(p)} width="26" height="26"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>;
export const IconDownload = (p) => <svg {...I(p)} width="15" height="15"><path d="M12 4v12M6 10l6 6 6-6M4 20h16" /></svg>;
export const IconPlus = (p) => <svg {...I(p)} width="13" height="13"><path d="M12 5v14M5 12h14" /></svg>;
const CHEVRON_DEG = { left: 0, right: 180, down: -90, up: 90 };
export const IconChevron = ({ color, dir = "left" }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${CHEVRON_DEG[dir]}deg)`, transition: "transform .15s" }}><path d="M15 6l-6 6 6 6" /></svg>;
export const IconZap = (p) => <svg {...I(p)}><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" /></svg>;
export const IconKanban = (p) => <svg {...I(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></svg>;
export const IconInbox = (p) => <svg {...I(p)}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>;
export const Dot = ({ color }) => <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />;

// Bolinha de status com leve brilho pulsante (verde = ativo, vermelho = inativo).
export const GlowDot = ({ color, size = 9 }) => (
  <span
    style={{
      width: size, height: size, borderRadius: "50%", background: color, display: "inline-block",
      boxShadow: `0 0 0 3px ${color}26`, animation: "glowPulse 2s ease-in-out infinite",
    }}
  />
);

// Logo oficial do WhatsApp (badge verde + glifo do telefone), usado em vez do IconWa
// genérico nos lugares que representam a integração/conexão real com o WhatsApp.
export const WhatsAppLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="WhatsApp">
    <rect x="0" y="0" width="24" height="24" rx="6" fill="#25D366" />
    <path
      fill="#fff"
      d="M12.04 5.5c-3.7 0-6.7 3-6.7 6.68 0 1.18.31 2.33.9 3.34l-.96 3.48 3.57-.93a6.7 6.7 0 003.19.81h.01c3.7 0 6.7-3 6.7-6.68 0-1.78-.7-3.46-1.96-4.72a6.68 6.68 0 00-4.75-1.98zm3.93 9.46c-.17.47-.97.92-1.34.97-.34.06-.78.08-1.26-.08-.29-.09-.66-.22-1.14-.43-2-.87-3.31-2.9-3.41-3.03-.1-.14-.82-1.09-.82-2.08 0-1 .52-1.49.71-1.69.18-.2.4-.25.53-.25l.38.01c.12 0 .29-.05.45.34.17.4.57 1.4.62 1.5.05.1.08.22.02.36-.07.13-.1.22-.2.34-.1.12-.21.27-.3.36-.1.1-.2.21-.09.4.12.2.51.85 1.09 1.38.75.68 1.38.89 1.58.99.2.1.32.09.44-.05.12-.14.5-.59.64-.79.13-.2.27-.17.45-.1.18.07 1.14.54 1.34.64.19.1.32.15.37.23.05.09.05.5-.12.98z"
    />
  </svg>
);

import { T } from "../theme";

const I = (p) => ({ width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: p.color || T.inkSoft, strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" });

export const IconGrid = (p) => <svg {...I(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
export const IconUsers = (p) => <svg {...I(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 4a3 3 0 010 6M21 20c0-2.5-1.3-4-3-4.6" /></svg>;
export const IconFilter = (p) => <svg {...I(p)}><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" /></svg>;
export const IconMega = (p) => <svg {...I(p)}><path d="M3 11v2a1 1 0 001 1h2l6 4V6L6 10H4a1 1 0 00-1 1z" /><path d="M16 8a5 5 0 010 8" /></svg>;
export const IconChat = (p) => <svg {...I(p)}><path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>;
export const IconSend = (p) => <svg {...I(p)}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>;
export const IconTeam = (p) => <svg {...I(p)}><circle cx="12" cy="7" r="3.2" /><path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" /></svg>;
export const IconCard = (p) => <svg {...I(p)}><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></svg>;
export const IconLife = (p) => <svg {...I(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" /></svg>;
export const IconGear = (p) => <svg {...I(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>;
export const IconCheck = (p) => <svg {...I(p)}><path d="M20 6L9 17l-5-5" /></svg>;
export const IconSearch = (p) => <svg {...I(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>;
export const IconWa = (p) => <svg {...I(p)}><path d="M3 21l1.6-5A8 8 0 1112 20a8 8 0 01-4.4-1.3L3 21z" /></svg>;
export const IconMail = (p) => <svg {...I(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
export const IconLogout = (p) => <svg {...I(p)}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>;
export const IconUpload = (p) => <svg {...I(p)} width="26" height="26"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>;
export const IconDownload = (p) => <svg {...I(p)} width="15" height="15"><path d="M12 4v12M6 10l6 6 6-6M4 20h16" /></svg>;
export const IconPlus = (p) => <svg {...I(p)} width="13" height="13"><path d="M12 5v14M5 12h14" /></svg>;
export const IconChevron = ({ color, dir }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dir === "right" ? "rotate(180deg)" : "none" }}><path d="M15 6l-6 6 6 6" /></svg>;
export const Dot = ({ color }) => <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />;

import { T } from "../theme";

export function Logo({ size = 22, light, angry, markOnly }) {
  const h = size + 12, w = markOnly ? h : (168 / 40) * h;
  const markC = light ? "#fff" : T.primary;
  const happy = light ? T.primary : "#fff";
  const word = light ? "#fff" : T.ink, dotia = light ? "#fff" : T.primary;
  return (
    <span className="notranslate" translate="no" style={{ display: "inline-flex" }}>
      <svg width={w} height={h} viewBox={markOnly ? "0 0 40 40" : "0 0 168 40"} fill="none" translate="no" role="img" aria-label="Sorria" className={angry ? "logoShake" : ""} style={{ transformOrigin: "18px 20px" }}>
        <rect x="0" y="2" width="36" height="36" rx="11" fill={angry ? T.angry : markC} style={{ transition: "fill .3s ease" }} />
        <g opacity={angry ? 0 : 1} style={{ transition: "opacity .22s ease" }}>
          <path d="M9 18c2.2 7 15.8 7 18 0" stroke={happy} strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <circle cx="13.5" cy="14.5" r="1.9" fill={happy} /><circle cx="22.5" cy="14.5" r="1.9" fill={happy} />
        </g>
        <g opacity={angry ? 1 : 0} style={{ transition: "opacity .22s ease" }}>
          <circle cx="13.5" cy="14.5" r="1.9" fill="#fff" /><circle cx="22.5" cy="14.5" r="1.9" fill="#fff" />
          <path d="M7 20 L29 20" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        </g>
        {!markOnly && <text x="46" y="28" fontFamily="'Plus Jakarta Sans',sans-serif" fontSize="24" fontWeight="800" letterSpacing="-0.5" translate="no"><tspan fill={word}>Sorr</tspan><tspan fill={dotia}>ia</tspan></text>}
      </svg>
    </span>
  );
}

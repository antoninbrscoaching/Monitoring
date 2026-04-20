import { useState, useEffect } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const NOLIO_CONFIG = {
  CLIENT_ID: "",        // ← Collez votre client_id Nolio ici
  CLIENT_SECRET: "",    // ← Collez votre client_secret Nolio ici
  REDIRECT_URI: "https://project-appbv.vercel.app/",
  AUTH_URL: "https://www.nolio.io/api/authorize/",
  TOKEN_URL: "https://www.nolio.io/api/token/",
  API_BASE: "https://www.nolio.io/api",
};

// ─── PACE ZONES ───────────────────────────────────────────────────────────────
const PACE_ZONES_DEF = [
  { id: 1, name: "Z1 — Endurance", color: "#43e97b", desc: "Récupération & endurance fondamentale", rpe: "2–4/10", factorMin: 1.20, factorMax: 1.40 },
  { id: 2, name: "Z2 — Tempo / Seuil", color: "#f7971e", desc: "Effort contrôlé, seuil anaérobie", rpe: "6–7/10", factorMin: 1.00, factorMax: 1.10 },
  { id: 3, name: "Z3 — VO2max", color: "#ff6b6b", desc: "Haute intensité, allure 5K–10K", rpe: "8–10/10", factorMin: 0.88, factorMax: 0.97 },
];

function calcPaceZones(thresholdPace) {
  return PACE_ZONES_DEF.map(z => ({
    ...z,
    minPace: Math.round(thresholdPace * z.factorMin),
    maxPace: Math.round(thresholdPace * z.factorMax),
  }));
}

function fmtPace(secPerKm) {
  if (!secPerKm) return "—";
  const m = Math.floor(secPerKm / 60), s = secPerKm % 60;
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
const DEMO_ATHLETES = [
  { id: 1, first_name: "Lucas", last_name: "Morel", sport: "Triathlon", color: "#00e5ff", age: 28, weight: 72, vo2max: 62, thresholdPace: 240 },
  { id: 2, first_name: "Sophie", last_name: "Arnaud", sport: "Course à pied", color: "#ff6b6b", age: 24, weight: 58, vo2max: 58, thresholdPace: 265 },
  { id: 3, first_name: "Thomas", last_name: "Blanc", sport: "Cyclisme", color: "#a8ff78", age: 32, weight: 78, vo2max: 68, thresholdPace: 228 },
  { id: 4, first_name: "Camille", last_name: "Roux", sport: "Trail", color: "#f7971e", age: 30, weight: 60, vo2max: 65, thresholdPace: 252 },
];
const COLORS = ["#00e5ff", "#ff6b6b", "#a8ff78", "#f7971e", "#bf91f3", "#43e97b"];

function genHooper(base, days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const rnd = (v, r) => Math.max(1, Math.min(10, v + Math.round((Math.random() - 0.5) * r)));
    return { date: d.toISOString().slice(0, 10), fatigue: rnd(base.fatigue, 3), stress: rnd(base.stress, 3), sleep: rnd(base.sleep, 2), doms: rnd(base.doms, 3), mood: rnd(base.mood, 2), hrv: Math.max(30, Math.min(100, base.hrv + Math.round((Math.random() - 0.5) * 8))) };
  });
}

const DEMO_HOOPER = {
  1: genHooper({ fatigue: 4, stress: 3, sleep: 6, doms: 3, mood: 7, hrv: 57 }),
  2: genHooper({ fatigue: 2, stress: 2, sleep: 8, doms: 1, mood: 9, hrv: 70 }),
  3: genHooper({ fatigue: 7, stress: 7, sleep: 4, doms: 7, mood: 3, hrv: 40 }),
  4: genHooper({ fatigue: 3, stress: 3, sleep: 7, doms: 3, mood: 8, hrv: 63 }),
};

function genSessions(sport, days = 28) {
  const byZone = { 1: ["Endurance Z1", "Récupération Z1", "Sortie longue Z1"], 2: ["Tempo Z2", "Allure seuil Z2", "Dénivelé Z2"], 3: ["Fractionné Z3", "VO2max Z3", "Côtes Z3"] };
  const sportTypes = { "Triathlon": ["Natation", "Vélo", "CAP", "Brique"], "Course à pied": ["CAP"], "Cyclisme": ["Vélo"], "Trail": ["Trail", "Dénivelé"] }[sport] || ["Course"];
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const zone = [1, 1, 1, 2, 2, 3][Math.floor(Math.random() * 6)];
    const prefix = sportTypes[Math.floor(Math.random() * sportTypes.length)];
    const suffix = byZone[zone][Math.floor(Math.random() * byZone[zone].length)].split(" ")[0] + " " + `Z${zone}`;
    const type = prefix + " " + suffix;
    const dur = zone === 1 ? 55 + Math.round(Math.random() * 65) : zone === 2 ? 40 + Math.round(Math.random() * 45) : 25 + Math.round(Math.random() * 30);
    const tss = Math.round(dur * (zone === 1 ? 0.55 : zone === 2 ? 0.92 : 1.3));
    const done = i < days - 1 && Math.random() > 0.12;
    const doneDur = done ? Math.round(dur * (0.85 + Math.random() * 0.3)) : null;
    return { date: d.toISOString().slice(0, 10), zone, planned: { type, duration: dur, tss }, done: done ? { type, duration: doneDur, tss: Math.round(tss * (doneDur / dur)) } : null, compliance: done ? Math.round((doneDur / dur) * 100) : i === days - 1 ? null : 0 };
  });
}

const DEMO_SESSIONS = { 1: genSessions("Triathlon"), 2: genSessions("Course à pied"), 3: genSessions("Cyclisme"), 4: genSessions("Trail") };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const hooperScore = e => e ? e.fatigue + e.stress + e.doms + (8 - e.sleep) : null;
const hooperStatus = s => s <= 12 ? { label: "Optimal", color: "#43e97b", icon: "✦" } : s <= 18 ? { label: "Attention", color: "#f7971e", icon: "◈" } : { label: "Surcharge", color: "#ff6b6b", icon: "⚠" };
const initials = a => (a.first_name?.[0] || "") + (a.last_name?.[0] || "") || "??";
const fullName = a => `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.username || "Athlète";

function calcFitness(sessions) {
  const done = sessions.filter(s => s.done).sort((a, b) => a.date.localeCompare(b.date));
  let ctl = 0, atl = 0;
  done.forEach(s => { ctl = ctl + (s.done.tss - ctl) / 42; atl = atl + (s.done.tss - atl) / 7; });
  return { ctl: Math.round(ctl), atl: Math.round(atl), tsb: Math.round(ctl - atl) };
}

function zoneDist(sessions) {
  const done = sessions.filter(s => s.done);
  const total = done.reduce((a, s) => a + s.done.duration, 0) || 1;
  return [1, 2, 3].map(z => { const mins = done.filter(s => s.zone === z).reduce((a, s) => a + s.done.duration, 0); return { zone: z, mins, pct: Math.round(mins / total * 100) }; });
}

// ─── MINI SPARKLINE ───────────────────────────────────────────────────────────
function Sparkline({ data, color, h = 26, w = 76 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${i / (data.length - 1) * w},${h - (v - min) / range * h}`).join(" ");
  const [lx, ly] = pts.split(" ").pop().split(",");
  return <svg width={w} height={h} style={{ overflow: "visible" }}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /><circle cx={lx} cy={ly} r="3" fill={color} /></svg>;
}

// ─── RADAR CHART ─────────────────────────────────────────────────────────────
function Radar({ data, color }) {
  const keys = ["fatigue", "stress", "sleep", "doms", "mood"], labels = ["Fatigue", "Stress", "Sommeil", "DOMS", "Humeur"];
  const cx = 72, cy = 72, r = 56, n = 5;
  const ang = i => Math.PI * 2 * i / n - Math.PI / 2;
  const pt = (val, i) => [cx + val / 10 * r * Math.cos(ang(i)), cy + val / 10 * r * Math.sin(ang(i))];
  return (
    <svg width={144} height={144} viewBox="0 0 144 144">
      {[2, 4, 6, 8, 10].map(l => <polygon key={l} points={keys.map((_, i) => pt(l, i).join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />)}
      {keys.map((_, i) => { const [x, y] = pt(10, i); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />; })}
      <polygon points={keys.map((k, i) => pt(data[k], i).join(",")).join(" ")} fill={color + "28"} stroke={color} strokeWidth="2" />
      {keys.map((k, i) => { const [x, y] = pt(data[k], i); return <circle key={i} cx={x} cy={y} r="3" fill={color} />; })}
      {labels.map((l, i) => { const [x, y] = pt(13, i); return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.38)" fontSize="8">{l}</text>; })}
    </svg>
  );
}

// ─── PACE ZONES PANEL ─────────────────────────────────────────────────────────
function PacePanel({ athlete, color }) {
  const [pace, setPace] = useState(athlete.thresholdPace || 270);
  const [edit, setEdit] = useState(false);
  const [m, setM] = useState(Math.floor(pace / 60));
  const [s2, setS2] = useState(pace % 60);
  const zones = calcPaceZones(pace);
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div><div style={{ color: "rgba(255,255,255,0.38)", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Zones d'allure · 3 zones pace</div>
          <div style={{ color: "white", fontSize: 13, fontWeight: 700 }}>Référence : allure seuil anaérobie</div></div>
        {edit ? (
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <input type="number" value={m} onChange={e => setM(+e.target.value)} style={{ width: 38, background: "rgba(255,255,255,0.07)", border: `1px solid ${color}44`, borderRadius: 6, padding: "4px 6px", color: "white", fontSize: 12, textAlign: "center" }} />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>:</span>
            <input type="number" value={s2} min="0" max="59" onChange={e => setS2(+e.target.value)} style={{ width: 38, background: "rgba(255,255,255,0.07)", border: `1px solid ${color}44`, borderRadius: 6, padding: "4px 6px", color: "white", fontSize: 12, textAlign: "center" }} />
            <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 10 }}>/km</span>
            <button onClick={() => { setPace(m * 60 + +s2); setEdit(false); }} style={{ background: color + "22", border: `1px solid ${color}44`, borderRadius: 6, padding: "4px 9px", color, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>OK</button>
          </div>
        ) : (
          <button onClick={() => { setM(Math.floor(pace / 60)); setS2(pace % 60); setEdit(true); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 11px", color: "rgba(255,255,255,0.45)", fontSize: 11, cursor: "pointer" }}>
            Seuil: {fmtPace(pace)} ✏️
          </button>
        )}
      </div>
      {zones.map(z => (
        <div key={z.id} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: z.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 600 }}>{z.name}</span>
              <span style={{ color: z.color, fontSize: 12, fontWeight: 700 }}>{fmtPace(z.minPace)} – {fmtPace(z.maxPace)}</span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
              <div style={{ height: "100%", width: `${z.id === 1 ? 65 : z.id === 2 ? 25 : 10}%`, background: z.color, borderRadius: 3 }} />
            </div>
            <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, marginTop: 2 }}>{z.desc} · RPE {z.rpe}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FITNESS PANEL ────────────────────────────────────────────────────────────
function FitnessPanel({ sessions, color }) {
  const { ctl, atl, tsb } = calcFitness(sessions);
  const dist = zoneDist(sessions);
  const tsbC = tsb > 5 ? "#43e97b" : tsb < -10 ? "#ff6b6b" : "#f7971e";
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>Fitness · Fatigue · Fraîcheur — 28 jours</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { l: "CTL", v: ctl, c: color, t: "Charge Training Load chronique (42j)" },
          { l: "ATL", v: atl, c: "#ff6b6b", t: "Acute Training Load — fatigue aiguë (7j)" },
          { l: "TSB", v: (tsb > 0 ? "+" : "") + tsb, c: tsbC, t: "Training Stress Balance = CTL - ATL" },
        ].map((k, i) => (
          <div key={i} title={k.t} style={{ background: `${k.c}0d`, border: `1px solid ${k.c}22`, borderRadius: 10, padding: "11px 8px", textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{k.l}</div>
            <div style={{ color: k.c, fontSize: 21, fontWeight: 800, lineHeight: 1 }}>{k.v}</div>
            <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 9, marginTop: 3 }}>{k.l === "TSB" ? (tsb > 5 ? "Frais" : tsb < -10 ? "Fatigué" : "Équilibré") : k.l === "CTL" ? "Forme long terme" : "Charge récente"}</div>
          </div>
        ))}
      </div>
      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Répartition par zone (28j)</div>
      <div style={{ display: "flex", gap: 3, height: 7, borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
        {dist.map(z => <div key={z.zone} style={{ flex: Math.max(z.pct, 1), background: PACE_ZONES_DEF[z.zone - 1].color }} />)}
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {dist.map(z => <span key={z.zone} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Z{z.zone} <span style={{ color: PACE_ZONES_DEF[z.zone - 1].color, fontWeight: 700 }}>{z.pct}%</span> <span style={{ color: "rgba(255,255,255,0.25)" }}>{z.mins}min</span></span>)}
      </div>
    </div>
  );
}

// ─── 4-WEEK PLAN PANEL ────────────────────────────────────────────────────────
function PlanPanel({ athlete, hoopers, sessions, color }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState("");
  const { ctl, atl, tsb } = calcFitness(sessions);
  const dist = zoneDist(sessions);
  const latest = hoopers[hoopers.length - 1];
  const hs = hooperScore(latest);

  async function generate() {
    setLoading(true); setStream(""); setPlan(null);
    const avgComp = sessions.filter(s => s.compliance > 0).reduce((a, b) => a + b.compliance, 0) / (sessions.filter(s => s.compliance > 0).length || 1);
    const prompt = `Expert planification entraînement endurance. Système 3 zones d'allure/pace :
Z1=endurance fondamentale (seuil x1.20–1.40), Z2=tempo/seuil (seuil x1.00–1.10), Z3=VO2max (seuil x0.88–0.97)

Athlète : ${fullName(athlete)}, ${athlete.sport}, ${athlete.age}ans, VO2max ~${athlete.vo2max}, seuil ~${fmtPace(athlete.thresholdPace||270)}
CTL=${ctl} | ATL=${atl} | TSB=${tsb} | Z1:${dist[0].pct}% Z2:${dist[1].pct}% Z3:${dist[2].pct}% | Conformité ~${Math.round(avgComp)}%
Hooper : ${hs ?? "?"}/32, HRV ${latest?.hrv ?? "?"}ms

Génère un plan 4 semaines (cycle mensuel) pour optimiser le fitness et réduire la fatigue. Tu décides le niveau optimal selon le profil.

Réponds UNIQUEMENT en JSON valide (aucun texte autour, aucun backtick) :
{"objectif":"...","cibleCTL":0,"cibleTSB":0,"semaines":[{"semaine":1,"theme":"...","volumeTotal":0,"repartitionZones":{"z1":0,"z2":0,"z3":0},"seances":[{"jour":"Lundi","type":"...","zone":1,"duree":0,"allure":"...","description":"..."}],"chargeEstimee":0,"conseil":"..."}],"risques":["..."],"signesAlerte":["..."]}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const raw = data.content?.map(b => b.text || "").join("").replace(/```json|```/g, "").trim() || "{}";
      let i = 0;
      const iv = setInterval(() => {
        i += 25; setStream(raw.slice(0, i));
        if (i >= raw.length) {
          clearInterval(iv);
          try { setPlan(JSON.parse(raw)); } catch { setPlan(null); }
          setLoading(false);
        }
      }, 12);
    } catch { setLoading(false); }
  }

  const wc = ["#00e5ff", "#a8ff78", "#f7971e", "#ff6b6b"];
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}20`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Plan IA · Cycle mensuel</div>
          <div style={{ color: "white", fontSize: 13, fontWeight: 700 }}>Prédiction 4 semaines optimisée</div>
        </div>
        <button onClick={generate} disabled={loading}
          style={{ background: loading ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg,${color},${color}88)`, border: "none", borderRadius: 10, padding: "8px 15px", color: loading ? "rgba(255,255,255,0.3)" : "#000", fontWeight: 800, fontSize: 12, cursor: loading ? "not-allowed" : "pointer", display: "flex", gap: 5, alignItems: "center" }}>
          {loading ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Génération...</> : "⚡ Générer"}
        </button>
      </div>

      {!plan && !loading && (
        <div style={{ textAlign: "center", padding: "28px 0", color: "rgba(255,255,255,0.22)", fontSize: 12 }}>Cliquez sur "Générer" pour obtenir<br />votre programme mensuel personnalisé par l'IA</div>
      )}

      {loading && !plan && (
        <div style={{ padding: "18px 0" }}>
          <div style={{ color: color, fontSize: 11, marginBottom: 6 }}>Calcul du plan optimal...</div>
          <div style={{ color: "rgba(255,255,255,0.18)", fontSize: 9, fontFamily: "monospace", maxHeight: 60, overflow: "hidden" }}>{stream.slice(-300)}</div>
        </div>
      )}

      {plan && (
        <div>
          <div style={{ background: `${color}0d`, border: `1px solid ${color}22`, borderRadius: 10, padding: "11px 14px", marginBottom: 12 }}>
            <div style={{ color, fontSize: 11, fontWeight: 700, marginBottom: 5 }}>🎯 {plan.objectif}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>CTL cible <span style={{ color, fontWeight: 700 }}>{plan.cibleCTL}</span> <span style={{ color: "rgba(255,255,255,0.28)" }}>(actuel {ctl})</span></span>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>TSB cible <span style={{ color: plan.cibleTSB >= 0 ? "#43e97b" : "#ff6b6b", fontWeight: 700 }}>{plan.cibleTSB >= 0 ? "+" : ""}{plan.cibleTSB}</span> <span style={{ color: "rgba(255,255,255,0.28)" }}>(actuel {tsb >= 0 ? "+" : ""}{tsb})</span></span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {(plan.semaines || []).map((sem, wi) => (
              <details key={wi} style={{ background: `${wc[wi % 4]}08`, border: `1px solid ${wc[wi % 4]}25`, borderRadius: 10, overflow: "hidden" }}>
                <summary style={{ padding: "10px 14px", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: wc[wi % 4] + "30", border: `1px solid ${wc[wi % 4]}55`, display: "flex", alignItems: "center", justifyContent: "center", color: wc[wi % 4], fontSize: 11, fontWeight: 800 }}>S{sem.semaine}</div>
                    <div>
                      <div style={{ color: "white", fontSize: 12, fontWeight: 700 }}>{sem.theme}</div>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>{sem.volumeTotal}min · TSS ~{sem.chargeEstimee}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["z1", "z2", "z3"].map((z, zi) => <span key={z} style={{ fontSize: 10, color: PACE_ZONES_DEF[zi].color, fontWeight: 700 }}>Z{zi + 1}:{sem.repartitionZones?.[z] || 0}%</span>)}
                  </div>
                </summary>
                <div style={{ padding: "0 14px 12px", borderTop: `1px solid ${wc[wi % 4]}12` }}>
                  {sem.conseil && <div style={{ color: wc[wi % 4], fontSize: 11, fontStyle: "italic", margin: "10px 0", paddingLeft: 8, borderLeft: `2px solid ${wc[wi % 4]}55` }}>💡 {sem.conseil}</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {(sem.seances || []).map((sq, si) => {
                      const zc = PACE_ZONES_DEF[(sq.zone || 1) - 1].color;
                      return (
                        <div key={si} style={{ display: "grid", gridTemplateColumns: "58px 14px 1fr auto", gap: 8, alignItems: "center", padding: "7px 10px", background: "rgba(255,255,255,0.025)", borderRadius: 7 }}>
                          <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 10 }}>{sq.jour}</span>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: zc }} />
                          <div>
                            <div style={{ color: "white", fontSize: 11, fontWeight: 600 }}>{sq.type}</div>
                            <div style={{ color: "rgba(255,255,255,0.32)", fontSize: 10 }}>{sq.description}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: zc, fontSize: 11, fontWeight: 700 }}>{sq.allure}</div>
                            <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10 }}>{sq.duree}min</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>
            ))}
          </div>

          {(plan.risques?.length > 0 || plan.signesAlerte?.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {plan.risques?.length > 0 && <div style={{ background: "#ff6b6b0a", border: "1px solid #ff6b6b22", borderRadius: 9, padding: "10px 12px" }}>
                <div style={{ color: "#ff6b6b", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>⚠ Risques</div>
                {plan.risques.map((r, i) => <div key={i} style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 3 }}>· {r}</div>)}
              </div>}
              {plan.signesAlerte?.length > 0 && <div style={{ background: "#f7971e0a", border: "1px solid #f7971e22", borderRadius: 9, padding: "10px 12px" }}>
                <div style={{ color: "#f7971e", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>👁 Signes d'alerte</div>
                {plan.signesAlerte.map((r, i) => <div key={i} style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 3 }}>· {r}</div>)}
              </div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AI ANALYSIS ──────────────────────────────────────────────────────────────
function AIPanel({ athlete, hoopers, sessions, onClose }) {
  const [text, setText] = useState(""), [done, setDone] = useState(false);
  const color = athlete.color || "#00e5ff";
  const latest = hoopers[hoopers.length - 1];
  const hs = hooperScore(latest);
  const { ctl, atl, tsb } = calcFitness(sessions);
  const dist = zoneDist(sessions);
  const avgComp = sessions.filter(s => s.compliance > 0).reduce((a, b) => a + b.compliance, 0) / (sessions.filter(s => s.compliance > 0).length || 1);

  useEffect(() => {
    let x = false;
    (async () => {
      setText(""); setDone(false);
      const p = `Expert sciences du sport. Zones d'allure : Z1=endurance fondamentale, Z2=tempo/seuil, Z3=VO2max.
Athlète : ${fullName(athlete)}, ${athlete.sport}, ${athlete.age}ans, seuil ~${fmtPace(athlete.thresholdPace||270)}
Hooper : ${hs}/32 (Fat:${latest?.fatigue} Str:${latest?.stress} Som:${latest?.sleep} DOM:${latest?.doms} Hum:${latest?.mood} HRV:${latest?.hrv}ms)
CTL=${ctl} ATL=${atl} TSB=${tsb} | Z1:${dist[0].pct}% Z2:${dist[1].pct}% Z3:${dist[2].pct}% | Conformité ~${Math.round(avgComp)}%

**1. ÉTAT DE FORME**
Interprète Hooper+HRV+CTL/ATL/TSB. Le ratio Z1/Z2/Z3 est-il optimal (polarisé idéal: ~75%/15%/10%)?

**2. ANALYSE DES SÉANCES**
Dérives charge réelle vs planifiée. Impact sur la progression.

**3. AJUSTEMENTS CETTE SEMAINE**
3 recommandations avec allures cibles précises en zones (ex: "45min Z1 à ${fmtPace((athlete.thresholdPace||270)*1.3)}, éviter Z3 cette semaine").`;
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: p }] }) });
        const data = await res.json();
        const full = data.content?.map(b => b.text || "").join("") || "";
        let i = 0;
        const iv = setInterval(() => { if (x) { clearInterval(iv); return; } i += 10; setText(full.slice(0, i)); if (i >= full.length) { clearInterval(iv); setText(full); setDone(true); } }, 14);
      } catch { if (!x) { setText("Erreur API."); setDone(true); } }
    })();
    return () => { x = true; };
  }, [athlete.id]);

  const renderText = t => t.split("\n").map((l, i) => {
    const b = l.match(/^\*\*(.+)\*\*$/);
    if (b) return <div key={i} style={{ color, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginTop: 16, marginBottom: 5 }}>{b[1]}</div>;
    if (l.startsWith("- ") || l.match(/^\d+\./)) return <div key={i} style={{ paddingLeft: 12, borderLeft: `2px solid ${color}44`, marginBottom: 5, color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.65 }}>{l.replace(/^[-\d.] ?/, "")}</div>;
    return <div key={i} style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.65, marginBottom: 2 }}>{l}</div>;
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0d1117", border: `1px solid ${color}33`, borderRadius: 20, width: "100%", maxWidth: 640, maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 22px 13px", borderBottom: `1px solid ${color}22`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>Analyse IA · Zones allure</div><div style={{ color: "white", fontSize: 16, fontWeight: 800 }}>{fullName(athlete)}</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.55)", width: 32, height: 32, borderRadius: 8, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
          {!text && <div style={{ color, fontSize: 12, display: "flex", gap: 7 }}><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Analyse en cours...</div>}
          {text && <div style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{renderText(text)}{!done && <span style={{ color, animation: "blink 1s infinite" }}>▌</span>}</div>}
        </div>
        {done && <div style={{ padding: "11px 22px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}><button onClick={onClose} style={{ background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 9, padding: "7px 18px", color, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Fermer</button></div>}
      </div>
    </div>
  );
}

// ─── HOOPER FORM ──────────────────────────────────────────────────────────────
function HooperForm({ athlete, onSave, onClose }) {
  const color = athlete.color || "#00e5ff";
  const [v, setV] = useState({ fatigue: 5, stress: 5, sleep: 7, doms: 3, mood: 7, hrv: "" });
  const hs = v.fatigue + v.stress + v.doms + (8 - v.sleep);
  const st = hooperStatus(hs);
  const fields = [["fatigue","Fatigue","🔋","1=reposé · 10=épuisé"],["stress","Stress","🧠","1=zen · 10=stressé"],["sleep","Sommeil","🌙","1=mauvais · 10=excellent"],["doms","Douleurs (DOMS)","💪","1=aucune · 10=intenses"],["mood","Humeur","⚡","1=déprimé · 10=motivé"]];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0d1117", border: `1px solid ${color}44`, borderRadius: 20, width: "100%", maxWidth: 460, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px 13px", borderBottom: `1px solid ${color}22`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>Questionnaire du jour</div><div style={{ color: "white", fontSize: 15, fontWeight: 800 }}>Hooper — {fullName(athlete)}</div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.55)", width: 32, height: 32, borderRadius: 8, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "16px 22px" }}>
          {fields.map(([k, l, e, tip]) => (
            <div key={k} style={{ marginBottom: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: 600 }}>{e} {l}</span>
                <span style={{ color, fontSize: 14, fontWeight: 800 }}>{v[k]}</span>
              </div>
              <input type="range" min="1" max="10" value={v[k]} onChange={e2 => setV(p => ({ ...p, [k]: +e2.target.value }))} style={{ width: "100%", accentColor: color }} />
              <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 9, marginTop: 1 }}>{tip}</div>
            </div>
          ))}
          <div style={{ marginBottom: 13 }}>
            <div style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: 600, marginBottom: 5 }}>❤️ HRV <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, fontSize: 11 }}>(optionnel, ms)</span></div>
            <input type="number" placeholder="ex: 65" value={v.hrv} onChange={e => setV(p => ({ ...p, hrv: e.target.value }))} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}33`, borderRadius: 9, padding: "8px 13px", color: "white", fontSize: 13, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ background: `${st.color}12`, border: `1px solid ${st.color}33`, borderRadius: 11, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>Score Hooper</span>
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}><span style={{ color: st.color, fontSize: 24, fontWeight: 800 }}>{hs}</span><span style={{ color: st.color, fontSize: 11, fontWeight: 700 }}>{st.icon} {st.label}</span></div>
          </div>
          <button onClick={() => { onSave({ ...v, date: new Date().toISOString().slice(0, 10), hrv: v.hrv ? +v.hrv : 60 }); onClose(); }}
            style={{ width: "100%", background: `linear-gradient(135deg,${color},${color}88)`, border: "none", borderRadius: 11, padding: "11px", color: "#000", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ATHLETE CARD ─────────────────────────────────────────────────────────────
function AthleteCard({ athlete, selected, onClick, onHooper }) {
  const color = athlete.color || "#00e5ff";
  const hoopers = athlete._hoopers || [], latest = hoopers[hoopers.length - 1];
  const hs = hooperScore(latest), st = hs !== null ? hooperStatus(hs) : null;
  const { ctl, tsb } = calcFitness(athlete._sessions || []);
  const tsbC = tsb > 5 ? "#43e97b" : tsb < -10 ? "#ff6b6b" : "#f7971e";
  return (
    <div onClick={onClick} style={{ background: selected ? `linear-gradient(135deg,${color}12,${color}06)` : "#161b22", border: `1px solid ${selected ? color + "55" : "rgba(255,255,255,0.07)"}`, borderRadius: 15, padding: "14px 16px", cursor: "pointer", transition: "all 0.18s", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 50, height: 50, background: `radial-gradient(circle,${color}10,transparent)`, pointerEvents: "none" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9 }}>
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg,${color}44,${color}18)`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", color, fontWeight: 800, fontSize: 11 }}>{initials(athlete).toUpperCase()}</div>
          <div><div style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{fullName(athlete)}</div><div style={{ color: "rgba(255,255,255,0.33)", fontSize: 10 }}>{athlete.sport}</div></div>
        </div>
        {st && <div style={{ background: st.color + "1a", border: `1px solid ${st.color}44`, borderRadius: 20, padding: "2px 8px", display: "flex", gap: 3, alignItems: "center" }}><span style={{ fontSize: 8 }}>{st.icon}</span><span style={{ color: st.color, fontSize: 9, fontWeight: 700 }}>{st.label}</span></div>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          {hs !== null && <div><div style={{ color: "rgba(255,255,255,0.28)", fontSize: 9 }}>Hooper</div><div style={{ color, fontSize: 21, fontWeight: 800, lineHeight: 1 }}>{hs}</div></div>}
          <div><div style={{ color: "rgba(255,255,255,0.28)", fontSize: 9 }}>CTL</div><div style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, fontWeight: 700 }}>{ctl}</div></div>
          <div><div style={{ color: "rgba(255,255,255,0.28)", fontSize: 9 }}>TSB</div><div style={{ color: tsbC, fontSize: 15, fontWeight: 700 }}>{tsb > 0 ? "+" : ""}{tsb}</div></div>
        </div>
        <button onClick={e => { e.stopPropagation(); onHooper(athlete); }} style={{ background: color + "15", border: `1px solid ${color}44`, borderRadius: 7, padding: "3px 9px", color, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>+ Hooper</button>
      </div>
    </div>
  );
}

// ─── ATHLETE DETAIL ───────────────────────────────────────────────────────────
function AthleteDetail({ athlete, onAnalyze }) {
  const [tab, setTab] = useState("aperçu");
  const color = athlete.color || "#00e5ff";
  const hoopers = athlete._hoopers || [], sessions = athlete._sessions || [];
  const latest = hoopers[hoopers.length - 1];
  const hs = latest ? hooperScore(latest) : null;
  const tabs = ["aperçu", "hooper", "séances", "zones", "plan 4 sem."];
  const { ctl, atl, tsb } = calcFitness(sessions);
  const dist = zoneDist(sessions);
  const tsbC = tsb > 5 ? "#43e97b" : tsb < -10 ? "#ff6b6b" : "#f7971e";
  const avgComp = sessions.filter(s => s.compliance > 0).reduce((a, b) => a + b.compliance, 0) / (sessions.filter(s => s.compliance > 0).length || 1);

  return (
    <div style={{ background: "#0a0e14", border: `1px solid ${color}18`, borderRadius: 20, overflow: "hidden" }}>
      <div style={{ padding: "18px 22px 0", background: `linear-gradient(135deg,${color}0e,transparent)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg,${color}55,${color}18)`, border: `2px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", color, fontWeight: 800, fontSize: 15 }}>{initials(athlete).toUpperCase()}</div>
            <div>
              <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>{fullName(athlete)}</div>
              <div style={{ color, fontSize: 11, opacity: 0.78 }}>{[athlete.sport, athlete.age && `${athlete.age}ans`, athlete.weight && `${athlete.weight}kg`, athlete.thresholdPace && `Seuil ${fmtPace(athlete.thresholdPace)}`].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
          <button onClick={onAnalyze} style={{ background: `linear-gradient(135deg,${color},${color}88)`, border: "none", borderRadius: 11, padding: "9px 17px", color: "#000", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>⚡ Analyse IA</button>
        </div>
        <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 1 }}>
          {tabs.map(t => <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? color + "1e" : "transparent", border: tab === t ? `1px solid ${color}44` : "1px solid transparent", borderBottom: "none", borderRadius: "8px 8px 0 0", padding: "6px 13px", color: tab === t ? color : "rgba(255,255,255,0.33)", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{t}</button>)}
        </div>
      </div>

      <div style={{ padding: "18px 22px", borderTop: `1px solid ${color}18` }}>

        {tab === "aperçu" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7, marginBottom: 16 }}>
              {[
                { l: "Hooper", v: hs ?? "—", c: hs ? hooperStatus(hs).color : "#fff" },
                { l: "HRV", v: latest?.hrv ? latest.hrv + "ms" : "—", c: color },
                { l: "CTL", v: ctl, c: color },
                { l: "ATL", v: atl, c: "#ff6b6b" },
                { l: "TSB", v: (tsb >= 0 ? "+" : "") + tsb, c: tsbC },
              ].map((k, i) => <div key={i} style={{ background: `${k.c}0d`, border: `1px solid ${k.c}22`, borderRadius: 9, padding: "10px 6px", textAlign: "center" }}>
                <div style={{ color: "rgba(255,255,255,0.33)", fontSize: 8, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{k.l}</div>
                <div style={{ color: k.c, fontSize: 17, fontWeight: 800 }}>{k.v}</div>
              </div>)}
            </div>
            {latest && (
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center", marginBottom: 14 }}>
                <div><div style={{ color: "rgba(255,255,255,0.28)", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5, textAlign: "center" }}>Profil du jour</div><Radar data={latest} color={color} /></div>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", marginBottom: 9 }}>Tendance Hooper (7j)</div>
                  {hoopers.slice(-7).map((h, i) => { const s = hooperScore(h); const sc = hooperStatus(s).color; return <div key={i} style={{ marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>{h.date.slice(5)}</span><span style={{ color: sc, fontSize: 10, fontWeight: 700 }}>{s}</span></div><div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}><div style={{ height: "100%", width: s / 32 * 100 + "%", background: sc, borderRadius: 3 }} /></div></div>; })}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 3, height: 6, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
              {dist.map(z => <div key={z.zone} style={{ flex: Math.max(z.pct, 1), background: PACE_ZONES_DEF[z.zone - 1].color }} />)}
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
              {dist.map(z => <span key={z.zone} style={{ fontSize: 10, color: "rgba(255,255,255,0.38)" }}>Z{z.zone} <span style={{ color: PACE_ZONES_DEF[z.zone - 1].color, fontWeight: 700 }}>{z.pct}%</span> <span style={{ color: "rgba(255,255,255,0.22)" }}>{z.mins}min</span></span>)}
              <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, marginLeft: "auto" }}>Conformité moy. <span style={{ color, fontWeight: 700 }}>{Math.round(avgComp)}%</span></span>
            </div>
          </div>
        )}

        {tab === "hooper" && (
          hoopers.length === 0
            ? <div style={{ textAlign: "center", color: "rgba(255,255,255,0.28)", padding: "38px 0", fontSize: 13 }}>Aucune donnée Hooper</div>
            : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                {hoopers.slice(-6).map((h, i) => { const s = hooperScore(h); const sc = hooperStatus(s).color; return <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${sc}22`, borderRadius: 11, padding: "12px" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span style={{ color: "rgba(255,255,255,0.38)", fontSize: 10 }}>{h.date}</span><span style={{ color: sc, fontWeight: 800, fontSize: 15 }}>{s}</span></div>{["fatigue","stress","sleep","doms","mood"].map(k => <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ color: "rgba(255,255,255,0.33)", fontSize: 9, textTransform: "capitalize", width: 50 }}>{k}</span><div style={{ display: "flex", gap: 2 }}>{Array.from({length:10},(_,j)=><div key={j} style={{width:5,height:5,borderRadius:1.5,background:j<h[k]?color:"rgba(255,255,255,0.07)"}}/>)}</div><span style={{color,fontSize:9,fontWeight:700,width:14,textAlign:"right"}}>{h[k]}</span></div>)}{h.hrv&&<div style={{marginTop:6,paddingTop:6,borderTop:"1px solid rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.28)",fontSize:9}}>HRV <span style={{color}}>{h.hrv}ms</span></div>}</div>; })}
              </div>
        )}

        {tab === "séances" && (
          sessions.length === 0
            ? <div style={{ textAlign: "center", color: "rgba(255,255,255,0.28)", padding: "38px 0", fontSize: 13 }}>Aucune séance</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sessions.slice(-10).map((s, i) => {
                  const cc = s.compliance === null ? "rgba(255,255,255,0.22)" : s.compliance === 0 ? "#ff6b6b" : s.compliance > 110 ? "#f7971e" : "#43e97b";
                  const zc = PACE_ZONES_DEF[(s.zone || 1) - 1].color;
                  return <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9, padding: "9px 12px", display: "grid", gridTemplateColumns: "55px 10px 1fr 1fr 62px", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.33)", fontSize: 10 }}>{s.date.slice(5)}</span>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: zc }} title={`Z${s.zone}`} />
                    <div><div style={{ color: "rgba(255,255,255,0.25)", fontSize: 8, textTransform: "uppercase", letterSpacing: 1 }}>Prévu</div><div style={{ color: "white", fontSize: 11, fontWeight: 600 }}>{s.planned.type}</div><div style={{ color: "rgba(255,255,255,0.32)", fontSize: 9 }}>{s.planned.duration}min · TSS {s.planned.tss}</div></div>
                    <div><div style={{ color: "rgba(255,255,255,0.25)", fontSize: 8, textTransform: "uppercase", letterSpacing: 1 }}>Réalisé</div>{s.done?<><div style={{color:"white",fontSize:11,fontWeight:600}}>{s.done.type}</div><div style={{color:"rgba(255,255,255,0.32)",fontSize:9}}>{s.done.duration}min · TSS {s.done.tss}</div></>:s.compliance===null?<div style={{color:"rgba(255,255,255,0.22)",fontSize:10}}>À venir</div>:<div style={{color:"#ff6b6b",fontSize:10}}>Non réalisé</div>}</div>
                    {s.compliance !== null && <div style={{ background: cc + "1a", border: `1px solid ${cc}44`, borderRadius: 6, padding: "3px 7px", color: cc, fontSize: 10, fontWeight: 700, textAlign: "center" }}>{s.compliance === 0 ? "✗" : s.compliance + "%"}</div>}
                  </div>;
                })}
              </div>
        )}

        {tab === "zones" && <PacePanel athlete={athlete} color={color} />}
        {tab === "plan 4 sem." && <PlanPanel athlete={athlete} hoopers={hoopers} sessions={sessions} color={color} />}
      </div>
    </div>
  );
}

// ─── SETUP ────────────────────────────────────────────────────────────────────
function Setup({ onDemo, onConnect, config, setConfig }) {
  const [showKeys, setShowKeys] = useState(false);
  const ok = config.clientId && config.clientSecret;
  return (
    <div style={{ minHeight: "100vh", background: "#060810", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 490 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#00e5ff18", border: "1px solid #00e5ff33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚡</div>
            <div><div style={{ color: "white", fontSize: 20, fontWeight: 800 }}>Coach Performance Hub</div><div style={{ color: "#00e5ff", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>Nolio · Zones d'allure · IA · 4 semaines</div></div>
          </div>
        </div>
        <div onClick={onDemo} style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "17px 20px", marginBottom: 9, cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#00e5ff44"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}>
          <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "#00e5ff10", border: "1px solid #00e5ff28", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎯</div>
            <div style={{ flex: 1 }}><div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Mode démo — accès immédiat</div><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>4 athlètes fictifs, toutes les fonctionnalités actives</div></div>
            <span style={{ color: "#00e5ff" }}>→</span>
          </div>
        </div>
        <div style={{ background: "#161b22", border: `1px solid ${ok ? "#00e5ff55" : "rgba(255,255,255,0.08)"}`, borderRadius: 13, padding: "17px 20px" }}>
          <div style={{ display: "flex", gap: 11, alignItems: "center", cursor: "pointer" }} onClick={() => setShowKeys(v => !v)}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "#a8ff7810", border: "1px solid #a8ff7828", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔗</div>
            <div style={{ flex: 1 }}><div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Connexion Nolio réelle</div><div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{ok ? "✓ Clés configurées — prêt" : "Entrez vos clés développeur"}</div></div>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{showKeys ? "▲" : "▼"}</span>
          </div>
          {showKeys && (
            <div style={{ marginTop: 16 }}>
              {[["clientId", "Client ID", "text", "my_client_identifier"], ["clientSecret", "Client Secret", "password", "••••••••"]].map(([k, l, t, ph]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <label style={{ color: "rgba(255,255,255,0.42)", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{l}</label>
                  <input type={t} value={config[k]} onChange={e => setConfig(c => ({ ...c, [k]: e.target.value }))} placeholder={ph}
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 12, boxSizing: "border-box", fontFamily: "monospace" }} />
                </div>
              ))}
              <button onClick={onConnect} disabled={!ok} style={{ width: "100%", background: ok ? "linear-gradient(135deg,#a8ff78,#43e97b)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 9, padding: "11px", color: ok ? "#000" : "rgba(255,255,255,0.22)", fontWeight: 800, fontSize: 13, cursor: ok ? "pointer" : "not-allowed", marginBottom: 9 }}>
                Se connecter avec Nolio (OAuth2) →
              </button>
              <div style={{ padding: "9px 12px", background: "rgba(255,165,0,0.06)", border: "1px solid rgba(255,165,0,0.16)", borderRadius: 8 }}>
                <span style={{ color: "rgba(255,200,0,0.72)", fontSize: 11 }}>Pas encore de clés ? → <a href="https://www.nolio.io/api/register/" target="_blank" style={{ color: "#f7971e" }}>nolio.io/api/register/</a></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("setup");
  const [demoMode, setDemoMode] = useState(false);
  const [loadMsg, setLoadMsg] = useState("Connexion à Nolio...");
  const [config, setConfig] = useState({ clientId: "", clientSecret: "" });
  const [athletes, setAthletes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hooperTarget, setHooperTarget] = useState(null);
  const [analyzeTarget, setAnalyzeTarget] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const savedId = localStorage.getItem("nolio_client_id");
    const savedSecret = localStorage.getItem("nolio_client_secret");
    if (code && savedId && savedSecret) {
      window.history.replaceState({}, "", "/");
      setScreen("loading"); setLoadMsg("Authentification Nolio...");
      const creds = btoa(savedId + ":" + savedSecret);
      const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: NOLIO_CONFIG.REDIRECT_URI });
      fetch(NOLIO_CONFIG.TOKEN_URL, { method: "POST", headers: { Authorization: "Basic " + creds, "Content-Type": "application/x-www-form-urlencoded" }, body })
        .then(r => r.json())
        .then(data => { if (data.access_token) { localStorage.setItem("nolio_token", data.access_token); if (data.refresh_token) localStorage.setItem("nolio_refresh", data.refresh_token); loadNolioData(data.access_token); } else { setScreen("setup"); } })
        .catch(() => setScreen("setup"));
      return;
    }
    const savedToken = localStorage.getItem("nolio_token");
    if (savedToken) { setScreen("loading"); loadNolioData(savedToken); }
  }, []);

  async function loadNolioData(token) {
    setScreen("loading"); setLoadMsg("Récupération de vos athlètes...");
    const headers = { Authorization: "Bearer " + token, Accept: "application/json" };
    try {
      const ar = await fetch(NOLIO_CONFIG.API_BASE + "/get/athletes/", { headers });
      if (ar.status === 401) { localStorage.removeItem("nolio_token"); setScreen("setup"); return; }
      const ad = await ar.json();
      const list = Array.isArray(ad) ? ad : (ad.results || ad.athletes || []);
      setLoadMsg("Chargement des données (" + list.length + " athlètes)...");
      const today = new Date();
      const after = new Date(today); after.setDate(today.getDate() - 28);
      const afterStr = after.toISOString().slice(0, 10);
      const beforeStr = today.toISOString().slice(0, 10);
      const enriched = await Promise.all(list.map(async (a, idx) => {
        const color = COLORS[idx % COLORS.length];
        try {
          const [wr, pr, mr] = await Promise.allSettled([
            fetch(NOLIO_CONFIG.API_BASE + "/get/training/?athlete=" + a.id + "&after=" + afterStr + "&before=" + beforeStr, { headers }),
            fetch(NOLIO_CONFIG.API_BASE + "/get/planned/training/?athlete=" + a.id + "&after=" + afterStr + "&before=" + beforeStr, { headers }),
            fetch(NOLIO_CONFIG.API_BASE + "/get/metric/?athlete=" + a.id, { headers }),
          ]);
          const doneList = wr.status === "fulfilled" ? await wr.value.json().then(d => Array.isArray(d) ? d : d.results || []).catch(() => []) : [];
          const planList = pr.status === "fulfilled" ? await pr.value.json().then(d => Array.isArray(d) ? d : d.results || []).catch(() => []) : [];
          const metList  = mr.status === "fulfilled" ? await mr.value.json().then(d => Array.isArray(d) ? d : d.results || []).catch(() => []) : [];
          const map = {};
          planList.forEach(p => { const d = (p.date || p.scheduled_date || "").slice(0, 10); const zone = (p.name||"").includes("Z3") ? 3 : (p.name||"").includes("Z2") ? 2 : 1; if (d) map[d] = { date:d, zone, planned:{ type:p.name||"Séance", duration:Math.round((p.duration_planned||0)/60), tss:p.tss_planned||0 }, done:null, compliance:null }; });
          doneList.forEach(w => { const d = (w.date||w.start_date||"").slice(0,10); const dur = Math.round((w.duration||w.elapsed_time||0)/60); const zone = (w.name||"").includes("Z3") ? 3 : (w.name||"").includes("Z2") ? 2 : 1; if (!d) return; if (map[d]) { map[d].done = {type:w.name||"Séance",duration:dur,tss:w.tss||0}; map[d].compliance = map[d].planned.duration > 0 ? Math.round(dur/map[d].planned.duration*100) : 100; } else map[d] = {date:d,zone,planned:{type:w.name||"Séance",duration:dur,tss:w.tss||0},done:{type:w.name||"Séance",duration:dur,tss:w.tss||0},compliance:100}; });
          const sessions = Object.values(map).sort((a,b) => a.date.localeCompare(b.date));
          const hoopers = metList.filter(m => m.fatigue!==undefined||m.hooper_index!==undefined).map(m => ({date:(m.date||"").slice(0,10),fatigue:m.fatigue||5,stress:m.stress||5,sleep:m.sleep_quality||m.sleep||7,doms:m.muscle_soreness||m.doms||3,mood:m.mood||7,hrv:m.hrv||null})).filter(h=>h.date).sort((a,b)=>a.date.localeCompare(b.date));
          return { ...a, color, _hoopers: hoopers, _sessions: sessions };
        } catch { return { ...a, color, _hoopers: [], _sessions: [] }; }
      }));
      setAthletes(enriched); setSelected(enriched[0]||null); setScreen("app");
    } catch { localStorage.removeItem("nolio_token"); setScreen("setup"); }
  }

  function startDemo() { setDemoMode(true); const enriched = DEMO_ATHLETES.map(a => ({ ...a, _hoopers: DEMO_HOOPER[a.id], _sessions: DEMO_SESSIONS[a.id] })); setAthletes(enriched); setSelected(enriched[0]); setScreen("app"); }

  function connectNolio() { localStorage.setItem("nolio_client_id", config.clientId); localStorage.setItem("nolio_client_secret", config.clientSecret); const params = new URLSearchParams({ response_type: "code", client_id: config.clientId, redirect_uri: NOLIO_CONFIG.REDIRECT_URI }); window.location.href = NOLIO_CONFIG.AUTH_URL + "?" + params; }

  function disconnect() { ["nolio_token","nolio_refresh","nolio_client_id","nolio_client_secret"].forEach(k => localStorage.removeItem(k)); setAthletes([]); setSelected(null); setDemoMode(false); setScreen("setup"); }

  function saveHooper(athlete, vals) { const update = list => [...list.filter(h => h.date !== vals.date), vals].sort((a,b) => a.date.localeCompare(b.date)); setAthletes(prev => prev.map(a => a.id === athlete.id ? { ...a, _hoopers: update(a._hoopers||[]) } : a)); if (selected?.id === athlete.id) setSelected(a => ({ ...a, _hoopers: update(a._hoopers||[]) })); }

  const CSS = `*{box-sizing:border-box} @keyframes spin{to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0}} input[type=range]{cursor:pointer} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.11);border-radius:4px} details>summary::-webkit-details-marker{display:none}`;

  if (screen === "setup") return <><style>{CSS}</style><Setup onDemo={startDemo} onConnect={connectNolio} config={config} setConfig={setConfig} /></>;

  if (screen === "loading") return (
    <div style={{ minHeight:"100vh", background:"#060810", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:44, height:44, border:"3px solid #00e5ff22", borderTop:"3px solid #00e5ff", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
      <div style={{ color:"rgba(255,255,255,0.45)", fontSize:13 }}>{loadMsg}</div>
    </div>
  );

  const today = new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" });

  return (
    <div style={{ minHeight:"100vh", background:"#060810", fontFamily:"'DM Sans','Segoe UI',sans-serif", color:"white", padding:18 }}>
      <style>{CSS}</style>
      <div style={{ maxWidth:1200, margin:"0 auto 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:3, color:"rgba(255,255,255,0.22)", textTransform:"uppercase", marginBottom:2 }}>Coach Performance Hub</div>
            <h1 style={{ margin:0, fontSize:21, fontWeight:800, background:"linear-gradient(135deg,white,rgba(255,255,255,0.5))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Zones d'allure · CTL/ATL/TSB · Plan 4 semaines IA</h1>
          </div>
          <div style={{ display:"flex", gap:7, alignItems:"center" }}>
            {demoMode && <div style={{ background:"#f7971e12", border:"1px solid #f7971e38", borderRadius:7, padding:"3px 9px", fontSize:9, color:"#f7971e", fontWeight:600 }}>🎯 Démo</div>}
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:7, padding:"3px 9px", fontSize:9, color:"rgba(255,255,255,0.32)" }}>📅 {today}</div>
            <div style={{ background:"#00e5ff12", border:"1px solid #00e5ff28", borderRadius:7, padding:"3px 9px", fontSize:9, color:"#00e5ff", display:"flex", gap:4, alignItems:"center" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#00e5ff", animation:"blink 2s infinite" }} />{athletes.length} athlètes
            </div>
            <button onClick={disconnect} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:7, padding:"3px 9px", color:"rgba(255,255,255,0.35)", fontSize:9, cursor:"pointer" }}>Déconnexion</button>
          </div>
        </div>
      </div>
      <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"300px 1fr", gap:14, alignItems:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ color:"rgba(255,255,255,0.25)", fontSize:8, letterSpacing:2, textTransform:"uppercase", paddingLeft:3, marginBottom:1 }}>Athlètes · Hooper · CTL · TSB</div>
          {athletes.map(a => <AthleteCard key={a.id} athlete={a} selected={selected?.id===a.id} onClick={() => setSelected(a)} onHooper={setHooperTarget} />)}
        </div>
        <div>{selected ? <AthleteDetail athlete={selected} onAnalyze={() => setAnalyzeTarget(selected)} /> : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:280, color:"rgba(255,255,255,0.18)", fontSize:13 }}>Sélectionnez un athlète</div>}</div>
      </div>
      {hooperTarget && <HooperForm athlete={hooperTarget} onClose={() => setHooperTarget(null)} onSave={v => saveHooper(hooperTarget, v)} />}
      {analyzeTarget && <AIPanel athlete={analyzeTarget} hoopers={analyzeTarget._hoopers} sessions={analyzeTarget._sessions} onClose={() => setAnalyzeTarget(null)} />}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ================= CONFIG =================
const PEOPLE = [
  "Adriano","Ander","Borda","Chico","Daniel","Diogo","Dru","Eric Aquiar",
  "Fear","Felype","Flausino","Giordano","Kazuhiro","Marcos","Mello","Paulo",
  "Pelicano","Pepeu","Prince","Red","Reinaldo","Rod. Rosa","Samuel",
  "Smile","Tibor","Uekawa","Valbert","Victor"
].sort((a,b)=>a.localeCompare(b));

const EMOJIS = ["❤️","🤥","🤮","🐍","👜","💔","🍪","🪴","🎯","🍌","💣"];
const MIN_VOTERS_TO_SHOW = 5;
// =========================================

export default function App() {
  const [step, setStep] = useState("home");
  const [prevStep, setPrevStep] = useState("home");
  const [currentUser, setCurrentUser] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState({});
  const [votes, setVotes] = useState({});
  const [yesterdayVotes, setYesterdayVotes] = useState({});
  const [voteCount, setVoteCount] = useState(0);
  const [todayFormatted, setTodayFormatted] = useState("");
  const [yesterdayFormatted, setYesterdayFormatted] = useState("");

  // 🇧🇷 Datas BR
  const todayBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const yesterdayBR = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  useEffect(() => {
    const now = new Date();
    setTodayFormatted(now.toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric", timeZone:"America/Sao_Paulo" }));
    const y = new Date(Date.now() - 86400000);
    setYesterdayFormatted(y.toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric", timeZone:"America/Sao_Paulo" }));
    fetchVotes();
    fetchYesterdayVotes();
  }, []);

  // ================= SUPABASE =================

  async function fetchVotes() {
    const { data } = await supabase.from("votes").select("*").eq("day", todayBR);
    if (!data) return;

    const map = {};
    data.forEach(v => {
      if (!map[v.target]) map[v.target] = {};
      if (!map[v.target][v.emoji]) map[v.target][v.emoji] = 0;
      map[v.target][v.emoji]++;
    });

    setVotes(map);
    const voters = [...new Set(data.map(d => d.voter))];
    setVoteCount(voters.length);
  }

  async function fetchYesterdayVotes() {
    const { data } = await supabase.from("votes").select("*").eq("day", yesterdayBR);
    if (!data) return;

    const map = {};
    data.forEach(v => {
      if (!map[v.target]) map[v.target] = {};
      if (!map[v.target][v.emoji]) map[v.target][v.emoji] = 0;
      map[v.target][v.emoji]++;
    });
    setYesterdayVotes(map);
  }

  async function checkUser(name) {
    const { data } = await supabase.from("users").select("*").eq("name", name).single();
    return data;
  }

  async function createUser(name, pass) {
    await supabase.from("users").insert([{ name, password: pass }]);
  }

  async function verifyVoteToday(name) {
    const { data } = await supabase.from("votes").select("id").eq("voter", name).eq("day", todayBR).limit(1);
    return data && data.length > 0;
  }

  async function submitVote() {
    if (Object.keys(selected).length !== PEOPLE.length - 1) {
      return alert("Você precisa votar em TODOS.");
    }

    if (!window.confirm("Tem certeza? Depois de enviar, NÃO poderá editar hoje.")) return;

    const arr = Object.entries(selected).map(([target, emoji]) => ({
      voter: currentUser,
      target,
      emoji,
      day: todayBR
    }));

    await supabase.from("votes").insert(arr);
    await fetchVotes();
    setStep("results");
  }

  // ================= UI HELPERS =================

  function goStep(s) {
    setPrevStep(step);
    setStep(s);
  }

  function goBack() {
    if (step === "vote" && Object.keys(selected).length > 0) {
      if (!window.confirm("Se voltar, você perderá os votos selecionados. Continuar?")) return;
    }
    setStep(prevStep || "home");
  }

  function ProgressBar({ value, max }) {
    const percent = Math.min(100, Math.round((value / max) * 100));
    return (
      <div style={{ width:"100%", background:"#222", borderRadius:12, margin:"10px 0" }}>
        <div style={{ width: percent+"%", background:"linear-gradient(90deg,#22c55e,#16a34a)", padding:6, borderRadius:12, textAlign:"center", fontWeight:"bold", color:"#000" }}>
          {percent}%
        </div>
      </div>
    );
  }

  // ================= HOME =================

  if (step === "home") return (
    <div style={styles.container}>
      <h1 style={styles.title}>Queridômetro da Panela</h1>
      <p style={styles.date}>📅 {todayFormatted}</p>

      <button style={styles.mainBtn} onClick={()=>goStep("login")}>Responder</button>
      <button style={styles.mainBtnOutline} onClick={()=>goStep("results")}>Resultados</button>
      <button style={styles.mainBtnOutline} onClick={()=>goStep("history")}>Resultados (anterior)</button>
    </div>
  );

  // ================= LOGIN =================

  if (step === "login") return (
    <div style={styles.container}>
      <h2>Identificação</h2>
      <p style={styles.date}>📅 {todayFormatted}</p>

      <select style={styles.select} value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>

      <input style={styles.input} type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} />

      <button style={styles.mainBtn} onClick={async ()=>{
        const user = await checkUser(currentUser);
        if (!user) return goStep("register");
        if (user.password !== password) return alert("Senha incorreta");
        const voted = await verifyVoteToday(currentUser);
        if (voted) return alert("Você já votou hoje!");
        goStep("vote");
      }}>Entrar</button>

      {/* 🔐 ESQUECI SENHA COM MESMA IDENTIDADE */}
      <button style={styles.mainBtnOutline} onClick={()=>goStep("forgot")}>
        Esqueci minha senha
      </button>

      <button style={styles.backBtn} onClick={goBack}>⬅ Voltar</button>
    </div>
  );

  // ================= REGISTER =================

  if (step === "register") return (
    <div style={styles.container}>
      <h2>Criar senha</h2>
      <p>Primeiro acesso de <b>{currentUser}</b></p>

      <input style={styles.input} type="password" placeholder="Nova senha" value={password} onChange={e=>setPassword(e.target.value)} />

      <button style={styles.mainBtn} onClick={async ()=>{
        if (!password) return alert("Digite uma senha");
        await createUser(currentUser, password);
        goStep("vote");
      }}>Salvar e Votar</button>

      <button style={styles.backBtn} onClick={goBack}>⬅ Voltar</button>
    </div>
  );

  // ================= FORGOT PASSWORD =================

  if (step === "forgot") return (
    <div style={styles.container}>
      <h2>Resetar Senha</h2>
      <p>Peça o código ao administrador para resetar sua senha.</p>
      <button style={styles.backBtn} onClick={goBack}>⬅ Voltar</button>
    </div>
  );

  // ================= RESULTS TODAY =================

  if (step === "results") {
    const blocked = voteCount < MIN_VOTERS_TO_SHOW;
    const missing = MIN_VOTERS_TO_SHOW - voteCount;

    return (
      <div style={styles.container}>
        <h2>Resultados</h2>
        <p style={styles.date}>📅 {todayFormatted}</p>
        <p>👥 {voteCount} pessoas votaram</p>

        {blocked && (
          <div style={styles.blockedBox}>
            <h3>🔒 Resultados bloqueados</h3>
            <p>É necessário <b>{MIN_VOTERS_TO_SHOW}</b> pessoas votarem.</p>
            <p><b>Faltam {missing}</b> votos para liberar.</p>
            <p style={{opacity:0.8}}>Isso é para preservar o anonimato.</p>
            <ProgressBar value={voteCount} max={MIN_VOTERS_TO_SHOW} />
          </div>
        )}

        {!blocked && PEOPLE.map(p=>(
          <div key={p} style={styles.card}>
            <h3>{p}</h3>
            {EMOJIS.map(e=>(<span key={e} style={{marginRight:12}}>{e} {votes[p]?.[e]||0}</span>))}
          </div>
        ))}

        <button style={styles.backBtn} onClick={goBack}>⬅ Voltar</button>
      </div>
    );
  }

  // ================= HISTORY =================

  if (step === "history") {
    return (
      <div style={styles.container}>
        <h2>Resultados (anterior)</h2>
        <p style={styles.date}>📅 {yesterdayFormatted}</p>

        <h3>Top por Emoji</h3>
        <div style={styles.topTable}>
          {EMOJIS.map(e=>{
            const ranking = Object.entries(yesterdayVotes).map(([name,obj])=>({name, count: obj?.[e]||0})).sort((a,b)=>b.count-a.count);
            const max = ranking[0]?.count || 0;
            const winners = ranking.filter(r=>r.count===max && max>0).map(r=>r.name).join(", ");
            return (
              <div key={e} style={styles.topRow}>
                <span>{winners || "-"}</span>
                <span><b>{e} {max || 0}</b></span>
              </div>
            );
          })}
        </div>

        <h3>Resultados Gerais</h3>
        {PEOPLE.map(p=>(
          <div key={p} style={styles.card}>
            <h4>{p}</h4>
            {EMOJIS.map(e=>(<span key={e} style={{marginRight:12}}>{e} {yesterdayVotes[p]?.[e]||0}</span>))}
          </div>
        ))}

        <button style={styles.backBtn} onClick={goBack}>⬅ Voltar</button>
      </div>
    );
  }
}

// ================= STYLE =================

const styles = {
  container:{ maxWidth:760, margin:"40px auto", textAlign:"center", fontFamily:"Inter, sans-serif", color:"#fff" },
  title:{ fontSize:36, fontWeight:"bold" },
  date:{ opacity:0.7, marginBottom:10 },
  card:{ background:"#111", padding:16, marginBottom:12, borderRadius:16, boxShadow:"0 0 20px rgba(0,0,0,0.6)" },
  input:{ padding:12, borderRadius:12, border:"none", margin:8, width:"100%" },
  select:{ padding:12, borderRadius:12, border:"none", margin:8, width:"100%" },
  mainBtn:{ fontSize:18, padding:"12px 22px", borderRadius:14, border:"none", cursor:"pointer", marginTop:12, background:"linear-gradient(90deg,#22c55e,#16a34a)", color:"#000", fontWeight:"bold" },
  mainBtnOutline:{ fontSize:16, padding:"10px 18px", borderRadius:14, border:"1px solid #22c55e", background:"transparent", color:"#22c55e", cursor:"pointer", marginTop:12 },
  backBtn:{ marginTop:14, padding:"8px 16px", borderRadius:12, border:"1px solid #555", background:"transparent", color:"#aaa", cursor:"pointer" },
  blockedBox:{ background:"#111", padding:16, borderRadius:14, marginBottom:12 },
  topTable:{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8, background:"#111", padding:12, borderRadius:14, marginBottom:16 },
  topRow:{ display:"contents" }
};

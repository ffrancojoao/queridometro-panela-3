import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ================= CONFIG =================
const PEOPLE = [
  "Augusto","Cris Lage","Gabriela","Giovanna","Hanna","Helo","Janja",
  "Joao","Juan","Juliete","Karina","Mari","Silas","Vini"
].sort((a,b)=>a.localeCompare(b));

const EMOJIS = ["❤️","🤥","🤮","🐍","👜","💔","🍪","🪴","🎯","🍌","💣"];
const MIN_VOTERS = 5;
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
    const { data } = await supabase.from("votes")
      .select("id")
      .eq("voter", name)
      .eq("day", todayBR)
      .limit(1);
    return data && data.length > 0;
  }

  async function submitVote() {
    if (Object.keys(selected).length !== PEOPLE.length - 1) {
      return alert("Você precisa votar em TODOS para enviar.");
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
      <div style={{ width:"100%", background:"#111", borderRadius:12, margin:"10px 0", overflow:"hidden" }}>
        <div style={{
          width: percent+"%",
          background:"linear-gradient(90deg,#22c55e,#16a34a)",
          padding:6,
          textAlign:"center",
          fontWeight:"bold",
          color:"#000",
          transition:"0.3s"
        }}>
          {percent}%
        </div>
      </div>
    );
  }

  const TopBack = () => (
    <div style={{textAlign:"center", marginBottom:10}}>
      <button style={styles.backTopBtn} onClick={goBack}>⬅ Voltar</button>
    </div>
  );

  // ================= HOME =================

  if (step === "home") return (
    <div style={styles.container}>
      <h1 style={styles.title}>Queridômetro dxs Gaymers</h1>
      <p style={styles.date}>📅 {todayFormatted}</p>

      <button style={styles.mainBtn} onClick={()=>goStep("login")}>Responder</button>
      <button style={styles.mainBtnOutline} onClick={()=>goStep("results")}>Resultados</button>
      <button style={styles.mainBtnOutline} onClick={()=>goStep("history")}>Resultados (anterior)</button>
    </div>
  );

  // ================= LOGIN =================

  if (step === "login") return (
    <div style={styles.container}>
      <TopBack/>

      <h2>Identificação</h2>
      <p style={styles.date}>📅 {todayFormatted}</p>

      <select style={styles.select} value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>

      <input
        style={styles.input}
        type="password"
        placeholder="Senha"
        value={password}
        onChange={e=>setPassword(e.target.value)}
      />

      <button style={styles.mainBtn} onClick={async ()=>{
        const user = await checkUser(currentUser);
        if (!user) return goStep("register");
        if (user.password !== password) return alert("Senha incorreta");
        const voted = await verifyVoteToday(currentUser);
        if (voted) return alert("Você já votou hoje!");
        goStep("vote");
      }}>Entrar</button>

      <button style={styles.mainBtnOutline} onClick={()=>goStep("forgot")}>
        Esqueci minha senha
      </button>
    </div>
  );

  // ================= REGISTER =================

  if (step === "register") return (
    <div style={styles.container}>
      <TopBack/>
      <h2>Criar senha</h2>
      <p>Primeiro acesso de <b>{currentUser}</b></p>

      <input style={styles.input} type="password" placeholder="Nova senha" value={password} onChange={e=>setPassword(e.target.value)} />

      <button style={styles.mainBtn} onClick={async ()=>{
        if (!password) return alert("Digite uma senha");
        await createUser(currentUser, password);
        goStep("vote");
      }}>Salvar e Votar</button>
    </div>
  );

  // ================= FORGOT =================

  if (step === "forgot") return (
    <div style={styles.container}>
      <TopBack/>
      <h2>Resetar Senha</h2>
      <p>Fale com o admin para resetar sua senha.</p>
    </div>
  );

  // ================= VOTE =================

  if (step === "vote") {
    const progress = Object.keys(selected).length;
    const total = PEOPLE.length - 1;

    return (
      <div style={styles.container}>
        <TopBack/>

        <h2>Distribua seus emojis</h2>
        <p style={styles.date}>📅 {todayFormatted}</p>
        <p>Votando como <b>{currentUser}</b></p>

        <p>Progresso: {progress}/{total}</p>
        <ProgressBar value={progress} max={total} />

        {PEOPLE.filter(p=>p!==currentUser).map(person=>(
          <div key={person} style={styles.card}>
            <h3>{person}</h3>
            <div style={styles.emojiRow}>
              {EMOJIS.map(e=>(
                <button
                  key={e}
                  style={{
                    ...styles.emojiBtn,
                    background:selected[person]===e?"#22c55e":"#111",
                    transform:selected[person]===e?"scale(1.15)":"scale(1)"
                  }}
                  onClick={()=>setSelected({...selected,[person]:e})}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          style={{...styles.mainBtn, opacity:progress===total?1:0.4}}
          disabled={progress!==total}
          onClick={submitVote}
        >
          Finalizar e Enviar
        </button>
      </div>
    );
  }

  // ================= RESULTS =================

  if (step === "results") {
    const blocked = voteCount < MIN_VOTERS;
    const missing = MIN_VOTERS - voteCount;

    return (
      <div style={styles.container}>
        <TopBack/>

        <h2>Resultados</h2>
        <p style={styles.date}>📅 {todayFormatted}</p>
        <p>👥 {voteCount} pessoas já votaram</p>

        {blocked && (
          <div style={styles.blockedBox}>
            <h3>🔒 Resultados bloqueados</h3>
            <p>Precisa de <b>{MIN_VOTERS}</b> votantes.</p>
            <p>Faltam <b>{missing}</b>.</p>
            <p style={{opacity:0.7}}>Para preservar o anonimato.</p>
            <ProgressBar value={voteCount} max={MIN_VOTERS} />
          </div>
        )}

        {!blocked && PEOPLE.map(p=>(
          <div key={p} style={styles.card}>
            <h3>{p}</h3>
            {EMOJIS.map(
::contentReference[oaicite:0]{index=0}

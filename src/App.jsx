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
  const [currentUser, setCurrentUser] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState({});
  const [votes, setVotes] = useState({});
  const [voteCount, setVoteCount] = useState(0);
  const [todayFormatted, setTodayFormatted] = useState("");

  // 🇧🇷 Data Brasil
  const todayBR = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo"
  });

  // Data bonita
  useEffect(() => {
    const now = new Date();
    setTodayFormatted(
      now.toLocaleDateString("pt-BR", {
        weekday:"long", day:"2-digit", month:"long", year:"numeric",
        timeZone:"America/Sao_Paulo"
      })
    );
    fetchVotes();
  }, []);

  // ================= SUPABASE =================

  async function fetchVotes() {
    const { data } = await supabase
      .from("votes")
      .select("*")
      .eq("day", todayBR);

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

  async function checkUser(name) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("name", name)
      .single();
    return data;
  }

  async function createUser(name, pass) {
    await supabase.from("users").insert([{ name, password: pass }]);
  }

  async function verifyVoteToday(name) {
    const { data } = await supabase
      .from("votes")
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

  // ================= UI COMPONENTS =================

  function ProgressBar({ value, max }) {
    const percent = Math.round((value / max) * 100);
    return (
      <div style={{ width:"100%", background:"#222", borderRadius:10, margin:"10px 0" }}>
        <div style={{
          width: percent+"%",
          background:"#22c55e",
          padding:6,
          borderRadius:10,
          textAlign:"center",
          fontWeight:"bold",
          color:"#000"
        }}>
          {percent}%
        </div>
      </div>
    );
  }

  // ================= HOME =================

  if (step === "home") return (
    <div style={styles.container}>
      <h1 style={styles.title}>Queridômetro da Panela</h1>
      <p style={styles.subtitle}>📅 {todayFormatted}</p>

      <button style={styles.mainBtn} onClick={()=>setStep("login")}>Responder</button>
      <button style={styles.mainBtnOutline} onClick={()=>setStep("results")}>Resultados Hoje</button>
    </div>
  );

  // ================= LOGIN =================

  if (step === "login") return (
    <div style={styles.container}>
      <h2>Identificação</h2>

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
        if (!user) return setStep("register");

        if (user.password !== password) return alert("Senha incorreta");

        const voted = await verifyVoteToday(currentUser);
        if (voted) return alert("Você já votou hoje!");

        setStep("vote");
      }}>
        Entrar
      </button>
    </div>
  );

  // ================= REGISTER =================

  if (step === "register") return (
    <div style={styles.container}>
      <h2>Criar senha</h2>
      <p>Primeiro acesso de <b>{currentUser}</b></p>

      <input
        style={styles.input}
        type="password"
        placeholder="Nova senha"
        value={password}
        onChange={e=>setPassword(e.target.value)}
      />

      <button style={styles.mainBtn} onClick={async ()=>{
        if (!password) return alert("Digite uma senha");
        await createUser(currentUser, password);
        setStep("vote");
      }}>
        Salvar e Votar
      </button>
    </div>
  );

  // ================= VOTING =================

  if (step === "vote") {
    const progress = Object.keys(selected).length;
    const total = PEOPLE.length - 1;

    return (
      <div style={styles.container}>
        <h2>Distribua seus emojis</h2>
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
                    background:selected[person]===e?"#22c55e":"#222",
                    transform:selected[person]===e?"scale(1.2)":"scale(1)"
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
          style={{
            ...styles.mainBtn,
            background: progress === total ? "#22c55e" : "#555",
            color:"#000"
          }}
          disabled={progress !== total}
          onClick={submitVote}
        >
          ✅ Finalizar e Enviar Votos
        </button>
      </div>
    );
  }

  // ================= RESULTS =================

  if (step === "results") {
    if (voteCount < MIN_VOTERS_TO_SHOW) {
      return (
        <div style={styles.container}>
          <h2>Resultados bloqueados 🔒</h2>
          <p>Para preservar o anonimato, os resultados só aparecem após {MIN_VOTERS_TO_SHOW} pessoas votarem.</p>
          <p><b>Já votaram: {voteCount} de {MIN_VOTERS_TO_SHOW}</b></p>
          <ProgressBar value={voteCount} max={MIN_VOTERS_TO_SHOW} />
          <button style={styles.mainBtnOutline} onClick={()=>setStep("home")}>Voltar</button>
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <h2>Resultados de Hoje</h2>
        <p>👥 {voteCount} pessoas votaram</p>

        {PEOPLE.map(p=>(
          <div key={p} style={styles.card}>
            <h3>{p}</h3>
            {EMOJIS.map(e=>(
              <span key={e} style={{marginRight:12}}>
                {e} {votes[p]?.[e] || 0}
              </span>
            ))}
          </div>
        ))}

        <button style={styles.mainBtnOutline} onClick={()=>setStep("home")}>Voltar</button>
      </div>
    );
  }
}

// ================= STYLE =================

const styles = {
  container:{ maxWidth:720, margin:"40px auto", textAlign:"center", fontFamily:"Inter, sans-serif", color:"#fff" },
  title:{ fontSize:34, fontWeight:"bold" },
  subtitle:{ opacity:0.7 },
  card:{ background:"#111", padding:16, marginBottom:12, borderRadius:14, boxShadow:"0 0 12px rgba(0,0,0,0.5)" },
  emojiRow:{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" },
  emojiBtn:{ fontSize:26, padding:10, borderRadius:12, border:"none", cursor:"pointer", transition:"0.15s" },
  input:{ padding:12, borderRadius:10, border:"none", margin:8, width:"100%" },
  select:{ padding:12, borderRadius:10, border:"none", margin:8, width:"100%" },
  mainBtn:{ fontSize:18, padding:"12px 22px", borderRadius:12, border:"none", cursor:"pointer", marginTop:12 },
  mainBtnOutline:{ fontSize:16, padding:"10px 18px", borderRadius:12, border:"1px solid #22c55e", background:"transparent", color:"#22c55e", cursor:"pointer", marginTop:12 }
};


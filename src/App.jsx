import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ================= CONFIG =================
const PEOPLE = [
  "Adriano","Ander","Borda","Chico","Daniel","Diogo","Dru","Eric Aquiar","Fear","Felype","Flausino","Giordano","Kazuhiro","Marcos","Mello","Paulo","Pelicano","Pepeu","Prince","Red","Reinaldo","Rod. Rosa","Samuel","Smile","Tibor","Uekawa","Valbert","Victor"
].sort((a,b)=>a.localeCompare(b));

const EMOJIS = ["❤️","🤥","🤮","🐍","👜","💔","🍪","🪴","🎯","🍌","💣"];
const MIN_VOTERS_TO_SHOW = 5;

// 🔐 CÓDIGO SECRETO DE RESET (SÓ VOCÊ SABE)
const ADMIN_RESET_CODE = "panelabbb";
// =========================================

// ===== FUNÇÃO DE DATA NO FUSO BRASILIA =====
function getBrazilDateKey() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(now); // YYYY-MM-DD
}

function getBrazilFormattedDate() {
  return new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export default function App() {
  const [step, setStep] = useState("home");
  const [currentUser, setCurrentUser] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");

  const [selected, setSelected] = useState({});
  const [votes, setVotes] = useState({});
  const [voteCount, setVoteCount] = useState(0);

  const todayKey = getBrazilDateKey();
  const todayFormatted = getBrazilFormattedDate();

  // ================= LOAD DATA =================
  useEffect(() => {
    fetchVotes();
  }, []);

  async function fetchVotes() {
    const { data } = await supabase
      .from("votes")
      .select("*")
      .eq("day", todayKey);

    const map = {};
    data?.forEach(v => {
      if (!map[v.target]) map[v.target] = {};
      if (!map[v.target][v.emoji]) map[v.target][v.emoji] = 0;
      map[v.target][v.emoji] += 1;
    });

    setVotes(map);
    const voters = [...new Set(data?.map(d => d.voter))];
    setVoteCount(voters.length);
  }

  // ================= USERS =================
  async function checkUser(name) {
    const { data } = await supabase.from("users").select("*").eq("name", name).single();
    return data;
  }

  async function createUser(name, pass) {
    await supabase.from("users").insert([{ name, password: pass }]);
  }

  async function resetUserPassword(name, newPass) {
    await supabase.from("users").update({ password: newPass }).eq("name", name);
  }

  async function verifyVoteToday(name) {
    const { data } = await supabase
      .from("votes")
      .select("id")
      .eq("voter", name)
      .eq("day", todayKey);
    return data?.length > 0;
  }

  // ================= VOTING =================
  async function submitVote() {
    if (Object.keys(selected).length !== PEOPLE.length - 1) {
      return alert("Vote em TODAS as pessoas");
    }

    if (!window.confirm("Confirma envio? Depois não poderá editar.")) return;

    const rows = Object.entries(selected).map(([target, emoji]) => ({
      voter: currentUser,
      target,
      emoji,
      day: todayKey
    }));

    await supabase.from("votes").insert(rows);
    fetchVotes();
    setStep("results");
  }

  // ================= UI =================
  if (step === "home") return (
    <div style={styles.container}>
      <h1>Queridômetro da Panela</h1>
      <p>📅 {todayFormatted}</p>
      <button style={styles.mainBtn} onClick={()=>setStep("login")}>Responder</button>
      <button style={styles.mainBtn} onClick={()=>setStep("results")}>Ver Resultados</button>
      <button style={styles.mainBtn} onClick={()=>setStep("reset")}>Resetar Senha</button>
    </div>
  );

  // LOGIN
  if (step === "login") return (
    <div style={styles.container}>
      <h2>Login</h2>
      <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>
      <input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} />
      <button onClick={async ()=>{
        const user = await checkUser(currentUser);
        if(!user) return setStep("register");
        if(user.password !== password) return alert("Senha incorreta");
        const voted = await verifyVoteToday(currentUser);
        if(voted) return alert("Você já votou hoje");
        setStep("vote");
      }}>Entrar</button>
    </div>
  );

  // REGISTER
  if (step === "register") return (
    <div style={styles.container}>
      <h2>Criar senha</h2>
      <p>{currentUser}</p>
      <input type="password" placeholder="Nova senha" value={password} onChange={e=>setPassword(e.target.value)} />
      <button onClick={async ()=>{
        await createUser(currentUser, password);
        setStep("vote");
      }}>Salvar</button>
    </div>
  );

  // RESET PASSWORD (COM CÓDIGO SECRETO)
  if (step === "reset") return (
    <div style={styles.container}>
      <h2>Resetar Senha</h2>
      <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>
      <input placeholder="Código secreto do admin" value={resetCode} onChange={e=>setResetCode(e.target.value)} />
      <input type="password" placeholder="Nova senha" value={password} onChange={e=>setPassword(e.target.value)} />
      <button onClick={async ()=>{
        if(resetCode !== ADMIN_RESET_CODE) return alert("Código inválido");
        await resetUserPassword(currentUser, password);
        alert("Senha resetada com sucesso");
        setStep("home");
      }}>Resetar</button>
    </div>
  );

  // VOTE
  if (step === "vote") return (
    <div style={styles.container}>
      <h2>Vote nos outros</h2>
      {PEOPLE.filter(p=>p!==currentUser).map(person=>(
        <div key={person} style={styles.card}>
          <h3>{person}</h3>
          {EMOJIS.map(e=>(
            <button key={e}
              style={{...styles.emojiBtn, background:selected[person]===e?"#22c55e":"#222"}}
              onClick={()=>setSelected({...selected,[person]:e})}
            >{e}</button>
          ))}
        </div>
      ))}
      <button style={styles.mainBtn} onClick={submitVote}>Finalizar</button>
    </div>
  );

  // RESULTS
  if (step === "results") return (
    <div style={styles.container}>
      <h2>Resultados</h2>
      <p>Votantes hoje: {voteCount}</p>
      {voteCount < MIN_VOTERS_TO_SHOW && <p>Resultados bloqueados até {MIN_VOTERS_TO_SHOW} votos.</p>}
      {voteCount >= MIN_VOTERS_TO_SHOW && PEOPLE.map(person=> (
        <div key={person} style={styles.card}>
          <b>{person}</b><br/>
          {EMOJIS.map(e=> <span key={e}>{e} {votes[person]?.[e]||0} </span>)}
        </div>
      ))}
      <button onClick={()=>setStep("home")}>Voltar</button>
    </div>
  );

  return null;
}

const styles = {
  container:{ maxWidth:700, margin:"40px auto", fontFamily:"sans-serif", textAlign:"center" },
  card:{ background:"#111", color:"#fff", padding:12, margin:10, borderRadius:10 },
  emojiBtn:{ fontSize:22, padding:8, margin:4, borderRadius:10, border:"none", cursor:"pointer" },
  mainBtn:{ fontSize:16, padding:"10px 20px", margin:10, borderRadius:10, border:"none", cursor:"pointer" }
};

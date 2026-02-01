import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ================= CONFIG =================
const PEOPLE = [
  "Adriano","Ander","Borda","Chico","Daniel","Diogo","Dru","Eric Aquiar","Fear","Felype","Flausino","Giordano","Kazuhiro","Marcos","Mello","Paulo","Pelicano","Pepeu","Prince","Red","Reinaldo","Rod. Rosa","Samuel","Smile","Tibor","Uekawa","Valbert","Victor"
].sort((a,b)=>a.localeCompare(b));

const EMOJIS = ["❤️","🤥","🤮","🐍","🧳","💔","🍪","🪴","🎯","🍌","💣"];
const MIN_VOTERS_TO_SHOW = 5;
// =========================================

// Retorna a data no fuso horário de Brasília (YYYY-MM-DD)
function getBrazilDateKey() {
  const now = new Date();
  const brDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return brDate.toISOString().slice(0, 10);
}

export default function App() {
  const [step, setStep] = useState("home");
  const [currentUser, setCurrentUser] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState({});
  const [votes, setVotes] = useState({});
  const [voteCount, setVoteCount] = useState(0);
  const [todayFormatted, setTodayFormatted] = useState("");

  const todayKey = getBrazilDateKey();

  useEffect(() => {
    const brDate = new Date().toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
    setTodayFormatted(brDate);
    fetchVotes();
  }, []);

  // ================= SUPABASE =================

  async function fetchVotes() {
    const { data, error } = await supabase
      .from("votes")
      .select("voter,target,emoji")
      .eq("day", todayKey);

    if (error) {
      console.error("Erro ao buscar votos:", error);
      return;
    }

    const map = {};
    data.forEach(v => {
      if (!map[v.target]) map[v.target] = {};
      if (!map[v.target][v.emoji]) map[v.target][v.emoji] = 0;
      map[v.target][v.emoji] += 1;
    });

    setVotes(map);
    setVoteCount([...new Set(data.map(d => d.voter))].length);
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
      .eq("day", todayKey);
    return data && data.length > 0;
  }

  async function submitVote() {
    const targets = PEOPLE.filter(p => p !== currentUser);
    if (Object.keys(selected).length !== targets.length) {
      return alert("Você precisa votar em TODAS as pessoas.");
    }

    const confirmSend = window.confirm("Confirmar envio? Não poderá alterar depois.");
    if (!confirmSend) return;

    const voteArr = targets.map(t => ({
      voter: currentUser,
      target: t,
      emoji: selected[t],
      day: todayKey
    }));

    const { error } = await supabase.from("votes").insert(voteArr);
    if (error) {
      alert("Erro ao salvar votos");
      console.error(error);
      return;
    }

    fetchVotes();
    setStep("results");
  }

  // ================= UI =================

  if (step === "home") return (
    <div style={styles.container}>
      <h1>Queridômetro da Panela</h1>
      <p style={{opacity:0.7}}>📅 {todayFormatted}</p>
      <button style={styles.mainBtn} onClick={()=>setStep("login")}>Responder</button>
      <button style={styles.mainBtn} onClick={()=>setStep("results")}>Ver Resultados</button>
    </div>
  );

  if (step === "login") return (
    <div style={styles.container}>
      <h1>Login</h1>
      <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>
      <input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} />
      <button onClick={async ()=>{
        if(!currentUser || !password) return alert("Preencha tudo");
        const user = await checkUser(currentUser);
        if(!user) return setStep("register");
        if(user.password !== password) return alert("Senha incorreta");
        const voted = await verifyVoteToday(currentUser);
        if(voted) return alert("Você já votou hoje");
        setSelected({});
        setStep("vote");
      }}>Entrar</button>
    </div>
  );

  if (step === "register") return (
    <div style={styles.container}>
      <h1>Criar senha</h1>
      <p>{currentUser}</p>
      <input type="password" placeholder="Nova senha" value={password} onChange={e=>setPassword(e.target.value)} />
      <button onClick={async ()=>{
        if(!password) return alert("Defina uma senha");
        await createUser(currentUser, password);
        setSelected({});
        setStep("vote");
      }}>Salvar</button>
    </div>
  );

  if (step === "vote") return (
    <div style={styles.container}>
      <h1>Vote</h1>
      <p>Você: <b>{currentUser}</b></p>
      {PEOPLE.filter(p=>p!==currentUser).map(person=>(
        <div key={person} style={styles.card}>
          <h3>{person}</h3>
          <div style={styles.emojiRow}>
            {EMOJIS.map(e=>(
              <button key={e}
                style={{...styles.emojiBtn, background:selected[person]===e?"#22c55e":"#222"}}
                onClick={()=>setSelected({...selected,[person]:e})}
              >{e}</button>
            ))}
          </div>
        </div>
      ))}
      <button style={styles.mainBtn} onClick={submitVote}>Finalizar</button>
    </div>
  );

  if (step === "results") {
    const canShow = voteCount >= MIN_VOTERS_TO_SHOW;
    return (
      <div style={styles.container}>
        <h1>Resultados</h1>
        <p>👥 Votantes: {voteCount}</p>
        {!canShow && <p>Resultados liberam com {MIN_VOTERS_TO_SHOW} votantes.</p>}
        {canShow && PEOPLE.map(person=> (
          <div key={person} style={styles.card}>
            <h3>{person}</h3>
            <div>
              {EMOJIS.map(e=><span key={e} style={{marginRight:12}}>{e} {votes[person]?.[e]||0}</span>)}
            </div>
          </div>
        ))}
        <button onClick={()=>setStep("home")}>Voltar</button>
      </div>
    );
  }

  return null;
}

const styles = {
  container:{ maxWidth:700, margin:"40px auto", fontFamily:"sans-serif", textAlign:"center" },
  card:{ background:"#111", color:"#fff", padding:15, marginBottom:12, borderRadius:12 },
  emojiRow:{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" },
  emojiBtn:{ fontSize:26, padding:10, borderRadius:12, cursor:"pointer", border:"none" },
  mainBtn:{ fontSize:18, padding:"10px 20px", margin:10, borderRadius:10, border:"none", cursor:"pointer" }
};

import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ================= CONFIG =================
const PEOPLE = [
  "Adriano","Ander","Borda","Chico","Daniel","Diogo","Dru",
  "Eric Aquiar","Fear","Felype","Flausino","Giordano","Kazuhiro",
  "Marcos","Mello","Paulo","Pelicano","Pepeu","Prince","Red",
  "Reinaldo","Rod. Rosa","Samuel","Smile","Tibor","Uekawa","Valbert","Victor"
].sort((a,b)=>a.localeCompare(b));

const EMOJIS = ["❤️","🤥","🤮","🐍","👜","💔","🪴","🎯","🍌","💣"];
const MIN_VOTERS = 5;
// =========================================

const normalize = (name) =>
  name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function App() {
  const [step, setStep] = useState("home");
  const [currentUser, setCurrentUser] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState({});
  const [votes, setVotes] = useState({});
  const [users, setUsers] = useState({});
  const [votedToday, setVotedToday] = useState({});
  const [todayFormatted, setTodayFormatted] = useState("");

  // Data de hoje no fuso de Brasília
  const brTime = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const todayKey = brTime.toISOString().slice(0,10);
  useEffect(() => {
    setTodayFormatted(brTime.toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" }));
  }, []);

  // ----------------- Load Supabase -----------------
  useEffect(() => {
    fetchVotes();
    fetchUsers();
  }, []);

  async function fetchVotes() {
    const { data } = await supabase
      .from("votes")
      .select("*")
      .eq("day", todayKey);

    const voteMap = {};
    const votedMap = {};

    data?.forEach(v => {
      const targetNorm = normalize(v.target);
      const matched = PEOPLE.find(p => normalize(p) === targetNorm);
      if (!matched) return;

      if (!voteMap[matched]) voteMap[matched] = {};
      if (!voteMap[matched][v.emoji]) voteMap[matched][v.emoji] = 0;
      voteMap[matched][v.emoji] += 1;

      votedMap[v.voter] = true;
    });

    setVotes(voteMap);
    setVotedToday(votedMap);
  }

  async function fetchUsers() {
    const { data } = await supabase.from("users").select("*");
    const userMap = {};
    data?.forEach(u => userMap[u.name] = { password: u.password });
    setUsers(userMap);
  }

  async function createUser(name, pass) {
    await supabase.from("users").insert([{ name, password: pass }]);
    fetchUsers();
  }

  async function submitVotes() {
    const targets = PEOPLE.filter(p => p !== currentUser);
    if (targets.some(p => !selected[p])) return alert("Você precisa votar em todos!");

    const voteArr = targets.map(p => ({
      voter: currentUser,
      target: p,
      emoji: selected[p],
      day: todayKey
    }));

    await supabase.from("votes").insert(voteArr);
    fetchVotes();
    setStep("results");
  }

  const totalVoters = Object.keys(votedToday).length;

  // ----------------- UI -----------------
  if(step==="home") return (
    <div style={styles.container}>
      <h1>Queridômetro dxs Gaymers</h1>
      <p style={{opacity:0.7}}>📅 {todayFormatted}</p>
      <p>Responde 1x por dia. Reset automático diário (horário de Brasília).</p>
      <button style={styles.mainBtn} onClick={()=>setStep("login")}>Responder</button>
      <button style={styles.mainBtn} onClick={()=>setStep("results")}>Ver Resultados</button>
    </div>
  );

  if(step==="login") return (
    <div style={styles.container}>
      <h1>Identificação</h1>
      <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p => <option key={p}>{p}</option>)}
      </select>
      <input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)}/>
      <button disabled={!currentUser || !password} onClick={async ()=>{
        const user = users[currentUser];
        if(!user) setStep("register");
        else if(user.password===password){
          if(votedToday[currentUser]) alert("Você já votou hoje!");
          else { setSelected({}); setStep("vote"); }
        } else alert("Senha incorreta");
      }}>Entrar</button>
    </div>
  );

  if(step==="register") return (
    <div style={styles.container}>
      <h1>Criar senha</h1>
      <p>Primeiro acesso de <b>{currentUser}</b></p>
      <input type="password" placeholder="Nova senha" value={password} onChange={e=>setPassword(e.target.value)}/>
      <button onClick={async ()=>{
        if(!password) return alert("Defina uma senha");
        await createUser(currentUser, password);
        setSelected({});
        setStep("vote");
      }}>Salvar e Entrar</button>
    </div>
  );

  if(step==="vote") {
    const targets = PEOPLE.filter(p => p !== currentUser);
    return (
      <div style={styles.container}>
        <h1>Distribua seus emojis</h1>
        <p>Votando como <b>{currentUser}</b> (anônimo)</p>
        {targets.map(person => (
          <div key={person} style={styles.card}>
            <h3>{person}</h3>
            <div style={styles.emojiRow}>
              {EMOJIS.map(e => (
                <button
                  key={e}
                  style={{
                    ...styles.emojiBtn,
                    background: selected[person]===e?"#22c55e":"#222",
                    transform: selected[person]===e?"scale(1.2)":"scale(1)",
                    boxShadow: selected[person]===e?"0 0 12px #22c55e":"none"
                  }}
                  onClick={()=>setSelected({...selected,[person]:e})}
                >{e}</button>
              ))}
            </div>
          </div>
        ))}
        <button style={styles.mainBtn} onClick={submitVotes}>Finalizar Voto</button>
      </div>
    );
  }

  if(step==="results") {
    return (
      <div style={styles.container}>
        <h1>Resultados do Queridômetro</h1>
        <p style={{opacity:0.7}}>📅 {todayFormatted}</p>
        <p>👥 Pessoas que já votaram hoje: {totalVoters}</p>

        {totalVoters < MIN_VOTERS && (
          <div style={{background:"#111", padding:16, borderRadius:12, color:"#fff"}}>
            <b>Resultados bloqueados para preservar o anonimato.</b>
            <p>Serão liberados quando {MIN_VOTERS} pessoas votarem.</p>
          </div>
        )}

        {totalVoters >= MIN_VOTERS && PEOPLE.map(person => (
          <div key={person} style={{...styles.card, border: person===currentUser?"2px solid #22c55e":"none", background: person===currentUser?"#0f172a":"#111"}}>
            <h3>{person}{person===currentUser?" (você)":""}</h3>
            <div>
              {EMOJIS.map(e => <span key={e} style={{marginRight:12}}>{e} {votes[person]?.[e]||0}</span>)}
            </div>
          </div>
        ))}

        <button style={styles.mainBtn} onClick={()=>setStep("home")}>Voltar</button>
      </div>
    );
  }

  return null;
}

const styles = {
  container:{ maxWidth:700, margin:"40px auto", fontFamily:"sans-serif", textAlign:"center" },
  card:{ background:"#111", color:"#fff", padding:15, marginBottom:12, borderRadius:12 },
  emojiRow:{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" },
  emojiBtn:{ fontSize:26, padding:10, borderRadius:12, cursor:"pointer", border:"none", transition:"0.15s all" },
  mainBtn:{ fontSize:18, padding:"10px 20px", margin:10, borderRadius:10, border:"none", cursor:"pointer" }
};


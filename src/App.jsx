import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

const PEOPLE = [
  "Adriano","Ander","Borda","Chico","Daniel","Diogo","Dru","Eric Aquiar","Fear",
  "Felype","Flausino","Giordano","Kazuhiro","Marcos","Mello","Paulo","Pelicano",
  "Pepeu","Prince","Red","Reinaldo","Rod. Rosa","Samuel","Smile","Tibor","Uekawa",
  "Valbert","Victor"
].sort((a,b)=>a.localeCompare(b));

const EMOJIS = ["❤️","🤥","🤮","🐍","👜","💔","🪴","🎯"];

export default function App() {
  const [step, setStep] = useState("home");
  const [currentUser, setCurrentUser] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState({});
  const [votes, setVotes] = useState({});
  const brasilNow = new Date(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));
  const todayKey = brasilNow.toISOString().slice(0,10);

  const todayFormatted = brasilNow.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const [voteCount, setVoteCount] = useState(0);

  useEffect(() => {
    setTodayFormatted(new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" }));
    fetchVotes();
  }, []);

  // ----------- SUPABASE FUNCS -----------

  async function fetchVotes() {
    const { data } = await supabase
      .from("votes")
      .select("*")
      .eq("day", todayKey);
    const map = {};
    data.forEach(v => {
      if (!map[v.target]) map[v.target] = {};
      if (!map[v.target][v.emoji]) map[v.target][v.emoji] = 0;
      map[v.target][v.emoji] += 1;
    });
    setVotes(map);
    setVoteCount([...new Set(data.map(d=>d.voter))].length);
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
      .select("*")
      .eq("voter", name)
      .eq("day", todayKey);
    return data.length > 0;
  }

  async function submitVote() {
    if (Object.keys(selected).length !== PEOPLE.length - 1) return alert("Vote em todos!");
    const confirmSend = window.confirm("Confirma envio dos votos? Não poderá alterar depois.");
    if (!confirmSend) return;
    const voteArr = [];
    for (const [target, emoji] of Object.entries(selected)) {
      voteArr.push({ voter: currentUser, target, emoji, day: todayKey });
    }
    await supabase.from("votes").insert(voteArr);
    fetchVotes();
    setStep("results");
  }

  // ----------- UI -----------

  if(step==="home") return (
    <div style={styles.container}>
      <h1>Queridômetro da Panela</h1>
      <p style={{opacity:0.7}}>📅 {todayFormatted}</p>
      <p>Responde 1x por dia. Reset automático diário.</p>
      <button style={styles.mainBtn} onClick={()=>setStep("login")}>Responder</button>
      <button style={styles.mainBtn} onClick={()=>setStep("results")}>Ver Resultados</button>
    </div>
  );

  if(step==="login") return (
    <div style={styles.container}>
      <h1>Identificação</h1>
      <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>
      <input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)}/>
      <button disabled={!currentUser || !password} onClick={async ()=>{
        const user = await checkUser(currentUser);
        if(!user) setStep("register");
        else if(user.password===password){
          const voted = await verifyVoteToday(currentUser);
          if(voted) alert("Você já votou hoje!");
          else setStep("vote");
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
        setStep("vote");
      }}>Salvar e Entrar</button>
    </div>
  );

  if(step==="vote") return (
    <div style={styles.container}>
      <h1>Distribua seus emojis</h1>
      <p>Votando como <b>{currentUser}</b> (anônimo)</p>
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
                  transform:selected[person]===e?"scale(1.2)":"scale(1)",
                  boxShadow:selected[person]===e?"0 0 12px #22c55e":"none"
                }}
                onClick={()=>setSelected({...selected,[person]:e})}
              >{e}</button>
            ))}
          </div>
        </div>
      ))}
      <button style={styles.mainBtn} onClick={submitVote}>Finalizar Voto</button>
    </div>
  );

  if(step==="results"){
    // só libera resultado se 5 pessoas votarem
    if(voteCount<5){
      return (
        <div style={styles.container}>
          <h1>Resultados do Queridômetro</h1>
          <p style={{opacity:0.7}}>📅 {todayFormatted}</p>
          <p>Ainda não há votos suficientes para liberar resultados. (mínimo: 5 pessoas)</p>
          <button style={styles.mainBtn} onClick={()=>setStep("home")}>Voltar</button>
        </div>
      );
    }
    return (
      <div style={styles.container}>
        <h1>Resultados do Queridômetro</h1>
        <p style={{opacity:0.7}}>📅 {todayFormatted}</p>
        {PEOPLE.map(person=>(
          <div key={person} style={{...styles.card, background: currentUser===person?"#333":"#111"}}>
            <h3>{person}</h3>
            <div>{EMOJIS.map(e=><span key={e} style={{marginRight:12}}>{e} {votes[person]?.[e]||0}</span>)}</div>
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


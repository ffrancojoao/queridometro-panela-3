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
  const [resetCode, setResetCode] = useState("");
  const [selected, setSelected] = useState({});
  const [votesToday, setVotesToday] = useState({});
  const [votesYesterday, setVotesYesterday] = useState({});
  const [voteCountToday, setVoteCountToday] = useState(0);
  const [todayFormatted, setTodayFormatted] = useState("");

  // ================= DATE (Brasilia) =================
  const getBrazilDateKey = (offsetDays = 0) => {
    const now = new Date();
    const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    brTime.setDate(brTime.getDate() + offsetDays);
    return brTime.toISOString().slice(0,10);
  };

  const todayKey = getBrazilDateKey(0);
  const yesterdayKey = getBrazilDateKey(-1);

  useEffect(() => {
    const now = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday:"long", day:"2-digit", month:"long", year:"numeric" });
    setTodayFormatted(now);
    fetchVotesToday();
    fetchVotesYesterday();
  }, []);

  // ================= SUPABASE =================

  async function fetchVotesToday() {
    const { data } = await supabase.from("votes").select("*").eq("day", todayKey);
    if (!data) return;
    const map = {};
    data.forEach(v => {
      if (!map[v.target]) map[v.target] = {};
      if (!map[v.target][v.emoji]) map[v.target][v.emoji] = 0;
      map[v.target][v.emoji]++;
    });
    setVotesToday(map);
    const voters = [...new Set(data.map(d => d.voter))];
    setVoteCountToday(voters.length);
  }

  async function fetchVotesYesterday() {
    const { data } = await supabase.from("votes").select("*").eq("day", yesterdayKey);
    if (!data) return;
    const map = {};
    data.forEach(v => {
      if (!map[v.target]) map[v.target] = {};
      if (!map[v.target][v.emoji]) map[v.target][v.emoji] = 0;
      map[v.target][v.emoji]++;
    });
    setVotesYesterday(map);
  }

  async function checkUser(name) {
    const { data } = await supabase.from("users").select("*").eq("name", name).single();
    return data;
  }

  async function createUser(name, pass) {
    await supabase.from("users").insert([{ name, password: pass }]);
  }

  async function verifyVoteToday(name) {
    const { data } = await supabase.from("votes").select("id").eq("voter", name).eq("day", todayKey).limit(1);
    return data && data.length > 0;
  }

  async function submitVote() {
    if (Object.keys(selected).length !== PEOPLE.length - 1) return alert("Vote em TODOS!");
    if (!window.confirm("Enviar votos? Não poderá alterar.")) return;

    const arr = Object.entries(selected).map(([target, emoji]) => ({
      voter: currentUser,
      target,
      emoji,
      day: todayKey
    }));

    await supabase.from("votes").insert(arr);
    await fetchVotesToday();
    setStep("resultsToday");
  }

  async function resetPassword() {
    const { data, error } = await supabase.rpc("reset_user_password", {
      p_name: currentUser,
      p_secret: resetCode
    });

    if (error) return alert("Código secreto inválido");
    alert("Senha resetada! Crie uma nova ao entrar.");
    setStep("login");
  }

  // ================= TOP EMOJI (ONTEM) =================
  function getTopEmoji(votesMap) {
    const result = {};
    EMOJIS.forEach(e => {
      let max = 0;
      let names = [];
      PEOPLE.forEach(p => {
        const count = votesMap[p]?.[e] || 0;
        if (count > max) {
          max = count;
          names = [p];
        } else if (count === max && count > 0) {
          names.push(p);
        }
      });
      result[e] = { max, names };
    });
    return result;
  }

  const topYesterday = getTopEmoji(votesYesterday);

  // ================= UI =================

  const Button = ({children, onClick}) => (
    <button onClick={onClick} style={styles.btn}>{children}</button>
  );

  if (step === "home") return (
    <div style={styles.container}>
      <h1>Queridômetro da Panela</h1>
      <p>📅 {todayFormatted}</p>
      <Button onClick={()=>setStep("login")}>Responder</Button>
      <Button onClick={()=>setStep("resultsToday")}>Resultados Hoje</Button>
      <Button onClick={()=>setStep("history")}>Histórico Ontem</Button>
      <Button onClick={()=>setStep("reset")}>Esqueci Senha</Button>
    </div>
  );

  // LOGIN
  if (step === "login") return (
    <div style={styles.container}>
      <h2>Entrar</h2>
      <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)} style={styles.input}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>
      <input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} style={styles.input}/>
      <Button onClick={async ()=>{
        const user = await checkUser(currentUser);
        if (!user) return setStep("register");
        if (user.password !== password) return alert("Senha incorreta");
        const voted = await verifyVoteToday(currentUser);
        if (voted) return alert("Você já votou hoje");
        setStep("vote");
      }}>Entrar</Button>
      <Button onClick={()=>setStep("home")}>Voltar</Button>
    </div>
  );

  // REGISTER
  if (step === "register") return (
    <div style={styles.container}>
      <h2>Criar Senha</h2>
      <input type="password" placeholder="Nova senha" value={password} onChange={e=>setPassword(e.target.value)} style={styles.input}/>
      <Button onClick={async ()=>{
        if (!password) return alert("Digite uma senha");
        await createUser(currentUser, password);
        setStep("vote");
      }}>Salvar</Button>
    </div>
  );

  // RESET PASSWORD
  if (step === "reset") return (
    <div style={styles.container}>
      <h2>Resetar Senha</h2>
      <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)} style={styles.input}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>
      <input placeholder="Código secreto do admin" value={resetCode} onChange={e=>setResetCode(e.target.value)} style={styles.input}/>
      <Button onClick={resetPassword}>Resetar</Button>
      <Button onClick={()=>setStep("home")}>Voltar</Button>
    </div>
  );

  // VOTE
  if (step === "vote") return (
    <div style={styles.container}>
      <h2>Vote nos outros</h2>
      {PEOPLE.filter(p=>p!==currentUser).map(person=> (
        <div key={person} style={styles.card}>
          <h3>{person}</h3>
          <div style={styles.emojiRow}>
            {EMOJIS.map(e=> (
              <button key={e} style={{...styles.emojiBtn, background:selected[person]===e?"#22c55e":"#222"}} onClick={()=>setSelected({...selected,[person]:e})}>{e}</button>
            ))}
          </div>
        </div>
      ))}
      <Button onClick={submitVote}>Finalizar</Button>
    </div>
  );

  // RESULTS TODAY
  if (step === "resultsToday") {
    if (voteCountToday < MIN_VOTERS_TO_SHOW) return (
      <div style={styles.container}>
        <h2>Resultados bloqueados</h2>
        <p>{voteCountToday}/{MIN_VOTERS_TO_SHOW} votantes</p>
        <Button onClick={()=>setStep("home")}>Voltar</Button>
      </div>
    );

    return (
      <div style={styles.container}>
        <h2>Resultados de Hoje</h2>
        {PEOPLE.map(p=> (
          <div key={p} style={styles.card}>
            <h3>{p}</h3>
            {EMOJIS.map(e=> <span key={e} style={{marginRight:10}}>{e} {votesToday[p]?.[e]||0}</span>)}
          </div>
        ))}
        <Button onClick={()=>setStep("home")}>Voltar</Button>
      </div>
    );
  }

  // HISTORY YESTERDAY
  if (step === "history") return (
    <div style={styles.container}>
      <h2>Histórico de Ontem ({yesterdayKey})</h2>

      <h3>🏆 Top por Emoji</h3>
      {EMOJIS.map(e=> (
        <div key={e} style={styles.card}>
          <b>{e}</b> → {topYesterday[e].names.join(", ") || "Ninguém"} ({topYesterday[e].max})
        </div>
      ))}

      <h3>📊 Detalhado</h3>
      {PEOPLE.map(p=> (
        <div key={p} style={styles.card}>
          <h4>{p}</h4>
          {EMOJIS.map(e=> <span key={e} style={{marginRight:10}}>{e} {votesYesterday[p]?.[e]||0}</span>)}
        </div>
      ))}
      <Button onClick={()=>setStep("home")}>Voltar</Button>
    </div>
  );
}

// ================= STYLE =================
const styles = {
  container:{ maxWidth:800, margin:"30px auto", fontFamily:"Arial", textAlign:"center" },
  btn:{ padding:"12px 20px", margin:8, fontSize:16, borderRadius:10, border:"none", cursor:"pointer", background:"#2563eb", color:"white" },
  input:{ padding:10, margin:8, fontSize:16, borderRadius:8 },
  card:{ background:"#111", color:"white", padding:12, margin:10, borderRadius:12 },
  emojiRow:{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" },
  emojiBtn:{ fontSize:26, padding:8, borderRadius:10, border:"none", cursor:"pointer" }
};

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
  const [newPassword, setNewPassword] = useState("");
  const [selected, setSelected] = useState({});
  const [votesToday, setVotesToday] = useState({});
  const [votesYesterday, setVotesYesterday] = useState({});
  const [voteCount, setVoteCount] = useState(0);
  const [today, setToday] = useState("");
  const [yesterday, setYesterday] = useState("");

  // 🇧🇷 Data Brasil
  useEffect(() => {
    const now = new Date();
    const brasilNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    
    const todayStr = brasilNow.toISOString().split("T")[0];
    const y = new Date(brasilNow);
    y.setDate(y.getDate() - 1);
    const yesterdayStr = y.toISOString().split("T")[0];

    setToday(todayStr);
    setYesterday(yesterdayStr);

    fetchVotes(todayStr);
    fetchYesterday(yesterdayStr);
  }, []);

  // ================= SUPABASE =================

  async function fetchVotes(day) {
    const { data } = await supabase
      .from("votes")
      .select("*")
      .eq("day", day);

    if (!data) return;

    const map = {};
    data.forEach(v => {
      if (!map[v.target]) map[v.target] = {};
      if (!map[v.target][v.emoji]) map[v.target][v.emoji] = 0;
      map[v.target][v.emoji]++;
    });

    setVotesToday(map);
    setVoteCount([...new Set(data.map(d => d.voter))].length);
  }

  async function fetchYesterday(day) {
    const { data } = await supabase
      .from("votes")
      .select("*")
      .eq("day", day);

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
      .eq("day", today)
      .limit(1);

    return data.length > 0;
  }

  async function submitVote() {
    if (Object.keys(selected).length !== PEOPLE.length - 1) {
      return alert("Vote em TODOS!");
    }

    if (!window.confirm("Enviar votos? NÃO poderá alterar depois.")) return;

    const arr = Object.entries(selected).map(([target, emoji]) => ({
      voter: currentUser,
      target,
      emoji,
      day: today
    }));

    await supabase.from("votes").insert(arr);
    fetchVotes(today);
    setStep("results");
  }

  // RESET SENHA (CHAMA FUNÇÃO SQL)
  async function resetPassword() {
    const { data, error } = await supabase.rpc("reset_user_password", {
      p_name: currentUser,
      p_new_password: newPassword,
      p_secret: resetCode
    });

    if (error) return alert("Código secreto errado");
    alert("Senha resetada!");
    setStep("login");
  }

  // ================= UI =================

  if (step === "home") return (
    <div style={styles.container}>
      <h1>Queridômetro da Panela</h1>
      <button onClick={()=>setStep("login")}>Responder</button>
      <button onClick={()=>setStep("results")}>Resultados Hoje</button>
      <button onClick={()=>setStep("history")}>Histórico Ontem</button>
      <button onClick={()=>setStep("reset")}>Resetar Senha</button>
    </div>
  );

  if (step === "login") return (
    <div style={styles.container}>
      <h2>Login</h2>
      <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>

      <input type="password" placeholder="Senha" value={password}
        onChange={e=>setPassword(e.target.value)} />

      <button onClick={async ()=>{
        const user = await checkUser(currentUser);
        if (!user) return setStep("register");
        if (user.password !== password) return alert("Senha errada");
        if (await verifyVoteToday(currentUser)) return alert("Já votou hoje!");
        setStep("vote");
      }}>Entrar</button>
    </div>
  );

  if (step === "register") return (
    <div style={styles.container}>
      <h2>Criar senha</h2>
      <input type="password" placeholder="Senha" value={password}
        onChange={e=>setPassword(e.target.value)} />
      <button onClick={async ()=>{
        await createUser(currentUser, password);
        setStep("vote");
      }}>Salvar</button>
    </div>
  );

  if (step === "reset") return (
    <div style={styles.container}>
      <h2>Resetar senha</h2>
      <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>

      <input placeholder="Código secreto" value={resetCode}
        onChange={e=>setResetCode(e.target.value)} />

      <input placeholder="Nova senha" value={newPassword}
        onChange={e=>setNewPassword(e.target.value)} />

      <button onClick={resetPassword}>Resetar</button>
    </div>
  );

  if (step === "vote") return (
    <div style={styles.container}>
      <h2>Vote</h2>
      {PEOPLE.filter(p=>p!==currentUser).map(person=>(
        <div key={person} style={styles.card}>
          <h3>{person}</h3>
          {EMOJIS.map(e=>(
            <button key={e}
              style={{fontSize:24, background:selected[person]===e?"#22c55e":"#333"}}
              onClick={()=>setSelected({...selected,[person]:e})}>
              {e}
            </button>
          ))}
        </div>
      ))}
      <button onClick={submitVote}>Finalizar</button>
    </div>
  );

  if (step === "results") return (
    <div style={styles.container}>
      <h2>Resultados Hoje</h2>
      {PEOPLE.map(p=>(
        <div key={p} style={styles.card}>
          <h3>{p}</h3>
          {EMOJIS.map(e=><span key={e}>{e} {votesToday[p]?.[e]||0} </span>)}
        </div>
      ))}
      <button onClick={()=>setStep("home")}>Voltar</button>
    </div>
  );

  if (step === "history") return (
    <div style={styles.container}>
      <h2>Histórico de Ontem</h2>

      {/* TOP CORAÇÃO */}
      <h3>🏆 Top ❤️ Ontem</h3>
      {PEOPLE.map(p=>({
        name:p,
        count:votesYesterday[p]?.["❤️"]||0
      }))
      .sort((a,b)=>b.count-a.count)
      .slice(0,5)
      .map(p=><div key={p.name}>{p.name} - {p.count}</div>)}

      {PEOPLE.map(p=>(
        <div key={p} style={styles.card}>
          <h3>{p}</h3>
          {EMOJIS.map(e=><span key={e}>{e} {votesYesterday[p]?.[e]||0} </span>)}
        </div>
      ))}

      <button onClick={()=>setStep("home")}>Voltar</button>
    </div>
  );
}

const styles = {
  container:{ maxWidth:800, margin:"40px auto", textAlign:"center" },
  card:{ background:"#111", color:"#fff", padding:12, margin:10, borderRadius:10 }
};

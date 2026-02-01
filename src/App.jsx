import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ============ CONFIG ============
const PEOPLE = [
  "Adriano","Ander","Borda","Chico","Daniel","Diogo","Dru","Eric Aquiar",
  "Fear","Felype","Flausino","Giordano","Kazuhiro","Marcos","Mello","Paulo",
  "Pelicano","Pepeu","Prince","Red","Reinaldo","Rod. Rosa","Samuel",
  "Smile","Tibor","Uekawa","Valbert","Victor"
].sort((a,b)=>a.localeCompare(b));

const EMOJIS = ["❤️","🤥","🤮","🐍","👜","💔","🍪","🪴","🎯","🍌","💣"];
const MIN_VOTERS_TO_SHOW = 5;
// ================================

export default function App() {
  const [step, setStep] = useState("home");
  const [currentUser, setCurrentUser] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState({});
  const [votes, setVotes] = useState({});
  const [voteCount, setVoteCount] = useState(0);
  const [history, setHistory] = useState({});
  const [today, setToday] = useState("");
  const [yesterday, setYesterday] = useState("");
  const [resetCode, setResetCode] = useState("");

  // Data Brasilia
  useEffect(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const todayStr = now.toISOString().split("T")[0];

    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayStr = y.toISOString().split("T")[0];

    setToday(todayStr);
    setYesterday(yesterdayStr);

    fetchVotes(todayStr);
    fetchHistory(yesterdayStr);
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

    setVotes(map);
    const voters = [...new Set(data.map(d => d.voter))];
    setVoteCount(voters.length);
  }

  async function fetchHistory(day) {
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

    setHistory(map);
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
    if (Object.keys(selected).length !== PEOPLE.length - 1)
      return alert("Vote em TODOS!");

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

  // RESET SENHA (chama função RPC no Supabase)
  async function resetPassword() {
    const { error } = await supabase.rpc("reset_user_password", {
      p_name: currentUser,
      p_new_password: password,
      p_secret: resetCode
    });

    if (error) return alert("Código secreto errado!");
    alert("Senha resetada!");
    setStep("login");
  }

  // ================= UI =================

  if (step === "home") return (
    <div style={styles.container}>
      <h1>Queridômetro da Panela</h1>
      <p>📅 {today}</p>
      <button onClick={()=>setStep("login")}>Responder</button>
      <button onClick={()=>setStep("results")}>Resultados Hoje</button>
      <button onClick={()=>setStep("history")}>Histórico Ontem</button>
    </div>
  );

  if (step === "login") return (
    <div style={styles.container}>
      <h2>Login</h2>

      <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>

      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={e=>setPassword(e.target.value)}
      />

      <button onClick={async ()=>{
        const user = await checkUser(currentUser);
        if (!user) return setStep("register");
        if (user.password !== password) return alert("Senha incorreta");

        const voted = await verifyVoteToday(currentUser);
        if (voted) return alert("Você já votou hoje!");

        setStep("vote");
      }}>
        Entrar
      </button>

      <button onClick={()=>setStep("reset")}>Esqueci a senha</button>
    </div>
  );

  if (step === "register") return (
    <div style={styles.container}>
      <h2>Criar senha</h2>
      <input
        type="password"
        placeholder="Nova senha"
        value={password}
        onChange={e=>setPassword(e.target.value)}
      />
      <button onClick={async ()=>{
        await createUser(currentUser, password);
        setStep("vote");
      }}>
        Salvar
      </button>
    </div>
  );

  if (step === "reset") return (
    <div style={styles.container}>
      <h2>Resetar senha</h2>
      <input placeholder="Código secreto" value={resetCode} onChange={e=>setResetCode(e.target.value)} />
      <input type="password" placeholder="Nova senha" value={password} onChange={e=>setPassword(e.target.value)} />
      <button onClick={resetPassword}>Resetar</button>
    </div>
  );

  if (step === "vote") return (
    <div style={styles.container}>
      <h2>Vote nos outros</h2>

      {PEOPLE.filter(p=>p!==currentUser).map(person=>(
        <div key={person} style={styles.card}>
          <h3>{person}</h3>
          {EMOJIS.map(e=>(
            <button
              key={e}
              style={{
                fontSize:24,
                background:selected[person]===e?"#22c55e":"#333"
              }}
              onClick={()=>setSelected({...selected,[person]:e})}
            >
              {e}
            </button>
          ))}
        </div>
      ))}

      <button onClick={submitVote}>Finalizar</button>
    </div>
  );

  if (step === "results") {
    if (voteCount < MIN_VOTERS_TO_SHOW)
      return <div style={styles.container}><h2>Resultados bloqueados</h2><p>{voteCount}/{MIN_VOTERS_TO_SHOW}</p></div>;

    return (
      <div style={styles.container}>
        <h2>Resultados de Hoje</h2>
        {PEOPLE.map(p=>(
          <div key={p} style={styles.card}>
            <h3>{p}</h3>
            {EMOJIS.map(e=><span key={e}>{e} {votes[p]?.[e]||0} </span>)}
          </div>
        ))}
      </div>
    );
  }

  if (step === "history") return (
    <div style={styles.container}>
      <h2>Histórico de Ontem ({yesterday})</h2>

      {PEOPLE.map(p=>(
        <div key={p} style={styles.card}>
          <h3>{p}</h3>
          {EMOJIS.map(e=><span key={e}>{e} {history[p]?.[e]||0} </span>)}
        </div>
      ))}
    </div>
  );
}

const styles = {
  container:{ maxWidth:800, margin:"40px auto", textAlign:"center" },
  card:{ background:"#111", color:"#fff", padding:12, margin:10, borderRadius:10 }
};


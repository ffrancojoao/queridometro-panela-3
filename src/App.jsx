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

  // 📅 Data formatada Brasil
  useEffect(() => {
    const now = new Date();
    setTodayFormatted(
      now.toLocaleDateString("pt-BR", {
        weekday:"long", day:"2-digit", month:"long", year:"numeric"
      })
    );
    fetchVotes();
  }, []);

  // ================= SUPABASE =================

  async function fetchVotes() {
    const { data } = await supabase
      .from("votes")
      .select("*");

    if (!data) return;

    const map = {};
    data.forEach(v => {
      if (!map[v.target_id]) map[v.target_id] = {};
      if (!map[v.target_id][v.emoji]) map[v.target_id][v.emoji] = 0;
      map[v.target_id][v.emoji]++;
    });

    setVotes(map);

    const voters = [...new Set(data.map(d => d.voter_id))];
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
      .eq("voter_id", name)
      .limit(1);

    return data.length > 0;
  }

  async function submitVote() {
    if (Object.keys(selected).length !== PEOPLE.length - 1) {
      return alert("Vote em TODOS!");
    }

    if (!window.confirm("Enviar votos? NÃO poderá alterar depois.")) return;

    const arr = Object.entries(selected).map(([target, emoji]) => ({
      voter_id: currentUser,
      target_id: target,
      emoji
    }));

    await supabase.from("votes").insert(arr);
    fetchVotes();
    setStep("results");
  }

  // ================= UI =================

  if (step === "home") return (
    <div style={styles.container}>
      <h1>Queridômetro da Panela</h1>
      <p>📅 {todayFormatted}</p>
      <button onClick={()=>setStep("login")}>Responder</button>
      <button onClick={()=>setStep("results")}>Ver Resultados</button>
    </div>
  );

  if (step === "login") return (
    <div style={styles.container}>
      <h2>Identificação</h2>
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
        if (!password) return alert("Digite senha");
        await createUser(currentUser, password);
        setStep("vote");
      }}>
        Salvar
      </button>
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
    if (voteCount < MIN_VOTERS_TO_SHOW) {
      return (
        <div style={styles.container}>
          <h2>Resultados bloqueados</h2>
          <p>{voteCount}/{MIN_VOTERS_TO_SHOW} votantes</p>
          <button onClick={()=>setStep("home")}>Voltar</button>
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <h2>Resultados</h2>
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
        <button onClick={()=>setStep("home")}>Voltar</button>
      </div>
    );
  }
}

const styles = {
  container:{ maxWidth:700, margin:"40px auto", textAlign:"center" },
  card:{ background:"#111", color:"#fff", padding:12, margin:10, borderRadius:10 }
};

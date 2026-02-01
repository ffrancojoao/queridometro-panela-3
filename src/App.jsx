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
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(getTodayBR());

  function getTodayBR() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  }

  useEffect(() => {
    loadDays();
    fetchVotes();
  }, [selectedDay]);

  // ================= SUPABASE =================

  async function loadDays() {
    const { data } = await supabase.from("votes").select("day").order("day", { ascending: false });
    if (!data) return;
    const unique = [...new Set(data.map(d => d.day))];
    setDays(unique);
  }

  async function fetchVotes() {
    const { data } = await supabase.from("votes").select("*").eq("day", selectedDay);
    if (!data) return;

    const map = {};
    data.forEach(v => {
      if (!map[v.target]) map[v.target] = {};
      if (!map[v.target][v.emoji]) map[v.target][v.emoji] = 0;
      map[v.target][v.emoji]++;
    });

    setVotes(map);
    setVoteCount([...new Set(data.map(d => d.voter))].length);
  }

  async function checkUser(name) {
    const { data } = await supabase.from("users").select("*").eq("name", name).single();
    return data;
  }

  async function createUser(name, pass) {
    await supabase.from("users").insert([{ name, password: pass }]);
  }

  async function verifyVoteToday(name) {
    const today = getTodayBR();
    const { data } = await supabase
      .from("votes")
      .select("id")
      .eq("voter", name)
      .eq("day", today)
      .limit(1);

    return data && data.length > 0;
  }

  async function submitVote() {
    if (Object.keys(selected).length !== PEOPLE.length - 1) {
      return alert("Vote em TODOS!");
    }

    if (!window.confirm("Confirma envio? NÃO poderá alterar depois.")) return;

    const today = getTodayBR();
    const arr = Object.entries(selected).map(([target, emoji]) => ({
      voter: currentUser,
      target,
      emoji,
      day: today
    }));

    await supabase.from("votes").insert(arr);
    fetchVotes();
    setStep("results");
  }

  // RESET SENHA VIA EDGE FUNCTION (SEGREDO NO SUPABASE)
  async function resetPassword() {
    const name = prompt("Nome da pessoa:");
    const newPass = prompt("Nova senha:");
    const secret = prompt("Código secreto ADMIN:");

    await fetch("https://SEU_PROJECT.supabase.co/functions/v1/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer SUA_ANON_KEY"
      },
      body: JSON.stringify({ name, newPassword: newPass, secret })
    });

    alert("Senha resetada!");
  }

  // ================= UI =================

  if (step === "home") return (
    <div style={styles.container}>
      <h1>Queridômetro da Panela</h1>
      <button onClick={() => setStep("login")}>Responder</button>
      <button onClick={() => setStep("results")}>Resultados</button>
      <button onClick={() => setStep("history")}>Histórico</button>
      <button onClick={resetPassword}>Resetar Senha (Admin)</button>
    </div>
  );

  if (step === "login") return (
    <div style={styles.container}>
      <h2>Identificação</h2>

      <select value={currentUser} onChange={e => setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p => <option key={p}>{p}</option>)}
      </select>

      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button onClick={async () => {
        const user = await checkUser(currentUser);
        if (!user) return setStep("register");
        if (user.password !== password) return alert("Senha incorreta");
        if (await verifyVoteToday(currentUser)) return alert("Você já votou hoje!");
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
        onChange={e => setPassword(e.target.value)}
      />
      <button onClick={async () => {
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
      <h2>Distribua os emojis</h2>

      {PEOPLE.filter(p => p !== currentUser).map(person => (
        <div key={person} style={styles.card}>
          <h3>{person}</h3>
          {EMOJIS.map(e => (
            <button
              key={e}
              style={{
                fontSize: 22,
                margin: 4,
                background: selected[person] === e ? "#22c55e" : "#333"
              }}
              onClick={() => setSelected({ ...selected, [person]: e })}
            >
              {e}
            </button>
          ))}
        </div>
      ))}

      <button onClick={submitVote}>Finalizar Voto</button>
    </div>
  );

  if (step === "results") {
    if (voteCount < MIN_VOTERS_TO_SHOW) {
      return (
        <div style={styles.container}>
          <h2>Resultados bloqueados</h2>
          <p>{voteCount}/{MIN_VOTERS_TO_SHOW} votantes</p>
          <button onClick={() => setStep("home")}>Voltar</button>
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <h2>Resultados ({selectedDay})</h2>

        {PEOPLE.map(p => (
          <div key={p} style={styles.card}>
            <h3>{p}</h3>
            {EMOJIS.map(e => (
              <span key={e} style={{ marginRight: 12 }}>
                {e} {votes[p]?.[e] || 0}
              </span>
            ))}
          </div>
        ))}

        <button onClick={() => setStep("home")}>Voltar</button>
      </div>
    );
  }

  if (step === "history") return (
    <div style={styles.container}>
      <h2>Histórico</h2>
      <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)}>
        {days.map(d => <option key={d}>{d}</option>)}
      </select>
      <button onClick={() => setStep("results")}>Ver</button>
      <button onClick={() => setStep("home")}>Voltar</button>
    </div>
  );
}

const styles = {
  container: { maxWidth: 700, margin: "40px auto", textAlign: "center", fontFamily: "sans-serif" },
  card: { background: "#111", color: "#fff", padding: 12, margin: 10, borderRadius: 10 }
};

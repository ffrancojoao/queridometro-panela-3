import React, { useState, useEffect } from "react";

// ================= CONFIG =================
const DEFAULT_PEOPLE = [
  "Adriano","Ander","Borda","Chico","Daniel","Diogo","Dru","Eric Aquiar","Fear","Felype",
  "Flausino","Giordano","Kazuhiro","Marcos","Mello","Paulo","Pelicano","Pepeu","Prince","Red",
  "Reinaldo","Rod. Rosa","Samuel","Smile","Tibor","Uekawa","Valbert","Victor"
].sort((a,b)=>a.localeCompare(b));

const EMOJIS = ["❤️","🤥","🤮","🐍","👜","💔","🍪","🪴","🎯","🍌","💣"];
const MIN_VOTERS = 5; // só libera resultados após 5 pessoas votarem
// =========================================

// Função para horário de Brasília
function getBrazilTodayKey() {
  const now = new Date();
  const offset = -3; // UTC-3 Brasília
  const brTime = new Date(now.getTime() + (offset - now.getTimezoneOffset()/60)*3600000);
  return brTime.toISOString().slice(0,10);
}

export default function App() {
  const [people] = useState(DEFAULT_PEOPLE);
  const [emojis] = useState(DEFAULT_EMOJIS);
  const [currentUser, setCurrentUser] = useState("");
  const [password, setPassword] = useState("");
  const [votes, setVotes] = useState({}); // { pessoa: {emoji: count} }
  const [users, setUsers] = useState({}); // { name: { password } }
  const [votedToday, setVotedToday] = useState({}); // { name: true }
  const [step, setStep] = useState("home"); // home | login | register | vote | results
  const [selected, setSelected] = useState({}); // { person: emoji }

  const todayKey = getBrazilTodayKey();
  const todayFormatted = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  });

  // ---------------- DAILY RESET + LOCAL STORAGE ----------------
  useEffect(() => {
    const storedDate = localStorage.getItem("queridometro_date");
    if (storedDate !== todayKey) {
      localStorage.setItem("queridometro_date", todayKey);
      localStorage.removeItem("queridometro_votes");
      localStorage.removeItem("queridometro_voted");
    }

    setVotes(JSON.parse(localStorage.getItem("queridometro_votes") || "{}"));
    setUsers(JSON.parse(localStorage.getItem("queridometro_users") || "{}"));
    setVotedToday(JSON.parse(localStorage.getItem("queridometro_voted") || "{}"));
    setSelected({});
  }, []);

  // ---------------- HELPERS ----------------
  const saveVotes = (newVotes) => {
    setVotes(newVotes);
    localStorage.setItem("queridometro_votes", JSON.stringify(newVotes));
  };

  const saveUsers = (newUsers) => {
    setUsers(newUsers);
    localStorage.setItem("queridometro_users", JSON.stringify(newUsers));
  };

  const saveVoted = (newVoted) => {
    setVotedToday(newVoted);
    localStorage.setItem("queridometro_voted", JSON.stringify(newVoted));
  };

  const handleVote = (person, emoji) => {
    const newVotes = { ...votes };
    const prevEmoji = selected[person];

    // remove voto anterior
    if (prevEmoji && newVotes[person]?.[prevEmoji]) {
      newVotes[person][prevEmoji] = Math.max(0, newVotes[person][prevEmoji]-1);
    }

    // adiciona novo voto
    if (!newVotes[person]) newVotes[person] = {};
    if (!newVotes[person][emoji]) newVotes[person][emoji] = 0;
    newVotes[person][emoji] += 1;

    saveVotes(newVotes);
    setSelected({...selected, [person]: emoji});
  };

  const finishVoting = () => {
    const targets = people.filter(p => p !== currentUser);
    const missing = targets.filter(p => !selected[p]);

    if (missing.length>0) {
      return alert("Você precisa dar um emoji para TODOS. Faltam: " + missing.join(", "));
    }

    if (!window.confirm("Tem certeza? Depois de enviar, você NÃO poderá editar seus votos hoje.")) return;

    const newVoted = {...votedToday, [currentUser]: true};
    saveVoted(newVoted);
    setStep("results");
  };

  const totalVoters = Object.keys(votedToday).length;

  // ---------------- UI ----------------
  if(step==="home") return (
    <div style={styles.container}>
      <h1>Queridômetro da Panela</h1>
      <p style={{opacity:0.7}}>📅 {todayFormatted}</p>
      <p>Responde 1x por dia. Reset automático diário no horário de Brasília.</p>
      <button style={styles.mainBtn} onClick={()=>setStep("login")}>Responder</button>
      <button style={styles.mainBtn} onClick={()=>setStep("results")}>Ver Resultados</button>
    </div>
  );

  if(step==="login") return (
    <div style={styles.container}>
      <h1>Identificação</h1>
      <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {people.map(p=><option key={p}>{p}</option>)}
      </select>
      <input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)}/>
      <button disabled={!currentUser} onClick={()=>{
        const user = users[currentUser];
        if(!user || !user.password) setStep("register"); // senha resetada ou novo usuário
        else if(user.password === password){
          if(votedToday[currentUser]) alert("Você já respondeu hoje.");
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
      <button onClick={()=>{
        if(!password) return alert("Defina uma senha");
        const newUsers = {...users, [currentUser]: { password }};
        saveUsers(newUsers);
        setSelected({});
        setStep("vote");
      }}>Salvar e Entrar</button>
    </div>
  );

  if(step==="vote") {
    const targets = people.filter(p => p!==currentUser);
    const completed = targets.filter(p=>selected[p]).length;

    return (
      <div style={styles.container}>
        <h1>Distribua seus emojis</h1>
        <p>Votando como <b>{currentUser}</b> (anônimo)</p>
        <p>Progresso: {completed}/{targets.length}</p>

        {targets.map(person=>(
          <div key={person} style={styles.card}>
            <h3>{person}</h3>
            <div style={styles.emojiRow}>
              {emojis.map(e=>(
                <button
                  key={e}
                  style={{
                    ...styles.emojiBtn,
                    background: selected[person]===e?"#22c55e":"#222",
                    transform:selected[person]===e?"scale(1.2)":"scale(1)",
                    boxShadow:selected[person]===e?"0 0 12px #22c55e":"none"
                  }}
                  onClick={()=>handleVote(person,e)}
                >{e}</button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={finishVoting}
          disabled={completed!==targets.length}
          style={{opacity: completed!==targets.length?0.5:1}}
        >Finalizar Voto</button>
      </div>
    );
  }

  if(step==="results") {
    const canShowResults = totalVoters >= MIN_VOTERS_TO_SHOW;

    return (
      <div style={styles.container}>
        <h1>Resultados do Queridômetro</h1>
        <p style={{opacity:0.7}}>📅 {todayFormatted}</p>
        <p>👥 Pessoas que já votaram hoje: {totalVoters}</p>

        {!canShowResults && (
          <div style={{background:"#111", padding:16, borderRadius:12, color:"#fff"}}>
            <b>Resultados bloqueados para preservar o anonimato.</b>
            <p>Serão liberados quando {MIN_VOTERS_TO_SHOW} pessoas votarem.</p>
          </div>
        )}

        {canShowResults && people.map(person=>(
          <div
            key={person}
            style={{
              ...styles.card,
              border: person===currentUser?"2px solid #22c55e":"none",
              background: person===currentUser?"#0f172a":"#111"
            }}
          >
            <h3>{person}{person===currentUser?" (você)":""}</h3>
            <div>
              {emojis.map(e=>(
                <span key={e} style={{marginRight:12}}>{e} {votes[person]?.[e]||0}</span>
              ))}
            </div>
          </div>
        ))}

        <button onClick={()=>setStep("home")}>Voltar</button>
      </div>
    );
  }

  return null;
}

// ---------------- STYLES ----------------
const styles = {
  container: { maxWidth:700, margin:"40px auto", fontFamily:"sans-serif", textAlign:"center" },
  card: { background:"#111", color:"#fff", padding:15, marginBottom:12, borderRadius:12 },
  emojiRow: { display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" },
  emojiBtn: { fontSize:26, padding:10, borderRadius:12, cursor:"pointer", border:"none", transition:"0.15s all" },
  mainBtn: { fontSize:18, padding:"10px 20px", margin:10, borderRadius:10, border:"none", cursor:"pointer" }
};

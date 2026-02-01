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
  const [newPass, setNewPass] = useState("");
  const [selected, setSelected] = useState({});
  const [votes, setVotes] = useState({});
  const [voteCount, setVoteCount] = useState(0);

  const [yesterdayVotes, setYesterdayVotes] = useState({});
  const [yesterdayTop, setYesterdayTop] = useState({});
  const [todayFormatted, setTodayFormatted] = useState("");
  const [yesterdayFormatted, setYesterdayFormatted] = useState("");

  // 🇧🇷 Datas
  const todayBR = new Date().toLocaleDateString("en-CA", { timeZone:"America/Sao_Paulo" });
  const yesterdayBR = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone:"America/Sao_Paulo" });

  useEffect(() => {
    const now = new Date();
    const y = new Date(Date.now() - 86400000);

    setTodayFormatted(now.toLocaleDateString("pt-BR",{ timeZone:"America/Sao_Paulo" }));
    setYesterdayFormatted(y.toLocaleDateString("pt-BR",{ timeZone:"America/Sao_Paulo" }));

    fetchTodayVotes();
    fetchYesterdayVotes();
  }, []);

  // ================= SUPABASE =================

  async function fetchTodayVotes() {
    const { data } = await supabase.from("votes").select("*").eq("day", todayBR);
    if (!data) return;

    const map = {};
    data.forEach(v=>{
      if(!map[v.target]) map[v.target]={};
      map[v.target][v.emoji]=(map[v.target][v.emoji]||0)+1;
    });

    setVotes(map);
    setVoteCount([...new Set(data.map(d=>d.voter))].length);
  }

  async function fetchYesterdayVotes() {
    const { data } = await supabase.from("votes").select("*").eq("day", yesterdayBR);
    if (!data) return;

    const map = {};
    const top = {};

    data.forEach(v=>{
      if(!map[v.target]) map[v.target]={};
      map[v.target][v.emoji]=(map[v.target][v.emoji]||0)+1;

      if(!top[v.emoji]) top[v.emoji]={};
      top[v.emoji][v.target]=(top[v.emoji][v.target]||0)+1;
    });

    // calcula TOP por emoji
    const topResult = {};
    for(const emoji of EMOJIS){
      const entries = Object.entries(top[emoji]||{}).sort((a,b)=>b[1]-a[1]);
      if(entries.length){
        const max = entries[0][1];
        topResult[emoji] = entries.filter(e=>e[1]===max);
      }
    }

    setYesterdayVotes(map);
    setYesterdayTop(topResult);
  }

  async function checkUser(name) {
    const { data } = await supabase.from("users").select("*").eq("name", name).single();
    return data;
  }

  async function createUser(name, pass) {
    await supabase.from("users").insert([{ name, password: pass }]);
  }

  async function verifyVoteToday(name) {
    const { data } = await supabase.from("votes")
      .select("id").eq("voter", name).eq("day", todayBR).limit(1);
    return data && data.length > 0;
  }

  async function submitVote() {
    if (Object.keys(selected).length !== PEOPLE.length - 1)
      return alert("Vote em TODOS!");

    if (!window.confirm("Confirmar envio? NÃO poderá alterar.")) return;

    const arr = Object.entries(selected).map(([target, emoji])=>({
      voter: currentUser,
      target,
      emoji,
      day: todayBR
    }));

    await supabase.from("votes").insert(arr);
    await fetchTodayVotes();
    setStep("results");
  }

  async function resetPassword() {
    if(!currentUser || !resetCode || !newPass) return alert("Preencha tudo!");

    const { error } = await supabase.rpc("reset_user_password", {
      p_name: currentUser,
      p_secret: resetCode,
      p_new_password: newPass
    });

    if(error) return alert("Código secreto errado!");
    alert("Senha resetada!");
    setStep("login");
  }

  // ================= UI COMPONENTS =================

  function ProgressBar({ value, max }) {
    const percent = Math.round((value / max) * 100);
    return (
      <div style={styles.progressWrap}>
        <div style={{...styles.progressBar, width: percent+"%"}}>
          {percent}%
        </div>
      </div>
    );
  }

  // ================= HOME =================
  if (step==="home") return (
    <div style={styles.container}>
      <h1 style={styles.title}>Queridômetro 🔥</h1>
      <p style={styles.subtitle}>Hoje: {todayFormatted}</p>

      <button style={styles.mainBtn} onClick={()=>setStep("login")}>Responder</button>
      <button style={styles.secondaryBtn} onClick={()=>setStep("results")}>Resultados Hoje</button>
      <button style={styles.secondaryBtn} onClick={()=>setStep("history")}>Histórico Ontem</button>
      <button style={styles.secondaryBtn} onClick={()=>setStep("reset")}>Esqueci Senha</button>
    </div>
  );

  // ================= LOGIN =================
  if (step==="login") return (
    <div style={styles.container}>
      <h2>Entrar</h2>

      <select style={styles.input} value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>

      <input style={styles.input} type="password" placeholder="Senha"
        value={password} onChange={e=>setPassword(e.target.value)} />

      <button style={styles.mainBtn} onClick={async()=>{
        const user = await checkUser(currentUser);
        if(!user) return setStep("register");
        if(user.password!==password) return alert("Senha errada");
        if(await verifyVoteToday(currentUser)) return alert("Já votou hoje!");
        setStep("vote");
      }}>Entrar</button>
    </div>
  );

  // ================= REGISTER =================
  if (step==="register") return (
    <div style={styles.container}>
      <h2>Criar Senha</h2>
      <input style={styles.input} type="password" placeholder="Nova senha"
        value={password} onChange={e=>setPassword(e.target.value)} />
      <button style={styles.mainBtn} onClick={async()=>{
        await createUser(currentUser, password);
        setStep("vote");
      }}>Salvar</button>
    </div>
  );

  // ================= RESET PASSWORD =================
  if (step==="reset") return (
    <div style={styles.container}>
      <h2>Resetar Senha</h2>

      <select style={styles.input} value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>

      <input style={styles.input} placeholder="Código secreto do ADM"
        value={resetCode} onChange={e=>setResetCode(e.target.value)} />

      <input style={styles.input} type="password" placeholder="Nova senha"
        value={newPass} onChange={e=>setNewPass(e.target.value)} />

      <button style={styles.mainBtn} onClick={resetPassword}>Resetar</button>
    </div>
  );

  // ================= VOTING =================
  if (step==="vote") {
    const progress = Object.keys(selected).length;
    const total = PEOPLE.length-1;

    return (
      <div style={styles.container}>
        <h2>Distribua os emojis</h2>
        <p>{progress}/{total}</p>
        <ProgressBar value={progress} max={total} />

        {PEOPLE.filter(p=>p!==currentUser).map(person=>(
          <div key={person} style={styles.card}>
            <h3>{person}</h3>
            <div style={styles.emojiRow}>
              {EMOJIS.map(e=>(
                <button key={e}
                  style={{...styles.emojiBtn,
                    background:selected[person]===e?"#22c55e":"#222"}}
                  onClick={()=>setSelected({...selected,[person]:e})}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button disabled={progress!==total}
          style={{...styles.mainBtn,opacity:progress===total?1:0.5}}
          onClick={submitVote}>
          Enviar
        </button>
      </div>
    );
  }

  // ================= RESULTS TODAY =================
  if (step==="results") {
    if (voteCount<MIN_VOTERS_TO_SHOW) return (
      <div style={styles.container}>
        <h2>Resultados bloqueados</h2>
        <p>{voteCount}/{MIN_VOTERS_TO_SHOW} votantes</p>
        <ProgressBar value={voteCount} max={MIN_VOTERS_TO_SHOW} />
      </div>
    );

    return (
      <div style={styles.container}>
        <h2>Resultados Hoje</h2>
        <p>📅 {todayFormatted}</p>

        {PEOPLE.map(p=>(
          <div key={p} style={styles.card}>
            <h3>{p}</h3>
            {EMOJIS.map(e=><span key={e}>{e} {votes[p]?.[e]||0} </span>)}
          </div>
        ))}
      </div>
    );
  }

  // ================= HISTORY YESTERDAY =================
  if (step==="history") return (
    <div style={styles.container}>
      <h2>Histórico de Ontem</h2>
      <p>📅 {yesterdayFormatted}</p>

      <h3>🏆 TOP por Emoji</h3>
      {Object.entries(yesterdayTop).map(([emoji, list])=>(
        <div key={emoji} style={styles.card}>
          <h4>{emoji}</h4>
          {list.map(([name, count])=>
            <p key={name}>{name} ({count})</p>
          )}
        </div>
      ))}

      <h3>📊 Resultado Geral</h3>
      {PEOPLE.map(p=>(
        <div key={p} style={styles.card}>
          <h4>{p}</h4>
          {EMOJIS.map(e=><span key={e}>{e} {yesterdayVotes[p]?.[e]||0} </span>)}
        </div>
      ))}
    </div>
  );
}

// ================= STYLE =================
const styles = {
  container:{ maxWidth:760, margin:"40px auto", color:"#fff", fontFamily:"Inter, sans-serif" },
  title:{ fontSize:36, fontWeight:800 },
  subtitle:{ opacity:.7 },
  card:{ background:"#111", padding:16, borderRadius:14, marginBottom:12, boxShadow:"0 0 15px #000" },
  emojiRow:{ display:"flex", flexWrap:"wrap", gap:10 },
  emojiBtn:{ fontSize:26, padding:10, borderRadius:12, border:"none", cursor:"pointer" },
  input:{ padding:12, borderRadius:12, border:"none", margin:6, width:"100%" },
  mainBtn:{ padding:"12px 22px", borderRadius:14, border:"none", background:"#22c55e", color:"#000", fontSize:18, cursor:"pointer", marginTop:10 },
  secondaryBtn:{ padding:"10px 18px", borderRadius:12, border:"1px solid #22c55e", background:"transparent", color:"#22c55e", margin:6, cursor:"pointer" },
  progressWrap:{ width:"100%", background:"#222", borderRadius:10 },
  progressBar:{ background:"#22c55e", padding:6, borderRadius:10, color:"#000", fontWeight:"bold" }
};


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
  const [yesterdayFormatted, setYesterdayFormatted] = useState("");
  const [yesterdayVotes, setYesterdayVotes] = useState({});

  const todayBR = new Date().toLocaleDateString("en-CA", { timeZone:"America/Sao_Paulo" });
  const yesterdayBR = new Date(Date.now()-86400000).toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});

  useEffect(()=>{
    const now = new Date();
    const yesterday = new Date(Date.now()-86400000);

    setTodayFormatted(now.toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo",weekday:"long",day:"2-digit",month:"long",year:"numeric"}));
    setYesterdayFormatted(yesterday.toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo",weekday:"long",day:"2-digit",month:"long",year:"numeric"}));

    fetchVotesToday();
    fetchVotesYesterday();
  },[]);

  // ================= SUPABASE =================

  async function fetchVotesToday(){
    const {data} = await supabase.from("votes").select("*").eq("day", todayBR);
    if(!data) return;

    const map = {};
    data.forEach(v=>{
      if(!map[v.target]) map[v.target]={};
      if(!map[v.target][v.emoji]) map[v.target][v.emoji]=0;
      map[v.target][v.emoji]++;
    });
    setVotes(map);
    setVoteCount([...new Set(data.map(d=>d.voter))].length);
  }

  async function fetchVotesYesterday(){
    const {data} = await supabase.from("votes").select("*").eq("day", yesterdayBR);
    if(!data) return;

    const map = {};
    data.forEach(v=>{
      if(!map[v.target]) map[v.target]={};
      if(!map[v.target][v.emoji]) map[v.target][v.emoji]=0;
      map[v.target][v.emoji]++;
    });
    setYesterdayVotes(map);
  }

  async function checkUser(name){
    const {data} = await supabase.from("users").select("*").eq("name",name).single();
    return data;
  }

  async function createUser(name, pass){
    await supabase.from("users").insert([{name,password:pass}]);
  }

  async function verifyVoteToday(name){
    const {data} = await supabase.from("votes").select("id").eq("voter",name).eq("day",todayBR).limit(1);
    return data && data.length>0;
  }

  async function submitVote(){
    if(Object.keys(selected).length !== PEOPLE.length-1)
      return alert("Vote em TODOS para enviar.");

    if(!window.confirm("Enviar votos? Não poderá editar hoje.")) return;

    const arr = Object.entries(selected).map(([target,emoji])=>({
      voter:currentUser, target, emoji, day:todayBR
    }));

    await supabase.from("votes").insert(arr);
    await fetchVotesToday();
    setStep("results");
  }

  // ================= COMPONENTS =================

  function BackButton(){
    return <button style={styles.backBtn} onClick={()=>{
      if(step==="vote" && Object.keys(selected).length>0){
        if(!window.confirm("Se voltar, você perderá seus votos selecionados.")) return;
      }
      setStep("home");
    }}>⬅ Voltar</button>;
  }

  function ProgressBar({value,max}){
    const percent=Math.round((value/max)*100);
    return (
      <div style={styles.progressBg}>
        <div style={{...styles.progressFill,width:percent+"%"}}>{percent}%</div>
      </div>
    );
  }

  // ================= HOME =================

  if(step==="home") return (
    <div style={styles.container}>
      <h1 style={styles.title}>Queridômetro</h1>
      <p style={styles.subtitle}>{todayFormatted}</p>

      <button style={styles.primaryBtn} onClick={()=>setStep("login")}>Responder</button>
      <button style={styles.secondaryBtn} onClick={()=>setStep("results")}>Resultados</button>
      <button style={styles.secondaryBtn} onClick={()=>setStep("history")}>Resultados (anterior)</button>
    </div>
  );

  // ================= LOGIN =================

  if(step==="login") return (
    <div style={styles.container}>
      <BackButton/>
      <h2>Identificação</h2>

      <select style={styles.input} value={currentUser} onChange={e=>setCurrentUser(e.target.value)}>
        <option value="">Selecione seu nome</option>
        {PEOPLE.map(p=><option key={p}>{p}</option>)}
      </select>

      <input style={styles.input} type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)}/>

      <button style={styles.primaryBtn} onClick={async()=>{
        const user = await checkUser(currentUser);
        if(!user) return setStep("register");
        if(user.password!==password) return alert("Senha incorreta");
        if(await verifyVoteToday(currentUser)) return alert("Você já votou hoje");
        setStep("vote");
      }}>Entrar</button>
    </div>
  );

  // ================= REGISTER =================

  if(step==="register") return (
    <div style={styles.container}>
      <BackButton/>
      <h2>Criar senha</h2>
      <input style={styles.input} type="password" placeholder="Nova senha" value={password} onChange={e=>setPassword(e.target.value)}/>
      <button style={styles.primaryBtn} onClick={async()=>{
        if(!password) return alert("Digite senha");
        await createUser(currentUser,password);
        setStep("vote");
      }}>Salvar e Votar</button>
    </div>
  );

  // ================= VOTE =================

  if(step==="vote"){
    const progress = Object.keys(selected).length;
    const total = PEOPLE.length-1;

    return (
      <div style={styles.container}>
        <BackButton/>
        <h2>Distribua seus emojis</h2>
        <p>{progress}/{total} votados</p>
        <ProgressBar value={progress} max={total}/>

        {PEOPLE.filter(p=>p!==currentUser).map(person=>(
          <div key={person} style={styles.card}>
            <h3>{person}</h3>
            <div style={styles.emojiRow}>
              {EMOJIS.map(e=>(
                <button key={e} style={{
                  ...styles.emojiBtn,
                  background:selected[person]===e?"#22c55e":"#222",
                  transform:selected[person]===e?"scale(1.15)":"scale(1)"
                }} onClick={()=>setSelected({...selected,[person]:e})}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button disabled={progress!==total} style={{
          ...styles.primaryBtn,
          background:progress===total?"#22c55e":"#555",
          color:"#000"
        }} onClick={submitVote}>Confirmar votos</button>
      </div>
    );
  }

  // ================= RESULTS TODAY =================

  if(step==="results") return (
    <div style={styles.container}>
      <BackButton/>
      <h2>Resultados</h2>
      <p>{todayFormatted}</p>
      <p>👥 {voteCount} votantes</p>

      {voteCount < MIN_VOTERS_TO_SHOW ? (
        <>
          <p>Resultados bloqueados até {MIN_VOTERS_TO_SHOW} votantes</p>
          <ProgressBar value={voteCount} max={MIN_VOTERS_TO_SHOW}/>
        </>
      ) : (
        PEOPLE.map(p=>(
          <div key={p} style={styles.card}>
            <b>{p}</b><br/>
            {EMOJIS.map(e=><span key={e} style={{marginRight:8}}>{e} {votes[p]?.[e]||0}</span>)}
          </div>
        ))
      )}
    </div>
  );

  // ================= HISTORY =================

  if(step==="history"){
    const topEmoji={};
    EMOJIS.forEach(e=>{
      let max=0,name="";
      PEOPLE.forEach(p=>{
        const val=yesterdayVotes[p]?.[e]||0;
        if(val>max){max=val;name=p;}
      });
      if(max>0) topEmoji[e]={name,max};
    });

    return (
      <div style={styles.container}>
        <BackButton/>
        <h2>Resultados (anterior)</h2>
        <p>{yesterdayFormatted}</p>

        <h3>Top por Emoji</h3>
        <table style={styles.table}>
          <tbody>
            {Object.entries(topEmoji).map(([e,v])=>(
              <tr key={e}><td>{e}</td><td>{v.name}</td><td>{v.max}</td></tr>
            ))}
          </tbody>
        </table>

        <h3>Resultado Geral</h3>
        {PEOPLE.map(p=>(
          <div key={p} style={styles.card}>
            <b>{p}</b><br/>
            {EMOJIS.map(e=><span key={e} style={{marginRight:8}}>{e} {yesterdayVotes[p]?.[e]||0}</span>)}
          </div>
        ))}
      </div>
    );
  }
}

// ================= STYLE =================

const styles = {
  container:{maxWidth:800,margin:"30px auto",color:"#fff",fontFamily:"Inter",textAlign:"center"},
  title:{fontSize:38,fontWeight:"800"},
  subtitle:{opacity:0.7},
  card:{background:"rgba(255,255,255,0.05)",padding:14,borderRadius:14,marginBottom:10,backdropFilter:"blur(6px)"},
  emojiRow:{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"},
  emojiBtn:{fontSize:26,padding:10,borderRadius:12,border:"none",cursor:"pointer",transition:"0.15s"},
  input:{padding:12,borderRadius:10,border:"none",margin:8,width:"100%"},
  primaryBtn:{padding:"12px 24px",borderRadius:14,border:"none",background:"#22c55e",fontWeight:"bold",cursor:"pointer",margin:8},
  secondaryBtn:{padding:"10px 20px",borderRadius:14,border:"1px solid #22c55e",background:"transparent",color:"#22c55e",cursor:"pointer",margin:8},
  backBtn:{marginBottom:10,background:"transparent",border:"none",color:"#aaa",cursor:"pointer"},
  progressBg:{background:"#222",borderRadius:10,margin:"10px 0"},
  progressFill:{background:"#22c55e",padding:6,borderRadius:10,fontWeight:"bold",color:"#000"},
  table:{width:"100%",borderCollapse:"collapse",marginBottom:20}
};

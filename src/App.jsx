import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

// ================= CONFIG =================
const DEFAULT_PEOPLE = [
  'Adriano',
  'Ander',
  'Borda',
  'Chico',
  'Daniel',
  'Diogo',
  'Dru',
  'Eric Aquiar',
  'Fear',
  'Felype',
  'Flausino',
  'Giordano',
  'Kazuhiro',
  'Marcos',
  'Mello',
  'Paulo',
  'Pelicano',
  'Pepeu',
  'Prince',
  'Red',
  'Reinaldo',
  'Rod. Rosa',
  'Samuel',
  'Smile',
  'Tibor',
  'Uekawa',
  'Valbert',
  'Victor',
].sort((a, b) => a.localeCompare(b));

const DEFAULT_EMOJIS = ['❤️', '🤥', '🤮', '🐍', '👜', '💔', '🪴', '🎯'];
// =========================================

export default function App() {
  const [people] = useState(DEFAULT_PEOPLE);
  const [emojis] = useState(DEFAULT_EMOJIS);
  const [currentUser, setCurrentUser] = useState('');
  const [password, setPassword] = useState('');
  const [votes, setVotes] = useState([]);
  const [step, setStep] = useState('home'); // home | vote | results
  const [selected, setSelected] = useState({});

  const today = new Date().toISOString().slice(0, 10);

  // Load votes from Supabase
  useEffect(() => {
    fetchVotes();
  }, []);

  async function fetchVotes() {
    const { data } = await supabase.from('votes').select('*').eq('day', today);
    setVotes(data || []);
  }

  function handleSelect(person, emoji) {
    setSelected({ ...selected, [person]: emoji });
  }

  function allSelected() {
    return people.filter((p) => p !== currentUser).every((p) => selected[p]);
  }

  async function submitVotes() {
    if (!allSelected()) return alert('Você precisa votar em todos!');
    if (!window.confirm('Confirma enviar os votos? Não poderá alterar depois!'))
      return;

    const toInsert = Object.entries(selected).map(([target, emoji]) => ({
      voter: currentUser,
      target,
      emoji,
      day: today,
    }));

    const { error } = await supabase.from('votes').insert(toInsert);
    if (error) return alert('Erro ao enviar votos: ' + error.message);

    alert('Votos enviados!');
    fetchVotes();
    setStep('results');
  }

  // Contar votos por pessoa
  function countVotes(person) {
    return emojis.reduce((acc, e) => {
      return {
        ...acc,
        [e]: votes.filter((v) => v.target === person && v.emoji === e).length,
      };
    }, {});
  }

  // HOME
  if (step === 'home') {
    return (
      <div
        style={{
          maxWidth: 700,
          margin: '40px auto',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <h1>Queridômetro da Panela</h1>
        <p>📅 {new Date().toLocaleDateString('pt-BR')}</p>
        <select
          value={currentUser}
          onChange={(e) => setCurrentUser(e.target.value)}
        >
          <option value="">Selecione seu nome</option>
          {people.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <div style={{ marginTop: 20 }}>
          <button disabled={!currentUser} onClick={() => setStep('vote')}>
            Responder
          </button>
          <button onClick={() => setStep('results')}>Ver Resultados</button>
        </div>
      </div>
    );
  }

  // VOTE
  if (step === 'vote') {
    return (
      <div
        style={{
          maxWidth: 700,
          margin: '40px auto',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <h1>Distribua seus emojis</h1>
        <p>
          Votando como <b>{currentUser}</b> (anônimo)
        </p>
        {people
          .filter((p) => p !== currentUser)
          .map((person) => (
            <div
              key={person}
              style={{
                background: '#111',
                color: '#fff',
                padding: 15,
                marginBottom: 12,
                borderRadius: 12,
              }}
            >
              <h3>{person}</h3>
              <div
                style={{ display: 'flex', gap: 8, justifyContent: 'center' }}
              >
                {emojis.map((e) => (
                  <button
                    key={e}
                    style={{
                      fontSize: 26,
                      padding: 10,
                      borderRadius: 12,
                      border: 'none',
                      cursor: 'pointer',
                      transform:
                        selected[person] === e ? 'scale(1.2)' : 'scale(1)',
                      boxShadow:
                        selected[person] === e ? '0 0 12px #22c55e' : 'none',
                    }}
                    onClick={() => handleSelect(person, e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        <button disabled={!allSelected()} onClick={submitVotes}>
          Finalizar Voto
        </button>
      </div>
    );
  }

  // RESULTS
  if (step === 'results') {
    return (
      <div
        style={{
          maxWidth: 700,
          margin: '40px auto',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <h1>Resultados do Queridômetro</h1>
        <p>📅 {new Date().toLocaleDateString('pt-BR')}</p>
        {people.map((person) => {
          const counts = countVotes(person);
          const highlight =
            person === currentUser
              ? { background: '#22c55e', color: '#000' }
              : {};
          return (
            <div
              key={person}
              style={{
                background: '#111',
                color: '#fff',
                padding: 15,
                marginBottom: 12,
                borderRadius: 12,
                ...highlight,
              }}
            >
              <h3>{person}</h3>
              <div>
                {emojis.map((e) => (
                  <span key={e} style={{ marginRight: 12 }}>
                    {e} {counts[e]}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        <button onClick={() => setStep('home')}>Voltar</button>
      </div>
    );
  }

  return null;
}

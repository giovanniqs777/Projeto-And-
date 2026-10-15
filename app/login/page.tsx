"use client";
import { useState } from 'react';
import { Milk, Lock } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setError(error.message.includes('Invalid login credentials') ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar. Tente novamente.');
        return;
      }
      window.location.assign('/');
    } catch {
      setError('Não foi possível entrar. Verifique sua conexão e tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="mark"><Milk size={24} /></div>
          <div>Controle leitaria</div>
        </div>
        <div className="private"><span>Uso interno</span></div>
      </header>
      <main>
        <div className="heading">
          <div>
            <p className="eyebrow">ÁREA RESTRITA</p>
            <h1>Entrar</h1>
            <p className="muted">Acesse com o e-mail e a senha cadastrados.</p>
          </div>
        </div>
        <section className="panel" style={{ maxWidth: 460 }}>
          {error ? <div className="error" role="alert">{error}</div> : null}
          <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
            <label className="field">
              <span>E-mail</span>
              <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
            </label>
            <label className="field">
              <span>Senha</span>
              <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
            </label>
            <button className="primary" disabled={busy} style={{ width: '100%' }}>
              <Lock size={16} /> {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </section>
        <footer><Milk size={16} /> Produção, reprodução e saúde acompanhadas por animal.</footer>
      </main>
    </>
  );
}

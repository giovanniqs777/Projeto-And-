"use client";
import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
type UserRow = { id: string; email: string; createdAt: string };
export function UsersDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
 const [users, setUsers] = useState<UserRow[]>([]), [currentUserId, setCurrentUserId] = useState(''), [loading, setLoading] = useState(true), [error, setError] = useState('');
 const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [busy, setBusy] = useState(false);
 const [deletion, setDeletion] = useState<UserRow | null>(null);
 const load = useCallback(async () => {
  try { const r = await fetch('/api/users', { cache: 'no-store' }); const j = await r.json() as { users: UserRow[]; currentUserId: string; error?: string }; if (!r.ok) throw Error(j.error || 'Não foi possível carregar os usuários.'); setUsers(j.users); setCurrentUserId(j.currentUserId); setError(''); }
  catch (e) { setError((e as Error).message); } finally { setLoading(false); }
 }, []);
 useEffect(() => { if (open) { setLoading(true); load(); } }, [open, load]);
 async function createUser(e: FormEvent) {
  e.preventDefault(); if (busy) return;
  if (password.length < 6) { toast.error('A senha precisa ter pelo menos 6 caracteres.'); return; }
  if (password !== confirmation) { toast.error('As senhas não coincidem.'); return; }
  setBusy(true);
  try { const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'create-user', data: { email, password } }) }); const j = await r.json() as { error?: string }; if (!r.ok) throw Error(j.error || 'Não foi possível criar a conta.'); toast.success('Conta criada.'); setEmail(''); setPassword(''); setConfirmation(''); await load(); }
  catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
 }
 async function removeUser() {
  if (!deletion || busy) return; setBusy(true);
  try { const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'delete-user', data: { id: deletion.id } }) }); const j = await r.json() as { error?: string }; if (!r.ok) throw Error(j.error || 'Não foi possível remover o acesso.'); toast.success('Acesso removido.'); setDeletion(null); await load(); }
  catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
 }
 return <>
 <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="formdialog"><DialogTitle>Usuários com acesso</DialogTitle><DialogDescription>Crie um acesso para cada pessoa que for usar o sistema. Não existe cadastro público: só quem já está logado pode adicionar alguém aqui.</DialogDescription>
  {error && <div className="error" role="alert">{error}</div>}
  <form onSubmit={createUser}><div className="formgrid">
   <label className="field"><span>E-mail</span><input type="email" required maxLength={200} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></label>
   <label className="field"><span>Senha</span><input type="password" required minLength={6} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>
   <label className="field"><span>Confirmar senha</span><input type="password" required minLength={6} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} /></label>
  </div><div className="formactions"><button className="primary" disabled={busy}><UserPlus size={16} /> {busy ? 'Criando…' : 'Criar acesso'}</button></div></form>
  <div className="productionfields">
   <h3>Quem já tem acesso</h3>
   {loading ? <p className="emptyline">Carregando…</p> : !users.length ? <p className="emptyline">Nenhum usuário encontrado.</p> : users.map(u => <div className="record" key={u.id}><div><strong>{u.email}</strong>{u.id === currentUserId && <p>Você</p>}</div><div className="recordactions">{u.id !== currentUserId && <button className="deletebutton" onClick={() => setDeletion(u)} aria-label={`Remover acesso de ${u.email}`}><Trash2 size={16} /> Remover</button>}</div></div>)}
  </div>
 </DialogContent></Dialog>
 <AlertDialog open={!!deletion} onOpenChange={o => { if (!o && !busy) setDeletion(null); }}><AlertDialogContent><AlertDialogTitle>Remover acesso?</AlertDialogTitle><AlertDialogDescription>{deletion?.email} não vai conseguir mais entrar no sistema.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); removeUser(); }}>{busy ? 'Removendo…' : 'Remover acesso'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}

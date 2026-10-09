"use client";
import {useState,useEffect,useCallback,type FormEvent,type InputHTMLAttributes} from 'react';
import {Plus,Tag,ChevronLeft,Search,Trash2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AnimalPhoto,PhotoEditor,defaultFrame,type PhotoFrame} from '@/components/animal-photo';
import type {Calf} from '@/lib/calves';
import {toast} from 'sonner';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const date=(value:string)=>value?new Date(value+'T12:00:00').toLocaleDateString('pt-BR'):'Não informada';
const fresh:Calf={name:'',tag:'',photo:'',bodyPhoto:'',photoFrame:{...defaultFrame},bodyFrame:{...defaultFrame},motherTag:'',motherName:'',birth:'',breed:'Holandesa',dailyMilk:'',weaningDate:'',medicineDate:'',medicine:'',vaccinationDate:''};
function Field({label,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string}){return <label className="field"><span>{label}</span><input {...props}/></label>;}
export function Calves({onDeletionPasswordChange,onCountChange}:{onDeletionPasswordChange:(configured:boolean)=>void;onCountChange:(count:number)=>void}){
 const [deletion,setDeletion]=useState<Calf|null>(null),[hasDeletionPassword,setHasDeletionPassword]=useState(false),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 useEffect(()=>{setPassword('');setConfirmation('');},[deletion]);
 const [calves,setCalves]=useState<Calf[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[search,setSearch]=useState(''),[selected,setSelected]=useState<string|null>(null),[form,setForm]=useState<Calf|null>(null),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[pendingPhoto,setPendingPhoto]=useState<{src:string;field:'photo'|'bodyPhoto';frame:PhotoFrame}|null>(null);
 const load=useCallback(async()=>{
  const response=await fetch('/api/calves',{cache:'no-store'});const data=await response.json() as {calves:Calf[];hasDeletionPassword:boolean;error?:string};
  if(!response.ok)throw Error(data.error||'Não foi possível carregar os bezerros.');
  setCalves(data.calves);onCountChange(data.calves.length);setHasDeletionPassword(data.hasDeletionPassword);onDeletionPasswordChange(data.hasDeletionPassword);setError('');
 },[onDeletionPasswordChange,onCountChange]);
 useEffect(()=>{load().catch(e=>setError((e as Error).message)).finally(()=>setLoading(false));},[load]);
 const calf=calves.find(c=>c.id===selected);
 const results=calves.filter(c=>`${c.name} ${c.tag} ${c.motherName} ${c.motherTag}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 const patch=(key:keyof Calf,value:string)=>setForm(c=>c?{...c,[key]:value}:null);
 async function save(event:FormEvent){event.preventDefault();if(!form||busy||uploading||pendingPhoto)return;setBusy(true);
  try{const response=await fetch('/api/calves',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'calf',data:form})});const data=await response.json() as {id:string;error?:string};if(!response.ok)throw Error(data.error||'Não foi possível salvar o bezerro.');await load();setSelected(data.id);setForm(null);toast.success('Ficha do bezerro salva.');}
  catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 }
 async function deleteCalf(){
  if(!deletion||busy)return;
  if(password.length<6){toast.error('Digite uma senha com pelo menos 6 caracteres.');return;}
  if(!hasDeletionPassword&&password!==confirmation){toast.error('As senhas não coincidem.');return;}
  setBusy(true);
  try{
   const response=await fetch(hasDeletionPassword?'/api/calves':'/api/herd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(hasDeletionPassword?{type:'delete-calf',data:{id:deletion.id,password}}:{type:'set-deletion-password',data:{password}})});
   const data=await response.json() as {error?:string};if(!response.ok)throw Error(data.error||'Não foi possível excluir.');
   if(!hasDeletionPassword){setHasDeletionPassword(true);onDeletionPasswordChange(true);setPassword('');setConfirmation('');toast.success('Senha criada. Digite-a para confirmar a exclusão.');return;}
   if(selected===deletion.id)setSelected(null);setDeletion(null);await load();toast.success('Bezerro excluído.');
  }catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 }
 async function upload(file:File|undefined,field:'photo'|'bodyPhoto'){if(!file)return;setUploading(true);
  try{const body=new FormData();body.append('file',file);const response=await fetch('/api/photos',{method:'POST',body});const data=await response.json() as {photo:string;error?:string};if(!response.ok)throw Error(data.error||'Não foi possível enviar a foto.');setPendingPhoto({src:data.photo,field,frame:{...defaultFrame,fit:field==='photo'?'cover':'contain'}});}
  catch(e){toast.error((e as Error).message);}finally{setUploading(false);}
 }
 return <>
 <section className="panel">
  <div className="sectionhead">{calf?<button className="subtle" onClick={()=>setSelected(null)}><ChevronLeft size={16}/> Voltar aos bezerros</button>:<h2>Bezerros <span className="count">{calves.length}</span></h2>}<div className="detailactions">{calf&&<><button className="secondary" onClick={()=>setForm({...calf})}>Editar</button><button className="secondary" onClick={()=>setDeletion(calf)}><Trash2 size={16}/> Excluir bezerro</button></>}<button className="primary" onClick={()=>setForm({...fresh,photoFrame:{...defaultFrame},bodyFrame:{...defaultFrame}})}><Plus size={16}/> Cadastrar bezerro</button></div></div>
  {error&&<div className="error" role="alert">{error} <button onClick={()=>{setLoading(true);load().catch(e=>setError((e as Error).message)).finally(()=>setLoading(false));}}>Tentar novamente</button></div>}
  {calf?<><h2 style={{marginBottom:24}}>{calf.name} · Brinco {calf.tag}</h2><div className="detail"><div className="animalphotos"><div><span>Foto do rosto</span><AnimalPhoto src={calf.photo} alt={`Rosto de ${calf.name}`} frame={calf.photoFrame}/></div><div><span>Foto do corpo</span><AnimalPhoto src={calf.bodyPhoto} alt={`Corpo de ${calf.name}`} frame={calf.bodyFrame}/></div></div><div className="factgrid">{[['Número do brinco',calf.tag],['Nome',calf.name],['Número do brinco da mãe',calf.motherTag||'Não informado'],['Nome da mãe',calf.motherName||'Não informado'],['Data de nascimento',date(calf.birth)],['Raça',calf.breed],['Leite que mama por dia',calf.dailyMilk!==''?`${Number(calf.dailyMilk).toLocaleString('pt-BR')} L/dia`:'Não informado'],['Data do desmame',date(calf.weaningDate)],['Data da última medicação',date(calf.medicineDate)],['Última medicação',calf.medicine||'Não informada'],['Data da vacinação',date(calf.vaccinationDate)]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div></>:<>
  <label className="search" style={{marginBottom:22}}><Search size={18}/><input aria-label="Buscar bezerro" placeholder="Buscar nome, brinco ou mãe" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  {loading?<p className="emptyline">Carregando os bezerros…</p>:!results.length?<div className="empty"><div className="emptyicon"><Tag size={28}/></div><h3>{calves.length?'Nenhum bezerro encontrado':'Cadastre o primeiro bezerro'}</h3><p>{calves.length?'Ajuste a busca.':'Registre as fotos, a identificação e os cuidados de cada bezerro.'}</p></div>:<div className="cowgrid">{results.map(c=><div className="calfcard" key={c.id}><button className="cowcard" onClick={()=>setSelected(c.id!)}><div className="cardphotos"><AnimalPhoto src={c.photo} alt={`Rosto de ${c.name}`} frame={c.photoFrame} compact/><AnimalPhoto src={c.bodyPhoto} alt={`Corpo de ${c.name}`} frame={c.bodyFrame} compact/></div><div><strong>{c.name}</strong><p>Brinco {c.tag} · {c.breed}</p>{(c.motherName||c.motherTag)&&<p>Mãe: {[c.motherTag,c.motherName].filter(Boolean).join(' · ')}</p>}</div></button><div className="recordactions"><button className="deletebutton" aria-label={`Editar bezerro ${c.name}`} onClick={()=>setForm({...c})}>Editar</button><button className="deletebutton" aria-label={`Excluir bezerro ${c.name}`} onClick={()=>setDeletion(c)}><Trash2 size={16}/> Excluir</button></div></div>)}</div>}
  </>}
 </section>
 <Dialog open={!!form} onOpenChange={open=>{if(!open&&!busy&&!uploading&&!pendingPhoto)setForm(null);}}><DialogContent className="formdialog"><DialogTitle>{form?.id?'Editar bezerro':'Cadastrar bezerro'}</DialogTitle><DialogDescription>Informe o brinco, o nome e os dados do bezerro.</DialogDescription>{form&&<form onSubmit={save}><div className="formgrid">
 {(['photo','bodyPhoto'] as const).map(field=><label className="field" key={field}><span>{field==='photo'?'Foto do rosto':'Foto do corpo'} (até 5 MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading||busy} onChange={e=>{upload(e.target.files?.[0],field);e.target.value='';}}/><AnimalPhoto src={form[field]} alt={field==='photo'?'Foto da cara':'Foto do corpo'} frame={form[field==='photo'?'photoFrame':'bodyFrame']}/></label>)}
 <Field label="Número do brinco *" required maxLength={50} value={form.tag} onChange={e=>patch('tag',e.target.value)}/>
 <Field label="Nome *" required maxLength={100} value={form.name} onChange={e=>patch('name',e.target.value)}/>
 <Field label="Número do brinco da mãe" maxLength={50} value={form.motherTag} onChange={e=>patch('motherTag',e.target.value)}/>
 <Field label="Nome da mãe" maxLength={100} value={form.motherName} onChange={e=>patch('motherName',e.target.value)}/>
 <Field label="Data de nascimento" type="date" max={today()} value={form.birth} onChange={e=>patch('birth',e.target.value)}/>
 <Field label="Raça *" required maxLength={80} value={form.breed} onChange={e=>patch('breed',e.target.value)}/>
 <Field label="Leite que mama por dia (litros)" type="number" min="0" step="0.01" value={form.dailyMilk} onChange={e=>patch('dailyMilk',e.target.value)}/>
 <Field label="Data do desmame" type="date" value={form.weaningDate} onChange={e=>patch('weaningDate',e.target.value)}/>
 <Field label="Data da última medicação" type="date" max={today()} value={form.medicineDate} onChange={e=>patch('medicineDate',e.target.value)}/>
 <Field label="Qual medicação" maxLength={5000} value={form.medicine} onChange={e=>patch('medicine',e.target.value)}/>
 <Field label="Data da vacinação" type="date" value={form.vaccinationDate} onChange={e=>patch('vaccinationDate',e.target.value)}/>
 </div><div className="formactions"><button type="button" className="secondary" disabled={busy||uploading||!!pendingPhoto} onClick={()=>setForm(null)}>Cancelar</button><button className="primary" disabled={busy||uploading||!!pendingPhoto}>{uploading?'Enviando foto…':busy?'Salvando…':'Salvar ficha'}</button></div></form>}</DialogContent></Dialog>
 <Dialog open={!!pendingPhoto} onOpenChange={open=>{if(!open)setPendingPhoto(null);}}><DialogContent className="formdialog"><DialogTitle>{pendingPhoto?.field==='photo'?'Enquadrar rosto':'Enquadrar corpo'}</DialogTitle><DialogDescription>Ajuste antes de inserir. Após confirmar, os controles ficam ocultos.</DialogDescription>{pendingPhoto&&<><PhotoEditor src={pendingPhoto.src} alt={pendingPhoto.field==='photo'?'Foto da cara':'Foto do corpo'} frame={pendingPhoto.frame} onChange={frame=>setPendingPhoto(p=>p?{...p,frame}:null)}/><div className="formactions"><button type="button" className="secondary" onClick={()=>setPendingPhoto(null)}>Cancelar</button><button type="button" className="primary" onClick={()=>{setForm(c=>c?{...c,[pendingPhoto.field]:pendingPhoto.src,[pendingPhoto.field==='photo'?'photoFrame':'bodyFrame']:pendingPhoto.frame}:c);setPendingPhoto(null);}}>Confirmar foto</button></div></>}</DialogContent></Dialog>
 <AlertDialog open={!!deletion} onOpenChange={open=>{if(!open&&!busy)setDeletion(null);}}><AlertDialogContent><AlertDialogTitle>Excluir bezerro?</AlertDialogTitle><AlertDialogDescription>{deletion?.name} · Brinco {deletion?.tag}<br/>O cadastro deste bezerro será excluído. Esta ação não pode ser desfeita.</AlertDialogDescription>{!hasDeletionPassword&&<p className="muted hint">Crie uma senha para proteger a exclusão de vacas e bezerros. Ela será solicitada em cada exclusão.</p>}<Field label={hasDeletionPassword?'Senha de exclusão':'Criar senha de exclusão (mínimo 6 caracteres)'} type="password" minLength={6} maxLength={128} autoComplete={hasDeletionPassword?'current-password':'new-password'} value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/>{!hasDeletionPassword&&<Field label="Confirmar senha" type="password" minLength={6} maxLength={128} autoComplete="new-password" value={confirmation} disabled={busy} onChange={e=>setConfirmation(e.target.value)}/>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();deleteCalf();}}>{busy?'Aguarde…':hasDeletionPassword?'Confirmar exclusão':'Criar senha'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}

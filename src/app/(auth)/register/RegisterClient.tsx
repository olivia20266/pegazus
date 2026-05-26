'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { registerAction } from '@/app/actions/auth'

const COUNTRIES = ['Gabon','France','Congo','Cameroun',"Côte d'Ivoire",'Sénégal','Belgique','Suisse','Canada','Autre']
const inp = { background:'#111828', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'11px 13px', color:'#edf0f7', fontSize:13, outline:'none', width:'100%', fontFamily:'inherit' } as const
const lbl = { fontSize:11, fontWeight:600 as const, color:'#9ca3af', letterSpacing:'.06em', textTransform:'uppercase' as const, display:'block' as const, marginBottom:5 }

export default function RegisterClient() {
  const router  = useRouter()
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', phone:'', birthDate:'',
    nationality:'', country:'', learningId:'', password:'', password2:'',
    securityQ:"Nom de votre premier animal ?", securityA:'', leverage:'1:50',
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(p => ({...p, [k]: e.target.value}))

  function strength() {
    const p = form.password; let s = 0
    if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const str = strength()
  const strColor = ['#ef4444','#f97316','#eab308','#22c55e'][str-1] || '#2d3748'

  async function handleSubmit() {
    if (form.password !== form.password2) { toast.error('Mots de passe différents'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k,v]) => fd.append(k,v))
      const result = await registerAction(fd)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Compte créé ! Redirection...')
      router.push('/wallet')
    } catch { toast.error('Erreur serveur') }
    finally { setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh',background:'#06080e',display:'flex',fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{position:'fixed',inset:0,backgroundImage:'linear-gradient(rgba(212,168,67,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(212,168,67,.04) 1px,transparent 1px)',backgroundSize:'60px 60px',zIndex:0}}/>

      {/* LEFT */}
      <div style={{width:'40%',minHeight:'100vh',padding:'56px 44px',zIndex:1,borderRight:'1px solid rgba(212,168,67,.18)',display:'flex',flexDirection:'column',justifyContent:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:48}}>
          <img src="/logo.png" alt="Pegazus" style={{ width:50, height:50, objectFit:'contain', borderRadius:8 }} />
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'#d4a843'}}>Pegazus</span>
        </div>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:36,fontWeight:800,lineHeight:1.1,color:'#fff',marginBottom:14}}>Tradez les marchés <span style={{color:'#d4a843'}}>mondiaux</span></h1>
        <p style={{color:'#5a677d',fontSize:14,lineHeight:1.7,marginBottom:36}}>Créez votre compte de trading réel. Votre solde de formation est transféré instantanément.</p>
        {[['🔗','Lié à votre compte formation'],['🌍','Forex, Actions, Indices — 500+ instruments'],['🔒','KYC & fonds ségrégués'],['','Retrait sous 24h']].map(([ico,t])=>(
          <div key={t} style={{display:'flex',gap:12,padding:'12px 16px',background:'rgba(212,168,67,.04)',border:'1px solid rgba(212,168,67,.12)',borderRadius:11,marginBottom:8}}>
            <span style={{fontSize:17}}>{ico}</span>
            <span style={{fontSize:13,color:'#edf0f7'}}>{t}</span>
          </div>
        ))}
      </div>

      {/* RIGHT */}
      <div style={{flex:1,padding:'56px 44px',zIndex:1,overflowY:'auto'}}>
        <div style={{marginBottom:24}}>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:700,color:'#fff',marginBottom:4}}>Créer votre compte</h2>
          <p style={{color:'#5a677d',fontSize:13}}>Déjà inscrit ? <Link href="/login" style={{color:'#d4a843',textDecoration:'none'}}>Se connecter →</Link></p>
        </div>

        {/* Steps indicator */}
        <div style={{display:'flex',marginBottom:28}}>
          {['Identité','Sécurité','KYC'].map((s,i)=>(
            <div key={s} style={{display:'flex',alignItems:'center',flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12,fontWeight:500,color:i+1===step?'#d4a843':i+1<step?'#22c55e':'#5a677d'}}>
                <div style={{width:26,height:26,borderRadius:'50%',border:`1px solid ${i+1===step?'#d4a843':i+1<step?'#22c55e':'#2d3748'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,background:i+1===step?'rgba(212,168,67,.15)':i+1<step?'rgba(34,197,94,.15)':'#111828',color:i+1===step?'#d4a843':i+1<step?'#22c55e':'#5a677d'}}>
                  {i+1<step?'✓':i+1}
                </div>{s}
              </div>
              {i<2&&<div style={{flex:1,height:1,background:i+1<step?'#d4a843':'#2d3748',margin:'0 8px'}}/>}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13,marginBottom:13}}>
              <div><label style={lbl}>Prénom</label><input style={inp} value={form.firstName} onChange={set('firstName')} placeholder="Jean"/></div>
              <div><label style={lbl}>Nom</label><input style={inp} value={form.lastName} onChange={set('lastName')} placeholder="Dupont"/></div>
            </div>
            <div style={{marginBottom:13}}><label style={lbl}>Email</label><input type="email" style={inp} value={form.email} onChange={set('email')} placeholder="jean@exemple.com"/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13,marginBottom:13}}>
              <div><label style={lbl}>Téléphone</label><input type="tel" style={inp} value={form.phone} onChange={set('phone')} placeholder="+241 77 00 00 00"/></div>
              <div><label style={lbl}>Pays</label><select style={inp} value={form.country} onChange={set('country')}><option value="">Sélectionner...</option>{COUNTRIES.map(c=><option key={c}>{c}</option>)}</select></div>
            </div>
            <div style={{marginBottom:18}}><label style={lbl}>Identifiant formation (optionnel)</label><input style={inp} value={form.learningId} onChange={set('learningId')} placeholder="LEARN-2024-XXXXX"/><p style={{fontSize:11,color:'#5a677d',marginTop:4}}>Trouvez cet ID dans votre espace de formation</p></div>
            <button onClick={()=>{if(!form.firstName||!form.lastName||!form.email){toast.error('Remplissez les champs obligatoires');return}setStep(2)}} style={{width:'100%',padding:13,background:'linear-gradient(135deg,#d4a843,#f0c96a)',border:'none',borderRadius:10,color:'#06080e',fontWeight:700,fontSize:14,fontFamily:"'Syne',sans-serif",cursor:'pointer'}}>Continuer →</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{marginBottom:13}}>
              <label style={lbl}>Mot de passe</label>
              <div style={{position:'relative'}}>
                <input type={showPw?'text':'password'} style={inp} value={form.password} onChange={set('password')} placeholder="Au moins 8 caractères"/>
                <button onClick={()=>setShowPw(!showPw)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#5a677d',cursor:'pointer'}}>{showPw?'🙈':'👁'}</button>
              </div>
              <div style={{display:'flex',gap:4,marginTop:5}}>
                {[0,1,2,3].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<str?strColor:'#2d3748',transition:'background .3s'}}/>)}
              </div>
              {str>0&&<p style={{fontSize:11,color:strColor,marginTop:3}}>Force : {['Très faible','Faible','Moyen','Fort'][str-1]}</p>}
            </div>
            <div style={{marginBottom:13}}><label style={lbl}>Confirmer</label><input type="password" style={inp} value={form.password2} onChange={set('password2')} placeholder="Retapez votre mot de passe"/></div>
            <div style={{marginBottom:18}}><label style={lbl}>Levier préféré</label><select style={inp} value={form.leverage} onChange={set('leverage')}>{['1:10 — Prudent','1:50 — Standard','1:100 — Avancé','1:200 — Expert'].map(l=><option key={l} value={l.split(' ')[0]}>{l}</option>)}</select></div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setStep(1)} style={{flex:1,padding:12,background:'transparent',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,color:'#8a96aa',fontSize:13,cursor:'pointer'}}>← Retour</button>
              <button onClick={()=>{if(form.password!==form.password2){toast.error('Mots de passe différents');return}if(form.password.length<8){toast.error('Trop court');return}setStep(3)}} style={{flex:2,padding:12,background:'linear-gradient(135deg,#d4a843,#f0c96a)',border:'none',borderRadius:10,color:'#06080e',fontWeight:700,fontSize:14,fontFamily:"'Syne',sans-serif",cursor:'pointer'}}>Continuer →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{border:'1px solid rgba(212,168,67,.3)',borderRadius:11,padding:14,background:'rgba(212,168,67,.04)',marginBottom:18}}>
              <div style={{fontSize:13,color:'#d4a843',fontWeight:600,marginBottom:4}}>🔒 Vérification d'identité (KYC)</div>
              <div style={{fontSize:12,color:'#5a677d',lineHeight:1.6}}>Requis par la réglementation financière. Délai de vérification : 24–72h.</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13,marginBottom:13}}>
              <div><label style={lbl}>Type de document</label><select style={inp}><option>Carte Nationale d'Identité</option><option>Passeport</option><option>Permis de conduire</option></select></div>
              <div><label style={lbl}>Numéro</label><input style={inp} placeholder="AB123456"/></div>
            </div>
            {['Recto du document','Justificatif de domicile (< 3 mois)'].map(l=>(
              <div key={l} style={{border:'2px dashed rgba(255,255,255,.07)',borderRadius:11,padding:18,textAlign:'center',cursor:'pointer',marginBottom:13}}>
                <div style={{fontSize:26,marginBottom:5}}>{l.includes('Recto')?'📄':'🏠'}</div>
                <div style={{fontSize:13,color:'#5a677d'}}>{l}</div>
                <div style={{fontSize:11,color:'#5a677d',marginTop:3}}>JPG, PNG ou PDF — max 5 Mo</div>
              </div>
            ))}
            <p style={{fontSize:12,color:'#5a677d',marginBottom:14}}>En soumettant, vous acceptez nos <a href="#" style={{color:'#d4a843',textDecoration:'none'}}>CGU</a> et notre <a href="#" style={{color:'#d4a843',textDecoration:'none'}}>politique de confidentialité</a>.</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setStep(2)} style={{flex:1,padding:12,background:'transparent',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,color:'#8a96aa',fontSize:13,cursor:'pointer'}}>← Retour</button>
              <button onClick={handleSubmit} disabled={loading} style={{flex:2,padding:12,background:'linear-gradient(135deg,#d4a843,#f0c96a)',border:'none',borderRadius:10,color:'#06080e',fontWeight:700,fontSize:14,fontFamily:"'Syne',sans-serif",cursor:'pointer',opacity:loading?.6:1}}>{loading?'Création...':'Créer mon compte ✓'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

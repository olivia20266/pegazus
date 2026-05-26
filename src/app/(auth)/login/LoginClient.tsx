'use client'
// CLIENT COMPONENT : uniquement l'interface utilisateur.
// Toute la logique (Supabase, OTP, vérifications) est dans les Server Actions.
import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { loginAction, verifyOtpAction } from '@/app/actions/auth'

export default function LoginClient() {
  const router = useRouter()
  const [step, setStep]       = useState<'login'|'otp'>('login')
  const [userId, setUserId]   = useState('')
  const [devOtp, setDevOtp]   = useState('')
  const [otp, setOtp]         = useState(['','','','','',''])
  const [checking, setChecking] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const result = await loginAction(undefined, fd)
    if ('error' in result) { toast.error(result.error as string); return }
    setUserId(result.userId as string)
    setDevOtp((result.devOtp as string) || '')
    setStep('otp')
    toast.success('Code envoyé !')
  }

  async function handleOtp() {
    const code = otp.join('')
    if (code.length < 6) return
    setChecking(true)
    const result = await verifyOtpAction(userId, code)
    setChecking(false)
    if ('error' in result) { toast.error(result.error as string); return }
    router.push('/wallet')
    router.refresh()
  }

  function setDigit(i: number, v: string) {
    if (!/^\d?$/.test(v)) return
    const next = [...otp]; next[i] = v
    setOtp(next)
    if (v && i < 5) document.getElementById(`d${i+1}`)?.focus()
    if (next.every(Boolean)) { setTimeout(() => handleOtp(), 80) }
  }

  const inp = { background:'#111828', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'12px 14px', color:'#edf0f7', fontSize:14, outline:'none', width:'100%', fontFamily:'inherit' } as const

  return (
    <div style={{minHeight:'100vh',background:'#06080e',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Sans',sans-serif",position:'relative',overflow:'hidden'}}>
      <div style={{position:'fixed',inset:0,backgroundImage:'linear-gradient(rgba(212,168,67,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(212,168,67,.04) 1px,transparent 1px)',backgroundSize:'60px 60px',zIndex:0}}/>
      <div style={{background:'#0c0f1a',border:'1px solid rgba(212,168,67,.18)',borderRadius:20,padding:'44px 40px',width:'100%',maxWidth:400,position:'relative',zIndex:1}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:30}}>
          <img src="/logo.png" alt="Pegazus" style={{ width:32, height:32, objectFit:'contain', borderRadius:6 }} />
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'#d4a843'}}>Pegazus</span>
        </div>

        {step === 'login' ? (
          <>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:700,textAlign:'center',marginBottom:4,color:'#edf0f7'}}>Bon retour 👋</h2>
            <p style={{textAlign:'center',color:'#5a677d',fontSize:13,marginBottom:24}}>Pas de compte ? <Link href="/register" style={{color:'#d4a843',textDecoration:'none'}}>Créer un compte</Link></p>
            <form onSubmit={handleSubmit}>
              <div style={{marginBottom:13}}>
                <label style={{fontSize:11,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:5}}>Email</label>
                <input name="email" type="email" required style={inp} placeholder="jean@exemple.com" autoComplete="email"/>
              </div>
              <div style={{marginBottom:18}}>
                <label style={{fontSize:11,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:5}}>Mot de passe</label>
                <input name="password" type="password" required style={inp} placeholder="••••••••" autoComplete="current-password"/>
              </div>
              <div style={{textAlign:'right',marginBottom:18}}><a href="#" style={{fontSize:12,color:'#d4a843',textDecoration:'none'}}>Mot de passe oublié ?</a></div>
              <button type="submit" style={{width:'100%',padding:13,background:'linear-gradient(135deg,#d4a843,#f0c96a)',border:'none',borderRadius:10,color:'#06080e',fontWeight:700,fontSize:14,fontFamily:"'Syne',sans-serif",cursor:'pointer'}}>Se connecter</button>
            </form>
            <p style={{textAlign:'center',fontSize:11,color:'#5a677d',marginTop:16}}>🔒 SSL • Compte bloqué après 5 tentatives</p>
          </>
        ) : (
          <>
            <div style={{textAlign:'center',fontSize:44,marginBottom:10}}>📱</div>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,textAlign:'center',marginBottom:6,color:'#edf0f7'}}>Code de vérification</h2>
            <p style={{textAlign:'center',color:'#5a677d',fontSize:13,marginBottom:20}}>Entrez le code à 6 chiffres reçu par SMS</p>
            {devOtp && <p style={{textAlign:'center',fontSize:12,color:'#d4a843',marginBottom:14,background:'rgba(212,168,67,.08)',padding:'7px 12px',borderRadius:8}}>🧪 Dev : <strong>{devOtp}</strong></p>}
            <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:20}}>
              {otp.map((d,i)=>(
                <input key={i} id={`d${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={e=>setDigit(i,e.target.value)}
                  onKeyDown={e=>e.key==='Backspace'&&!d&&i>0&&document.getElementById(`d${i-1}`)?.focus()}
                  style={{width:44,height:50,background:'#111828',border:'1px solid rgba(255,255,255,.08)',borderRadius:9,textAlign:'center',fontSize:20,fontFamily:"'DM Mono',monospace",color:'#edf0f7',outline:'none'}}/>
              ))}
            </div>
            <button onClick={handleOtp} disabled={checking||otp.join('').length<6}
              style={{width:'100%',padding:13,background:'linear-gradient(135deg,#d4a843,#f0c96a)',border:'none',borderRadius:10,color:'#06080e',fontWeight:700,fontSize:14,fontFamily:"'Syne',sans-serif",cursor:'pointer',opacity:checking?.6:1}}>
              {checking?'Vérification...':'Confirmer →'}
            </button>
            <button onClick={()=>setStep('login')} style={{width:'100%',padding:11,marginTop:8,background:'transparent',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,color:'#5a677d',fontSize:13,cursor:'pointer'}}>← Retour</button>
          </>
        )}
      </div>
    </div>
  )
}

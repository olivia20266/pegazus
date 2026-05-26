'use client'
// Ce fichier est envoyé au navigateur — ZERO logique sensible
// Pas d'imports Supabase, pas de clés, pas d'accès DB direct
// Toutes les mutations passent par /api/* (serveur uniquement)
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { fmt, fmtDate } from '@/lib/utils'
import type { Wallet, Transaction } from '@/types/database'

type Props = {
  user:         { id: string; firstName: string; lastName: string; email: string; kycStatus: string; role: string }
  wallet:       Wallet | null
  transactions: Transaction[]
}

export default function WalletClient({ user, wallet: initialWallet, transactions: initialTx }: Props) {
  const router  = useRouter()
  const [wallet, setWallet] = useState(initialWallet)
  const [txList, setTxList] = useState(initialTx)
  const [modal,   setModal]  = useState<'deposit'|'withdraw'|null>(null)
  const [depSrc,  setDepSrc] = useState<'learning'|'bank'>('learning')
  const [wdDest,  setWdDest] = useState<'learning'|'bank'>('learning')
  const [amount,  setAmount] = useState('')
  const [otp,     setOtp]    = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [devOtp,  setDevOtp]  = useState('')
  const [loading, setLoading] = useState(false)

  // Toutes les mutations → API routes (serveur, jamais exposé)
  async function callApi(endpoint: string, body: object) {
    const res  = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return null }
    return data
  }

  async function sendOtp() {
    const data = await callApi('/api/wallet/otp', {})
    if (!data) return
    setOtpSent(true)
    setDevOtp(data.devOtp || '')
    toast.success('Code OTP envoyé !')
  }

  async function deposit() {
    const amt = parseFloat(amount)
    if (!amt || amt < 50) { toast.error('Minimum 50 USD'); return }
    setLoading(true)
    try {
      const data = await callApi('/api/wallet/deposit', { amount: amt, source: depSrc })
      if (!data) return
      setWallet(data.wallet)
      setTxList(prev => [data.transaction, ...prev])
      toast.success(`${fmt(amt)} déposé avec succès !`)
      setModal(null); setAmount('')
    } finally { setLoading(false) }
  }

  async function withdraw() {
    const amt = parseFloat(amount)
    if (!amt || amt < 20) { toast.error('Minimum 20 USD'); return }
    if (!otp)             { toast.error('Code OTP requis'); return }
    setLoading(true)
    try {
      const data = await callApi('/api/wallet/withdraw', { amount: amt, destination: wdDest, otpCode: otp })
      if (!data) return
      setWallet(data.wallet)
      setTxList(prev => [data.transaction, ...prev])
      toast.success('Retrait initié !')
      setModal(null); setAmount(''); setOtp(''); setOtpSent(false)
    } finally { setLoading(false) }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method:'POST' })
    router.push('/login')
  }

  const w = wallet
  const iStyle = { background:'#111828', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'11px 14px', color:'#edf0f7', fontSize:13, outline:'none', width:'100%', fontFamily:"'DM Sans',sans-serif" }

  return (
    <div style={{ minHeight:'100vh', background:'#06080e', fontFamily:"'DM Sans',sans-serif" }}>
      {/* NAV */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 28px', borderBottom:'1px solid rgba(255,255,255,.07)', background:'rgba(6,8,14,.95)', position:'sticky', top:0, zIndex:50, backdropFilter:'blur(12px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.png" alt="Pegazus" style={{ width:32, height:32, objectFit:'contain', borderRadius:6 }} />
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:'#d4a843' }}>Pegazus</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {(user.role==='ADMIN'||user.role==='SUPERADMIN') && (
            <a href="/admin" style={{ fontSize:12, color:'#d4a843', textDecoration:'none', padding:'6px 14px', border:'1px solid rgba(212,168,67,.3)', borderRadius:8 }}>⚙ Admin</a>
          )}
          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background: user.kycStatus==='VERIFIED'?'rgba(34,197,94,.12)':'rgba(240,180,60,.12)', color: user.kycStatus==='VERIFIED'?'#22c55e':'#f0b43c', border:`1px solid ${user.kycStatus==='VERIFIED'?'rgba(34,197,94,.3)':'rgba(240,180,60,.3)'}`, fontWeight:600 }}>
            {user.kycStatus==='VERIFIED'?'✓ KYC Vérifié':'⏳ KYC En attente'}
          </span>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#d4a843,#f0c96a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#06080e' }}>
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <a href="/trading" style={{ fontSize:12, color:'#2dd4a0', textDecoration:'none', padding:'6px 14px', border:'1px solid rgba(45,212,160,.3)', borderRadius:8, fontWeight:600 }}>📈 Trading</a>
          <button onClick={logout} style={{ background:'none', border:'none', color:'#5a677d', cursor:'pointer', fontSize:13 }}>Déconnexion</button>
        </div>
      </nav>

      <main style={{ maxWidth:1100, margin:'0 auto', padding:'28px 24px' }}>
        {/* BANNIÈRE SOLDE FORMATION */}
        {w && w.learning_balance > 0 && (
          <div style={{ background:'linear-gradient(135deg,rgba(212,168,67,.08),rgba(212,168,67,.03))', border:'1px solid rgba(212,168,67,.2)', borderRadius:14, padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, gap:16 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:3 }}>🎓 Solde formation disponible</div>
              <div style={{ fontSize:13, color:'#5a677d' }}>Vous avez <strong style={{ color:'#d4a843' }}>{fmt(w.learning_balance)}</strong> dans votre espace apprentissage.</div>
            </div>
            <button onClick={()=>{setDepSrc('learning');setModal('deposit')}} style={{ padding:'10px 20px', borderRadius:10, background:'rgba(212,168,67,.15)', border:'1px solid rgba(212,168,67,.3)', color:'#d4a843', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              Transférer → Wallet
            </button>
          </div>
        )}

        {/* HERO WALLET */}
        <div style={{ background:'#0c0f1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:18, padding:'32px 36px', display:'grid', gridTemplateColumns:'1fr auto', gap:24, alignItems:'center', marginBottom:20, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-80, right:-80, width:300, height:300, background:'radial-gradient(circle,rgba(212,168,67,.05) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'#5a677d', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>Solde total du wallet</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:48, fontWeight:500, color:'#fff', lineHeight:1, marginBottom:8 }}>
              <span style={{ fontSize:22, color:'#5a677d', marginRight:4 }}>$</span>
              {(w?.balance||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:24, marginTop:18 }}>
              {[
                ['Disponible',  fmt(w?.free_margin||0), '#edf0f7'],
                ['En marge',    fmt(w?.margin||0),      '#5a677d'],
                ['P&L flottant',fmt(w?.floating_pl||0), (w?.floating_pl||0)>=0?'#2dd4a0':'#f0544f'],
                ['MT5 Login',   w?.mt5_login||'—',      '#d4a843'],
              ].map(([lbl,val,col])=>(
                <div key={lbl}><div style={{ fontSize:11, color:'#5a677d', marginBottom:3 }}>{lbl}</div><div style={{ fontFamily:"'DM Mono',monospace", fontSize:14, color:col as string, fontWeight:500 }}>{val}</div></div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={()=>setModal('deposit')} style={{ padding:'12px 24px', borderRadius:11, background:'linear-gradient(135deg,#d4a843,#f0c96a)', border:'none', color:'#06080e', fontWeight:700, fontSize:14, fontFamily:"'Syne',sans-serif", cursor:'pointer' }}>⬇ Déposer</button>
            <button onClick={()=>setModal('withdraw')} style={{ padding:'12px 24px', borderRadius:11, background:'transparent', border:'1px solid rgba(255,255,255,.07)', color:'#edf0f7', fontWeight:700, fontSize:14, fontFamily:"'Syne',sans-serif", cursor:'pointer' }}>⬆ Retirer</button>
            <button onClick={()=>toast('Connexion MetaTrader 5...')} style={{ padding:'12px 24px', borderRadius:11, background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.3)', color:'#2dd4a0', fontWeight:700, fontSize:14, fontFamily:"'Syne',sans-serif", cursor:'pointer' }}>📈 Trader</button>
          </div>
        </div>

        {/* STATS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
          {[
            ['Total déposé',  fmt(txList.filter(t=>t.type==='DEPOSIT').reduce((s,t)=>s+t.amount,0)),  'Dépôts cumulés',    '#d4a843'],
            ['Total retiré',  fmt(Math.abs(txList.filter(t=>t.type==='WITHDRAWAL').reduce((s,t)=>s+t.amount,0))), 'Retraits cumulés', '#edf0f7'],
            ['P&L réalisé',   fmt(txList.filter(t=>t.type==='TRADE').reduce((s,t)=>s+t.amount,0)),    'Trades clôturés',   '#2dd4a0'],
          ].map(([lbl,val,sub,col])=>(
            <div key={lbl} style={{ background:'#0c0f1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:13, padding:'18px 22px' }}>
              <div style={{ fontSize:11, color:'#5a677d', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:7 }}>{lbl}</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:22, color:col as string, fontWeight:500 }}>{val}</div>
              <div style={{ fontSize:12, color:'#5a677d', marginTop:4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* TRANSACTIONS */}
        <div style={{ background:'#0c0f1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:13, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,.07)', fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700 }}>📋 Historique des transactions</div>
          {txList.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'#5a677d', fontSize:14 }}>Aucune transaction pour le moment</div>
          ) : txList.map(tx=>(
            <div key={tx.id} style={{ display:'flex', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.03)' }}>
              <div style={{ width:36, height:36, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, marginRight:12, background: tx.amount>0?'rgba(34,197,94,.1)':tx.type==='MANUAL_ADJUSTMENT'?'rgba(212,168,67,.1)':'rgba(240,84,79,.1)', flexShrink:0 }}>
                {tx.type==='DEPOSIT'?'⬇':tx.type==='WITHDRAWAL'?'⬆':tx.type==='MANUAL_ADJUSTMENT'?'':'💹'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'#edf0f7' }}>{tx.description || tx.type}</div>
                <div style={{ fontSize:11, color:'#5a677d', marginTop:2 }}>{fmtDate(tx.created_at)}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500, color: tx.amount>0?'#2dd4a0':'#f0544f' }}>
                  {tx.amount>0?'+':''}{fmt(tx.amount)}
                </div>
                <div style={{ fontSize:10, marginTop:2, padding:'2px 7px', borderRadius:10, display:'inline-block', background: tx.status==='COMPLETED'?'rgba(34,197,94,.1)':'rgba(240,180,60,.1)', color: tx.status==='COMPLETED'?'#2dd4a0':'#f0b43c', fontWeight:600 }}>
                  {tx.status==='COMPLETED'?'✓ Confirmé':tx.status==='PENDING'?'⏳ En attente':'Annulé'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL DÉPÔT */}
      {modal==='deposit' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(6,8,14,.88)', backdropFilter:'blur(8px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{ background:'#0c0f1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:18, width:'100%', maxWidth:440, overflow:'hidden', animation:'none' }}>
            <div style={{ padding:'22px 26px 18px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div><div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700 }}>⬇ Déposer des fonds</div><div style={{ fontSize:13, color:'#5a677d', marginTop:3 }}>Sélectionnez votre source</div></div>
              <button onClick={()=>setModal(null)} style={{ background:'#111828', border:'1px solid rgba(255,255,255,.07)', width:30, height:30, borderRadius:8, cursor:'pointer', color:'#5a677d', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <div style={{ padding:'22px 26px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                {([['learning','🎓','Site de formation',`Solde : ${fmt(w?.learning_balance||0)}`],['bank','🏦','Virement bancaire','1–3 jours']] as const).map(([val,ico,name,sub])=>(
                  <div key={val} onClick={()=>setDepSrc(val)} style={{ border:`2px solid ${depSrc===val?'#d4a843':'rgba(255,255,255,.07)'}`, borderRadius:11, padding:14, textAlign:'center', cursor:'pointer', background: depSrc===val?'rgba(212,168,67,.06)':'transparent', transition:'all .2s' }}>
                    <div style={{ fontSize:26, marginBottom:7 }}>{ico}</div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{name}</div>
                    <div style={{ fontSize:11, color:'#5a677d', marginTop:2 }}>{sub}</div>
                  </div>
                ))}
              </div>
              <label style={{ fontSize:11, fontWeight:600, color:'#9ca3af', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:5 }}>Montant (USD)</label>
              <input type="number" style={iStyle} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Ex : 500" min="50" />
              <div style={{ display:'flex', gap:8, marginTop:8, marginBottom:16 }}>
                {[50,100,250,500].map(v=><button key={v} onClick={()=>setAmount(String(v))} style={{ padding:'5px 12px', borderRadius:7, border:'1px solid rgba(255,255,255,.07)', background:'none', color:'#8a96aa', fontSize:12, cursor:'pointer' }}>${v}</button>)}
              </div>
              <div style={{ background:'rgba(212,168,67,.06)', border:'1px solid rgba(212,168,67,.2)', borderRadius:10, padding:'11px 14px', fontSize:12, color:'#8a96aa', marginBottom:16, lineHeight:1.6 }}>
                {depSrc==='learning'?'Transfert instantané depuis votre espace formation. Minimum : 50 USD.':'Envoyez votre virement à notre IBAN. Délai : 1–3 jours. Minimum : 100 USD.'}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setModal(null)} style={{ flex:1, padding:12, background:'transparent', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, color:'#8a96aa', cursor:'pointer' }}>Annuler</button>
                <button onClick={deposit} disabled={loading} style={{ flex:2, padding:12, background:'linear-gradient(135deg,#d4a843,#f0c96a)', border:'none', borderRadius:10, color:'#06080e', fontWeight:700, fontFamily:"'Syne',sans-serif", cursor:'pointer', opacity:loading?.7:1 }}>
                  {loading?'Traitement...':'Confirmer le dépôt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RETRAIT */}
      {modal==='withdraw' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(6,8,14,.88)', backdropFilter:'blur(8px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{ background:'#0c0f1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:18, width:'100%', maxWidth:440, overflow:'hidden' }}>
            <div style={{ padding:'22px 26px 18px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div><div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700 }}>⬆ Retirer des fonds</div><div style={{ fontSize:13, color:'#5a677d', marginTop:3 }}>Disponible : <strong style={{ color:'#d4a843' }}>{fmt(w?.free_margin||0)}</strong></div></div>
              <button onClick={()=>setModal(null)} style={{ background:'#111828', border:'1px solid rgba(255,255,255,.07)', width:30, height:30, borderRadius:8, cursor:'pointer', color:'#5a677d', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <div style={{ padding:'22px 26px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                {([['learning','🎓','Site formation','Instantané'],['bank','🏦','Virement bancaire','1–3 jours']] as const).map(([val,ico,name,sub])=>(
                  <div key={val} onClick={()=>setWdDest(val)} style={{ border:`2px solid ${wdDest===val?'#d4a843':'rgba(255,255,255,.07)'}`, borderRadius:11, padding:14, textAlign:'center', cursor:'pointer', background: wdDest===val?'rgba(212,168,67,.06)':'transparent' }}>
                    <div style={{ fontSize:26, marginBottom:7 }}>{ico}</div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{name}</div>
                    <div style={{ fontSize:11, color:'#5a677d', marginTop:2 }}>{sub}</div>
                  </div>
                ))}
              </div>
              <label style={{ fontSize:11, fontWeight:600, color:'#9ca3af', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:5 }}>Montant (USD)</label>
              <input type="number" style={{...iStyle, marginBottom:14}} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Ex : 200" min="20" />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                <label style={{ fontSize:11, fontWeight:600, color:'#9ca3af', letterSpacing:'.06em', textTransform:'uppercase' }}>Code OTP</label>
                <button onClick={sendOtp} style={{ fontSize:11, color:'#d4a843', background:'none', border:'none', cursor:'pointer' }}>{otpSent?'Renvoyer →':'Envoyer le code →'}</button>
              </div>
              <input style={{...iStyle, marginBottom: devOtp?8:16}} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="000000" maxLength={6} />
              {devOtp && <div style={{ fontSize:12, color:'#d4a843', background:'rgba(212,168,67,.08)', padding:'6px 12px', borderRadius:8, marginBottom:16 }}>🧪 Dev OTP : <strong>{devOtp}</strong></div>}
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setModal(null)} style={{ flex:1, padding:12, background:'transparent', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, color:'#8a96aa', cursor:'pointer' }}>Annuler</button>
                <button onClick={withdraw} disabled={loading} style={{ flex:2, padding:12, background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.3)', borderRadius:10, color:'#2dd4a0', fontWeight:700, fontFamily:"'Syne',sans-serif", cursor:'pointer', opacity:loading?.7:1 }}>
                  {loading?'Traitement...':'Confirmer le retrait'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

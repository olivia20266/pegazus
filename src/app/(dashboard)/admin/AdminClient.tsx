'use client'
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { fmt, fmtDate } from '@/lib/utils'

type User = {
  id: string; first_name: string; last_name: string; email: string
  country?: string; kyc_status: string; status: string; role: string
  wallets?: { balance: number; free_margin: number; learning_balance: number; mt5_login: string }
  created_at: string
}
type Stats = { totalUsers: number; kycPending: number; wdPending: number; totalFunds: number }
type Props = { stats: Stats; initialUsers: User[]; adminRole: string }

function Badge({ s }: { s: string }) {
  const m: Record<string, [string, string]> = {
    VERIFIED:      ['#2dd4a0', 'rgba(45,212,160,.12)'],
    PENDING:       ['#f0b43c', 'rgba(240,180,60,.12)'],
    REJECTED:      ['#f0544f', 'rgba(240,84,79,.12)'],
    ACTIVE:        ['#2dd4a0', 'rgba(45,212,160,.12)'],
    LOCKED:        ['#f0544f', 'rgba(240,84,79,.12)'],
    NOT_SUBMITTED: ['#5a677d', 'rgba(90,103,125,.12)'],
  }
  const [col, bg] = m[s] || ['#5a677d', 'rgba(90,103,125,.12)']
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: bg, color: col }}>{s}</span>
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#d4a843,#f0c96a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#06080e', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

export default function AdminClient({ stats: initStats, initialUsers, adminRole }: Props) {
  const [page,      setPage]      = useState('dashboard')
  const [users,     setUsers]     = useState<User[]>(initialUsers)
  const [stats,     setStats]     = useState(initStats)
  const [search,    setSearch]    = useState('')
  const [adjUser,   setAdjUser]   = useState<User | null>(null)
  const [adjType,   setAdjType]   = useState<'credit' | 'debit'>('credit')
  const [adjAmt,    setAdjAmt]    = useState('')
  const [adjReason, setAdjReason] = useState('bonus')
  const [adjNote,   setAdjNote]   = useState('')
  const [loading,   setLoading]   = useState(false)

  const api = useCallback(async (url: string, method: 'POST' | 'PATCH', body: object) => {
    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Erreur'); return null }
    return data
  }, [])

  const refreshUsers = useCallback(async () => {
    const res  = await fetch('/api/admin/users')
    const data = await res.json()
    if (Array.isArray(data)) setUsers(data)
  }, [])

  async function adjustBalance() {
    if (!adjUser || !adjAmt || !adjNote || adjNote.length < 10) { toast.error('Note obligatoire (min 10 car.)'); return }
    const amt = parseFloat(adjAmt)
    if (!amt || amt <= 0) { toast.error('Montant invalide'); return }
    setLoading(true)
    try {
      const data = await api(`/api/admin/users/${adjUser.id}/adjust`, 'POST', { type: adjType, amount: amt, reason: adjReason, note: adjNote })
      if (!data) return
      toast.success(`Solde de ${adjUser.first_name} ${adjType === 'credit' ? 'crédité' : 'débité'} de ${fmt(amt)} ✓`)
      setAdjUser(null); setAdjAmt(''); setAdjNote('')
      await refreshUsers()
    } finally { setLoading(false) }
  }

  async function updateKYC(userId: string, action: 'approve' | 'reject') {
    const data = await api(`/api/admin/kyc/${userId}`, 'PATCH', { action, reason: action === 'reject' ? 'Document invalide' : null })
    if (!data) return
    toast.success(`KYC ${action === 'approve' ? 'approuvé ✓' : 'rejeté ✗'}`)
    await refreshUsers()
  }

  async function updateStatus(userId: string, status: string) {
    const data = await api(`/api/admin/users/${userId}/status`, 'PATCH', { status })
    if (!data) return
    toast.success(`Compte ${status.toLowerCase()}`)
    await refreshUsers()
  }

  const filtered = users.filter(u => !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name.toLowerCase().includes(search.toLowerCase())
  )

  const PAGES = [
    { id: 'dashboard', ico: '📊', lbl: 'Dashboard' },
    { id: 'users',     ico: '👥', lbl: 'Utilisateurs' },
    { id: 'wallets',   ico: '💼', lbl: 'Wallets & Soldes' },
    { id: 'kyc',       ico: '🪪', lbl: 'KYC (' + stats.kycPending + ')' },
    { id: 'audit',     ico: '🔍', lbl: "Journal d'audit" },
  ]

  const iStyle: React.CSSProperties = { background: '#111828', border: '1px solid rgba(255,255,255,.08)', borderRadius: 9, padding: '10px 13px', color: '#edf0f7', fontSize: 13, outline: 'none', width: '100%', fontFamily: "'DM Sans',sans-serif" }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#06080e', fontFamily: "'DM Sans',sans-serif" }}>

      {/* SIDEBAR */}
      <aside style={{ width: 220, background: '#0c0f1a', borderRight: '1px solid rgba(255,255,255,.07)', padding: '22px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '0 18px 22px', borderBottom: '1px solid rgba(255,255,255,.07)', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Pegazus" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 7 }} />
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: '#d4a843' }}>PEGAZUS</div>
              <div style={{ fontSize: 10, color: '#f0544f', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{adminRole}</div>
            </div>
          </div>
        </div>
        {PAGES.map(({ id, ico, lbl }) => (
          <div key={id} style={{ padding: '0 10px', marginBottom: 2 }}>
            <button onClick={() => setPage(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left', background: page === id ? 'rgba(212,168,67,.1)' : 'transparent', color: page === id ? '#d4a843' : '#8a96aa' }}>
              <span style={{ width: 18, textAlign: 'center' }}>{ico}</span>{lbl}
            </button>
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: '14px 10px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <a href="/wallet" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, fontSize: 13, color: '#5a677d', textDecoration: 'none' }}>← Mon wallet</a>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* TOPBAR */}
        <div style={{ padding: '16px 26px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(6,8,14,.95)', zIndex: 10, backdropFilter: 'blur(12px)' }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700 }}>
              {{ dashboard: 'Dashboard', users: 'Utilisateurs', wallets: 'Wallets & Soldes', kyc: 'Vérification KYC', audit: "Journal d'audit" }[page] || page}
            </div>
            <div style={{ fontSize: 12, color: '#5a677d', marginTop: 2 }}>Administration Pegazus</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {(page === 'users' || page === 'wallets' || page === 'kyc') && (
              <input style={{ ...iStyle, width: 200 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            )}
          </div>
        </div>

        <div style={{ padding: '24px 26px' }}>

          {/* DASHBOARD */}
          {page === 'dashboard' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
                {[
                  [String(stats.totalUsers), 'Utilisateurs',       '#d4a843'],
                  [fmt(stats.totalFunds),    'Fonds gérés',        '#2dd4a0'],
                  [String(stats.kycPending), 'KYC en attente',     '#f0b43c'],
                  [String(stats.wdPending),  'Retraits en attente','#f0544f'],
                ].map(([val, lbl, col]) => (
                  <div key={lbl} style={{ background: '#0c0f1a', border: '1px solid rgba(255,255,255,.07)', borderRadius: 13, padding: '18px 22px' }}>
                    <div style={{ fontSize: 11, color: '#5a677d', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 7 }}>{lbl}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 24, color: col, fontWeight: 500 }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div style={{ background: '#0c0f1a', border: '1px solid rgba(255,255,255,.07)', borderRadius: 13, padding: '18px 22px' }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>👥 Utilisateurs récents</div>
                  {users.slice(0, 6).map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                      <Avatar name={u.first_name + ' ' + u.last_name} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{u.first_name} {u.last_name}</div>
                        <div style={{ fontSize: 11, color: '#5a677d' }}>{u.email}</div>
                      </div>
                      <Badge s={u.kyc_status} />
                    </div>
                  ))}
                </div>
                <div style={{ background: '#0c0f1a', border: '1px solid rgba(255,255,255,.07)', borderRadius: 13, padding: '18px 22px' }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>⚡ Actions rapides</div>
                  {[['💼 Ajuster un solde', 'wallets'], ['🪪 Traiter les KYC', 'kyc'], ['👥 Gérer les utilisateurs', 'users']].map(([lbl, target]) => (
                    <button key={lbl} onClick={() => setPage(target)} style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, color: '#edf0f7', fontSize: 13, textAlign: 'left', cursor: 'pointer', marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* USERS / WALLETS / KYC */}
          {(page === 'users' || page === 'wallets' || page === 'kyc') && (
            <div style={{ background: '#0c0f1a', border: '1px solid rgba(255,255,255,.07)', borderRadius: 13, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700 }}>
                  {page === 'users' ? '👥 Tous les utilisateurs' : page === 'wallets' ? '💼 Wallets & Soldes' : '🪪 Vérification KYC'}
                </div>
                {page === 'wallets' && (
                  <button onClick={() => setAdjUser(users[0] || null)} style={{ padding: '8px 16px', background: 'rgba(212,168,67,.12)', border: '1px solid rgba(212,168,67,.3)', borderRadius: 9, color: '#d4a843', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⚡ Ajustement manuel</button>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                      {(page === 'wallets'
                        ? ['Utilisateur', 'MT5 Login', 'Solde', 'Marge libre', 'Formation', 'Actions']
                        : page === 'kyc'
                        ? ['Utilisateur', 'Email', 'Pays', 'KYC', 'Inscrit', 'Actions']
                        : ['Utilisateur', 'Email', 'Pays', 'KYC', 'Solde', 'Statut', 'Actions']
                      ).map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 10, fontWeight: 600, color: '#5a677d', letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <Avatar name={u.first_name + ' ' + u.last_name} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{u.first_name} {u.last_name}</span>
                          </div>
                        </td>
                        {page === 'wallets' ? (
                          <>
                            <td style={{ padding: '12px 16px', fontFamily: "'DM Mono',monospace", fontSize: 12, color: '#8a96aa' }}>{u.wallets?.mt5_login || '—'}</td>
                            <td style={{ padding: '12px 16px', fontFamily: "'DM Mono',monospace", fontSize: 13, color: '#2dd4a0', fontWeight: 600 }}>{fmt(u.wallets?.balance || 0)}</td>
                            <td style={{ padding: '12px 16px', fontFamily: "'DM Mono',monospace", fontSize: 13, color: '#5a677d' }}>{fmt(u.wallets?.free_margin || 0)}</td>
                            <td style={{ padding: '12px 16px', fontFamily: "'DM Mono',monospace", fontSize: 13, color: '#d4a843' }}>{fmt(u.wallets?.learning_balance || 0)}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <button onClick={() => setAdjUser(u)} style={{ padding: '5px 12px', background: 'rgba(212,168,67,.12)', border: '1px solid rgba(212,168,67,.3)', borderRadius: 7, color: '#d4a843', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>⚡ Ajuster</button>
                            </td>
                          </>
                        ) : page === 'kyc' ? (
                          <>
                            <td style={{ padding: '12px 16px', fontSize: 12, color: '#8a96aa' }}>{u.email}</td>
                            <td style={{ padding: '12px 16px', fontSize: 13 }}>{u.country || '—'}</td>
                            <td style={{ padding: '12px 16px' }}><Badge s={u.kyc_status} /></td>
                            <td style={{ padding: '12px 16px', fontSize: 11, color: '#5a677d' }}>{fmtDate(u.created_at)}</td>
                            <td style={{ padding: '12px 16px' }}>
                              {u.kyc_status === 'PENDING' ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => updateKYC(u.id, 'approve')} style={{ padding: '4px 10px', background: 'rgba(45,212,160,.12)', border: '1px solid rgba(45,212,160,.3)', borderRadius: 6, color: '#2dd4a0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✓</button>
                                  <button onClick={() => updateKYC(u.id, 'reject')} style={{ padding: '4px 10px', background: 'rgba(240,84,79,.12)', border: '1px solid rgba(240,84,79,.3)', borderRadius: 6, color: '#f0544f', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✗</button>
                                </div>
                              ) : <span style={{ fontSize: 12, color: '#5a677d' }}>Traité</span>}
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '12px 16px', fontSize: 12, color: '#8a96aa' }}>{u.email}</td>
                            <td style={{ padding: '12px 16px', fontSize: 13 }}>{u.country || '—'}</td>
                            <td style={{ padding: '12px 16px' }}><Badge s={u.kyc_status} /></td>
                            <td style={{ padding: '12px 16px', fontFamily: "'DM Mono',monospace", fontSize: 13, color: '#2dd4a0' }}>{fmt(u.wallets?.balance || 0)}</td>
                            <td style={{ padding: '12px 16px' }}><Badge s={u.status} /></td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => setAdjUser(u)} style={{ padding: '4px 9px', background: 'rgba(212,168,67,.12)', border: 'none', borderRadius: 6, color: '#d4a843', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>⚡</button>
                                {u.kyc_status === 'PENDING' && <button onClick={() => updateKYC(u.id, 'approve')} style={{ padding: '4px 9px', background: 'rgba(45,212,160,.12)', border: 'none', borderRadius: 6, color: '#2dd4a0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✓</button>}
                                {u.status === 'ACTIVE'
                                  ? <button onClick={() => updateStatus(u.id, 'LOCKED')} style={{ padding: '4px 9px', background: 'rgba(240,84,79,.12)', border: 'none', borderRadius: 6, color: '#f0544f', fontSize: 11, cursor: 'pointer' }}>🔒</button>
                                  : <button onClick={() => updateStatus(u.id, 'ACTIVE')} style={{ padding: '4px 9px', background: 'rgba(45,212,160,.12)', border: 'none', borderRadius: 6, color: '#2dd4a0', fontSize: 11, cursor: 'pointer' }}>🔓</button>}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {page === 'audit' && (
            <div style={{ background: '#0c0f1a', border: '1px solid rgba(255,255,255,.07)', borderRadius: 13, padding: 40, textAlign: 'center', color: '#5a677d' }}>
              Journal d&apos;audit — connecté à Supabase audit_logs
            </div>
          )}
        </div>
      </div>

      {/* MODAL AJUSTEMENT SOLDE */}
      {adjUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,8,14,.9)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setAdjUser(null)}>
          <div style={{ background: '#0c0f1a', border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700 }}>⚡ Ajuster le solde</div>
                <div style={{ fontSize: 13, color: '#5a677d', marginTop: 3 }}>{adjUser.first_name} {adjUser.last_name} — actuel : <strong style={{ color: '#d4a843' }}>{fmt(adjUser.wallets?.balance || 0)}</strong></div>
              </div>
              <button onClick={() => setAdjUser(null)} style={{ background: '#111828', border: '1px solid rgba(255,255,255,.07)', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', color: '#5a677d', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '22px 26px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {(['credit', 'debit'] as const).map(t => (
                  <div key={t} onClick={() => setAdjType(t)} style={{ border: `2px solid ${adjType === t ? (t === 'credit' ? '#2dd4a0' : '#f0544f') : 'rgba(255,255,255,.07)'}`, borderRadius: 11, padding: 14, textAlign: 'center', cursor: 'pointer', background: adjType === t ? (t === 'credit' ? 'rgba(45,212,160,.07)' : 'rgba(240,84,79,.07)') : 'transparent' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{t === 'credit' ? '➕' : '➖'}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t === 'credit' ? '#2dd4a0' : '#f0544f' }}>{t === 'credit' ? 'Créditer' : 'Débiter'}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: adjType === 'credit' ? 'rgba(45,212,160,.06)' : 'rgba(240,84,79,.06)', border: `2px solid ${adjType === 'credit' ? 'rgba(45,212,160,.3)' : 'rgba(240,84,79,.3)'}`, borderRadius: 12, padding: 18, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 32, fontWeight: 500, color: adjType === 'credit' ? '#2dd4a0' : '#f0544f' }}>
                  {adjType === 'credit' ? '+' : '-'}${parseFloat(adjAmt || '0').toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 12, color: '#5a677d', marginTop: 4 }}>
                  Après : <strong style={{ color: '#edf0f7' }}>{fmt(Math.max(0, (adjUser.wallets?.balance || 0) + (adjType === 'credit' ? 1 : -1) * parseFloat(adjAmt || '0')))}</strong>
                </div>
              </div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Montant (USD)</label>
              <input type="number" style={{ ...iStyle, marginBottom: 8 }} value={adjAmt} onChange={e => setAdjAmt(e.target.value)} placeholder="Ex : 500" />
              <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
                {[50, 100, 250, 500, 1000].map(v => <button key={v} onClick={() => setAdjAmt(String(v))} style={{ padding: '5px 11px', borderRadius: 7, border: '1px solid rgba(255,255,255,.07)', background: 'none', color: '#8a96aa', fontSize: 11, cursor: 'pointer' }}>${v}</button>)}
              </div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Motif</label>
              <select style={{ ...iStyle, marginBottom: 14 }} value={adjReason} onChange={e => setAdjReason(e.target.value)}>
                {[['bonus', 'Bonus / Promotion'], ['correction', "Correction d'erreur"], ['compensation', 'Compensation / Litige'], ['deposit_manual', 'Dépôt manuel vérifié'], ['withdrawal_manual', 'Retrait manuel'], ['fee', 'Frais de gestion'], ['profit_share', 'Partage de profits'], ['other', 'Autre']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Note interne (min 10 car.)</label>
              <textarea style={{ ...iStyle, resize: 'vertical', minHeight: 80, marginBottom: 14 } as React.CSSProperties} value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="Décrivez la raison précise..." />
              <div style={{ background: 'rgba(240,180,60,.06)', border: '1px solid rgba(240,180,60,.2)', borderRadius: 10, padding: '11px 14px', fontSize: 12, color: '#f0b43c', marginBottom: 16, lineHeight: 1.6 }}>
                <strong style={{ display: 'block', marginBottom: 2 }}>⚠ Traçabilité obligatoire</strong>Toute modification est enregistrée dans audit_logs Supabase et synchronisée avec Vertex Mentor.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setAdjUser(null)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, color: '#8a96aa', cursor: 'pointer' }}>Annuler</button>
                <button onClick={adjustBalance} disabled={loading} style={{ flex: 2, padding: 12, background: adjType === 'credit' ? 'rgba(45,212,160,.12)' : 'rgba(240,84,79,.12)', border: `1px solid ${adjType === 'credit' ? 'rgba(45,212,160,.3)' : 'rgba(240,84,79,.3)'}`, borderRadius: 10, color: adjType === 'credit' ? '#2dd4a0' : '#f0544f', fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: 'pointer', opacity: loading ? .7 : 1 }}>
                  {loading ? 'Traitement...' : `✓ Confirmer le ${adjType === 'credit' ? 'crédit' : 'débit'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
// Pegazus Trading Terminal
// Données marché : flux interne (pas de mention source externe)
import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { fmt } from '@/lib/utils'

type Candle   = { time:number; open:number; high:number; low:number; close:number }
type Tick     = { bid:number; ask:number; time:number }
type Position = { id:string; symbol:string; type:'BUY'|'SELL'; lot:number; openPrice:number; currentPrice:number; sl:number; tp:number; pl:number; pip:number; openTime:string }
type ClosedTrade = Position & { closePrice:number; closePL:number; closeTime:string; result:'WIN'|'LOSS' }

const SYMBOLS = [
  { id:'R_10',  label:'EUR/USD',   display:'EURUSD',  pip:0.0001 },
  { id:'R_25',  label:'GBP/USD',   display:'GBPUSD',  pip:0.0001 },
  { id:'R_50',  label:'USD/JPY',   display:'USDJPY',  pip:0.01   },
  { id:'R_75',  label:'XAU/USD',   display:'XAUUSD',  pip:0.01   },
  { id:'R_100', label:'BTC/USD',   display:'BTCUSD',  pip:1      },
  { id:'1HZ10V',label:'USD/CAD',   display:'USDCAD',  pip:0.0001 },
]
const INTERVALS = [
  { id:60,    label:'M1'  },
  { id:300,   label:'M5'  },
  { id:900,   label:'M15' },
  { id:3600,  label:'H1'  },
  { id:86400, label:'D1'  },
]

export default function TradingClient({ user, wallet: initWallet }: { user:any; wallet:any }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const wsRef       = useRef<WebSocket|null>(null)
  const candlesRef  = useRef<Candle[]>([])
  const robotRef    = useRef(false)
  const robotTimer  = useRef<ReturnType<typeof setInterval>|null>(null)

  const [symbol,    setSymbol]    = useState('R_50')
  const [interval,  setInterval2] = useState(60)
  const [tick,      setTick]      = useState<Tick|null>(null)
  const [candles,   setCandles]   = useState<Candle[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([])
  const [wallet,    setWallet]    = useState(initWallet)
  const [connected, setConnected] = useState(false)
  const [tab,       setTab]       = useState<'chart'|'robot'|'history'>('chart')
  const [orderType, setOrderType] = useState<'BUY'|'SELL'>('BUY')
  const [lot,       setLot]       = useState('0.01')
  const [slPips,    setSlPips]    = useState('15')
  const [tpPips,    setTpPips]    = useState('30')
  const [robotOn,   setRobotOn]   = useState(false)
  const [robotLog,  setRobotLog]  = useState<string[]>([])
  const [emaFast,   setEmaFast]   = useState(5)
  const [emaSlow,   setEmaSlow]   = useState(13)
  const [showEMA,   setShowEMA]   = useState(true)
  const [showRSI,   setShowRSI]   = useState(true)

  // ── WebSocket (Deriv caché — aucune mention dans l'UI) ────────
  const connectWS = useCallback(() => {
    if (wsRef.current) wsRef.current.close()
    // Source de données interne Pegazus
    const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089')
    wsRef.current = ws
    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }))
      ws.send(JSON.stringify({ ticks_history: symbol, end:'latest', count:200, granularity:interval, style:'candles', subscribe:1 }))
    }
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.msg_type === 'candles' && msg.candles) {
        const cs = msg.candles.map((c:any) => ({ time:c.epoch, open:+c.open, high:+c.high, low:+c.low, close:+c.close }))
        candlesRef.current = cs; setCandles([...cs])
      }
      if (msg.msg_type === 'ohlc' && msg.ohlc) {
        const o = msg.ohlc
        const nc = { time:+o.epoch, open:+o.open, high:+o.high, low:+o.low, close:+o.close }
        candlesRef.current = [...candlesRef.current.slice(-199), nc]
        setCandles([...candlesRef.current])
      }
      if (msg.msg_type === 'tick' && msg.tick) {
        const t = msg.tick
        const newTick = { bid:+t.bid, ask:+t.ask, time:+t.epoch }
        setTick(newTick)
        // MAJ P&L positions + vérif SL/TP
        setPositions(prev => {
          const toClose: { pos:Position; reason:'SL'|'TP' }[] = []
          const updated = prev.map(p => {
            const cur = p.type==='BUY' ? +t.bid : +t.ask
            const sym = SYMBOLS.find(s=>s.id===p.symbol)
            const pip = sym?.pip || 0.0001
            const pipVal = p.type==='BUY' ? (cur-p.openPrice)/pip : (p.openPrice-cur)/pip
            const pl = parseFloat((pipVal * p.lot * 10).toFixed(2))
            const updated = { ...p, currentPrice:cur, pl, pip:parseFloat(pipVal.toFixed(1)) }
            if (p.type==='BUY'  && cur <= p.sl) toClose.push({ pos:updated, reason:'SL' })
            if (p.type==='BUY'  && cur >= p.tp) toClose.push({ pos:updated, reason:'TP' })
            if (p.type==='SELL' && cur >= p.sl) toClose.push({ pos:updated, reason:'SL' })
            if (p.type==='SELL' && cur <= p.tp) toClose.push({ pos:updated, reason:'TP' })
            return updated
          })
          // Fermer les positions SL/TP automatiquement
          if (toClose.length > 0) {
            toClose.forEach(({ pos, reason }) => {
              setTimeout(() => autoClosePosition(pos, reason), 0)
            })
            return updated.filter(p => !toClose.find(c => c.pos.id === p.id))
          }
          return updated
        })
      }
    }
    ws.onclose = () => { setConnected(false); setTimeout(connectWS, 3000) }
    ws.onerror = () => ws.close()
  }, [symbol, interval])

  useEffect(() => {
    connectWS()
    return () => { wsRef.current?.close(); if(robotTimer.current) clearInterval(robotTimer.current) }
  }, [connectWS])

  // ── Fermeture automatique SL/TP → notification admin ─────────
  const autoClosePosition = useCallback(async (pos: Position, reason: 'SL'|'TP') => {
    const isWin = reason === 'TP'
    const pl    = pos.pl

    setClosedTrades(prev => [{
      ...pos, closePrice: pos.currentPrice, closePL: pl,
      closeTime: new Date().toLocaleTimeString('fr-FR'),
      result: isWin ? 'WIN' : 'LOSS'
    }, ...prev.slice(0,49)])

    // Notifier l'admin ET mettre à jour le solde automatiquement
    try {
      await fetch('/api/trading/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId:  pos.id,
          symbol:      pos.symbol,
          type:        pos.type,
          lot:         pos.lot,
          openPrice:   pos.openPrice,
          closePrice:  pos.currentPrice,
          pl,
          reason,
          isWin,
        })
      })
      // MAJ wallet local
      setWallet((prev:any) => ({ ...prev, balance: Math.max(0, prev.balance + pl) }))
    } catch (err) {
      console.error('Erreur sync position')
    }

    if (isWin) toast.success(`✅ TP atteint — Gain : ${fmt(pl)}`)
    else       toast.error(`❌ SL atteint — Perte : ${fmt(pl)}`)

    addLog(reason === 'TP'
      ? `✅ TP atteint ${pos.type} ${SYMBOLS.find(s=>s.id===pos.symbol)?.display} +${fmt(pl)}`
      : `❌ SL atteint ${pos.type} ${SYMBOLS.find(s=>s.id===pos.symbol)?.display} ${fmt(pl)}`
    )
  }, [])

  // ── Fermeture manuelle ────────────────────────────────────────
  const closePosition = useCallback(async (id: string) => {
    setPositions(prev => {
      const pos = prev.find(p => p.id === id)
      if (!pos) return prev
      autoClosePosition({ ...pos }, pos.pl >= 0 ? 'TP' : 'SL')
      return prev.filter(p => p.id !== id)
    })
  }, [autoClosePosition])

  // ── EMA ───────────────────────────────────────────────────────
  function calcEMA(data:number[], period:number): number[] {
    if (data.length < period) return []
    const k = 2/(period+1)
    const ema = [data.slice(0,period).reduce((a,b)=>a+b,0)/period]
    for (let i=period; i<data.length; i++) ema.push(data[i]*k+ema[ema.length-1]*(1-k))
    return ema
  }
  function calcRSI(data:number[], period=14): number[] {
    if (data.length < period+1) return []
    const rsi:number[] = []
    let gains=0, losses=0
    for (let i=1; i<=period; i++) { const d=data[i]-data[i-1]; d>0?gains+=d:losses-=d }
    let ag=gains/period, al=losses/period
    rsi.push(100-100/(1+(al===0?9999:ag/al)))
    for (let i=period+1; i<data.length; i++) {
      const d=data[i]-data[i-1]
      ag=(ag*(period-1)+(d>0?d:0))/period
      al=(al*(period-1)+(d<0?-d:0))/period
      rsi.push(100-100/(1+(al===0?9999:ag/al)))
    }
    return rsi
  }

  // ── Canvas Chart ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || candles.length < 2) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width  = canvas.offsetWidth
    const H = canvas.height = canvas.offsetHeight
    const chartH = showRSI ? H*0.70 : H-50
    const rsiH   = showRSI ? H*0.22 : 0
    const padL=62, padR=82, padT=22

    ctx.fillStyle='#06080e'; ctx.fillRect(0,0,W,H)

    const vis = candles.slice(-80)
    const priceMin = Math.min(...vis.map(c=>c.low))  * 0.9996
    const priceMax = Math.max(...vis.map(c=>c.high)) * 1.0004
    const priceRange = priceMax - priceMin
    const cw   = (W-padL-padR)/vis.length
    const toY  = (p:number) => padT+((priceMax-p)/priceRange)*(chartH-padT-28)
    const toX  = (i:number) => padL+i*cw+cw/2

    // Grille horizontale
    for (let i=0; i<=5; i++) {
      const y = padT+(i/5)*(chartH-padT-28)
      ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1
      ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke()
      const price = priceMax-(i/5)*priceRange
      ctx.fillStyle='#4a5568'; ctx.font='10px monospace'
      ctx.fillText(price.toFixed(SYMBOLS.find(s=>s.id===symbol)?.pip===1?0:3), W-padR+4, y+4)
    }
    // Grille verticale
    const step = Math.ceil(vis.length/6)
    vis.forEach((_,i) => {
      if (i%step!==0) return
      const x = toX(i)
      ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=1
      ctx.beginPath(); ctx.moveTo(x,padT); ctx.lineTo(x,chartH-28); ctx.stroke()
      const d = new Date(vis[i].time*1000)
      ctx.fillStyle='#4a5568'; ctx.font='9px monospace'
      ctx.fillText(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`, x-14, chartH-14)
    })

    // Bougies
    vis.forEach((c,i) => {
      const x=toX(i), oY=toY(c.open), cY=toY(c.close), hY=toY(c.high), lY=toY(c.low)
      const bull=c.close>=c.open, col=bull?'#2dd4a0':'#f0544f'
      ctx.strokeStyle=col; ctx.lineWidth=1
      ctx.beginPath(); ctx.moveTo(x,hY); ctx.lineTo(x,Math.min(oY,cY)); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x,Math.max(oY,cY)); ctx.lineTo(x,lY); ctx.stroke()
      ctx.fillStyle=col
      ctx.fillRect(x-cw*0.36, Math.min(oY,cY), cw*0.72, Math.max(Math.abs(cY-oY),1))
    })

    // EMA
    if (showEMA) {
      const allC = candles.map(c=>c.close)
      ;[[calcEMA(allC,emaFast),'#d4a843',1.5],[calcEMA(allC,emaSlow),'#4f8ef0',1.5]].forEach(([arr,col,lw])=>{
        const a = (arr as number[]).slice(-vis.length)
        if (a.length < 2) return
        ctx.beginPath(); ctx.strokeStyle=col as string; ctx.lineWidth=lw as number
        const off=vis.length-a.length
        a.forEach((v,i)=>{ const x=toX(i+off),y=toY(v); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) })
        ctx.stroke()
      })
      // Légende
      ctx.fillStyle='#d4a843'; ctx.font='bold 10px sans-serif'
      ctx.fillText(`EMA${emaFast}`, padL+4, padT+12)
      ctx.fillStyle='#4f8ef0'
      ctx.fillText(`EMA${emaSlow}`, padL+4+52, padT+12)
    }

    // Prix courant
    if (tick) {
      const curY=toY(tick.bid)
      const bull=tick.bid>=(candles[candles.length-1]?.open||tick.bid)
      const lineCol=bull?'#2dd4a0':'#f0544f'
      ctx.setLineDash([4,4]); ctx.strokeStyle=lineCol; ctx.lineWidth=1
      ctx.beginPath(); ctx.moveTo(padL,curY); ctx.lineTo(W-padR,curY); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle=lineCol
      ctx.fillRect(W-padR,curY-10,padR,20)
      ctx.fillStyle='#06080e'; ctx.font='bold 10px monospace'
      const dp = SYMBOLS.find(s=>s.id===symbol)?.pip===1 ? 0 : 3
      ctx.fillText(tick.bid.toFixed(dp), W-padR+4, curY+4)
    }

    // Label
    const sym = SYMBOLS.find(s=>s.id===symbol)
    ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font='bold 13px sans-serif'
    ctx.fillText(`${sym?.display||symbol}  ${INTERVALS.find(i=>i.id===interval)?.label}`, padL+4, padT+12+(showEMA?0:0))

    // RSI
    if (showRSI) {
      const rsiY0=chartH+6, rsiYH=rsiH-10
      ctx.fillStyle='#080c14'; ctx.fillRect(0,rsiY0,W,rsiYH+10)
      ;[[70,'rgba(240,84,79,.5)'],[50,'rgba(255,255,255,.08)'],[30,'rgba(45,212,160,.5)']].forEach(([v,col])=>{
        const y=rsiY0+(1-(v as number)/100)*rsiYH
        ctx.strokeStyle=col as string; ctx.lineWidth=1; ctx.setLineDash([3,3])
        ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke()
        ctx.fillStyle=col as string; ctx.font='9px monospace'
        ctx.fillText(String(v), W-padR+4, y+3)
      })
      ctx.setLineDash([])
      const rsiVals=calcRSI(candles.map(c=>c.close)).slice(-vis.length)
      if (rsiVals.length>1) {
        ctx.beginPath(); ctx.lineWidth=1.5
        const off=vis.length-rsiVals.length
        rsiVals.forEach((v,i)=>{
          const x=toX(i+off), y=rsiY0+(1-v/100)*rsiYH
          const col=v>70?'#f0544f':v<30?'#2dd4a0':'#f0b43c'
          if (i===0) { ctx.strokeStyle=col; ctx.moveTo(x,y) }
          else ctx.lineTo(x,y)
        })
        ctx.stroke()
        const cur=rsiVals[rsiVals.length-1]
        const col=cur>70?'#f0544f':cur<30?'#2dd4a0':'#f0b43c'
        ctx.fillStyle=col; ctx.font='bold 10px monospace'
        ctx.fillText(`RSI ${cur.toFixed(1)}`, padL+4, rsiY0+12)
      }
    }
  }, [candles, tick, showEMA, showRSI, emaFast, emaSlow, symbol, interval])

  // ── Placer un ordre ───────────────────────────────────────────
  function placeOrder() {
    if (!tick) { toast.error('Marché non connecté'); return }
    const lotN = parseFloat(lot)
    if (!lotN||lotN<0.01||lotN>10) { toast.error('Lot entre 0.01 et 10'); return }
    const price = orderType==='BUY' ? tick.ask : tick.bid
    const pip   = SYMBOLS.find(s=>s.id===symbol)?.pip||0.0001
    const pos: Position = {
      id: Date.now().toString(), symbol, type:orderType, lot:lotN,
      openPrice:price, currentPrice:price,
      sl: orderType==='BUY' ? price-parseFloat(slPips)*pip : price+parseFloat(slPips)*pip,
      tp: orderType==='BUY' ? price+parseFloat(tpPips)*pip : price-parseFloat(tpPips)*pip,
      pl:0, pip:0, openTime:new Date().toLocaleTimeString('fr-FR'),
    }
    setPositions(p=>[...p,pos])
    const sym = SYMBOLS.find(s=>s.id===symbol)
    toast.success(`${orderType} ${lotN} lot ${sym?.display} @ ${price.toFixed(3)}`)
    addLog(`📥 Ordre ${orderType} ${lotN} lot ${sym?.display} @ ${price.toFixed(3)}`)
  }

  // ── Robot ─────────────────────────────────────────────────────
  function toggleRobot() {
    if (robotOn) {
      robotRef.current=false; setRobotOn(false)
      if (robotTimer.current) clearInterval(robotTimer.current)
      addLog('⏹ Robot arrêté')
    } else {
      robotRef.current=true; setRobotOn(true)
      addLog(`▶ Robot démarré — EMA${emaFast}/${emaSlow} + RSI7`)
      robotTimer.current = setInterval(() => {
        if (!robotRef.current || candlesRef.current.length<20) return
        const closes = candlesRef.current.map(c=>c.close)
        const fast=calcEMA(closes,emaFast), slow=calcEMA(closes,emaSlow)
        const rsi=calcRSI(closes,7)
        if (fast.length<2||slow.length<2||!rsi.length) return
        const f0=fast[fast.length-1],f1=fast[fast.length-2]
        const s0=slow[slow.length-1],s1=slow[slow.length-2]
        const rsiNow=rsi[rsi.length-1]
        const crossUp=f1<s1&&f0>s0, crossDown=f1>s1&&f0<s0
        addLog(`🔍 EMA${emaFast}:${f0.toFixed(3)} EMA${emaSlow}:${s0.toFixed(3)} RSI:${rsiNow.toFixed(1)}`)
        if (crossUp&&rsiNow>50&&rsiNow<65) {
          setPositions(prev=>{
            if (prev.filter(p=>p.type==='BUY').length>=2) { addLog('⛔ Max BUY atteint'); return prev }
            const price=tick?.ask||closes[closes.length-1]
            const pip=SYMBOLS.find(s=>s.id===symbol)?.pip||0.0001
            const np:Position={id:Date.now().toString(),symbol,type:'BUY',lot:0.01,openPrice:price,currentPrice:price,sl:price-15*pip,tp:price+30*pip,pl:0,pip:0,openTime:new Date().toLocaleTimeString('fr-FR')}
            addLog(`📈 Robot BUY 0.01 @ ${price.toFixed(3)}`)
            return [...prev,np]
          })
        } else if (crossDown&&rsiNow<50&&rsiNow>35) {
          setPositions(prev=>{
            if (prev.filter(p=>p.type==='SELL').length>=2) { addLog('⛔ Max SELL atteint'); return prev }
            const price=tick?.bid||closes[closes.length-1]
            const pip=SYMBOLS.find(s=>s.id===symbol)?.pip||0.0001
            const np:Position={id:Date.now().toString(),symbol,type:'SELL',lot:0.01,openPrice:price,currentPrice:price,sl:price+15*pip,tp:price-30*pip,pl:0,pip:0,openTime:new Date().toLocaleTimeString('fr-FR')}
            addLog(`📉 Robot SELL 0.01 @ ${price.toFixed(3)}`)
            return [...prev,np]
          })
        }
      }, 5000)
    }
  }

  function addLog(msg:string) {
    const ts=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
    setRobotLog(p=>[`[${ts}] ${msg}`,...p.slice(0,49)])
  }

  const totalPL  = positions.reduce((s,p)=>s+p.pl,0)
  const equity   = (wallet?.balance||0)+totalPL
  const dp       = SYMBOLS.find(s=>s.id===symbol)?.pip===1?0:3
  const sInput   = { background:'#111828', border:'1px solid rgba(255,255,255,.08)', borderRadius:8, padding:'9px 11px', color:'#edf0f7', fontSize:13, outline:'none', width:'100%', fontFamily:"'DM Mono',monospace" }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#06080e', fontFamily:"'DM Sans',sans-serif", overflow:'hidden' }}>

      {/* ── TOPBAR ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,.07)', background:'#0c0f1a', flexShrink:0, flexWrap:'wrap' }}>
        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:6, flexShrink:0 }}>
          <img src="/logo.png" alt="Pegazus" style={{ width:32, height:32, objectFit:'contain', borderRadius:6 }} />
          <span style={{ fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:'#d4a843' }}>Pegazus</span>
        </div>

        {/* Instruments */}
        <div style={{ display:'flex', gap:3 }}>
          {SYMBOLS.map(s=>(
            <button key={s.id} onClick={()=>setSymbol(s.id)} style={{ padding:'4px 9px',borderRadius:6,border:`1px solid ${symbol===s.id?'#d4a843':'rgba(255,255,255,.07)'}`,background:symbol===s.id?'rgba(212,168,67,.12)':'transparent',color:symbol===s.id?'#d4a843':'#5a677d',fontSize:11,fontWeight:600,cursor:'pointer' }}>
              {s.display}
            </button>
          ))}
        </div>

        {/* Timeframes */}
        <div style={{ display:'flex', gap:3, marginLeft:4 }}>
          {INTERVALS.map(i=>(
            <button key={i.id} onClick={()=>setInterval2(i.id)} style={{ padding:'4px 8px',borderRadius:6,border:`1px solid ${interval===i.id?'#4f8ef0':'rgba(255,255,255,.07)'}`,background:interval===i.id?'rgba(79,142,240,.12)':'transparent',color:interval===i.id?'#4f8ef0':'#5a677d',fontSize:11,fontWeight:600,cursor:'pointer' }}>
              {i.label}
            </button>
          ))}
        </div>

        {/* Indicateurs */}
        <div style={{ display:'flex', gap:4, marginLeft:4 }}>
          {[['EMA','#d4a843',showEMA,setShowEMA],['RSI','#f0b43c',showRSI,setShowRSI]].map(([lbl,col,on,set])=>(
            <button key={lbl as string} onClick={()=>(set as any)(!on)} style={{ padding:'4px 9px',borderRadius:6,border:`1px solid ${on?col:'rgba(255,255,255,.07)'}`,background:on?`rgba(${col==='#d4a843'?'212,168,67':'240,180,60'},.1)`:'transparent',color:on?col as string:'#5a677d',fontSize:11,cursor:'pointer' }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Statut */}
        <div style={{ display:'flex',alignItems:'center',gap:5,marginLeft:4 }}>
          <div style={{ width:6,height:6,borderRadius:'50%',background:connected?'#2dd4a0':'#f0544f',boxShadow:connected?'0 0 5px #2dd4a0':'none' }}/>
          <span style={{ fontSize:10,color:connected?'#2dd4a0':'#5a677d' }}>{connected?'En direct':'Connexion...'}</span>
        </div>

        {/* Wallet mini */}
        <div style={{ marginLeft:'auto',display:'flex',gap:14,padding:'5px 12px',background:'rgba(255,255,255,.04)',borderRadius:8,border:'1px solid rgba(255,255,255,.06)' }}>
          {[['Balance',fmt(wallet?.balance||0),'#edf0f7'],['Équité',fmt(equity),equity>=(wallet?.balance||0)?'#2dd4a0':'#f0544f'],['P&L',`${totalPL>=0?'+':''}${fmt(totalPL)}`,totalPL>=0?'#2dd4a0':'#f0544f']].map(([l,v,c])=>(
            <div key={l}><div style={{ fontSize:9,color:'#5a677d',textTransform:'uppercase',letterSpacing:'.05em' }}>{l}</div><div style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:c as string,fontWeight:600 }}>{v}</div></div>
          ))}
        </div>

        <div style={{ display:'flex',gap:6 }}>
          <a href="/wallet" style={{ fontSize:11,color:'#5a677d',textDecoration:'none',padding:'4px 9px',border:'1px solid rgba(255,255,255,.07)',borderRadius:6 }}>← Wallet</a>
          {(user.role==='ADMIN'||user.role==='SUPERADMIN')&&<a href="/admin" style={{ fontSize:11,color:'#d4a843',textDecoration:'none',padding:'4px 9px',border:'1px solid rgba(212,168,67,.3)',borderRadius:6 }}>Admin</a>}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 280px', overflow:'hidden' }}>

        {/* Colonne gauche */}
        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Bande prix */}
          {tick && (
            <div style={{ display:'flex',alignItems:'center',gap:16,padding:'7px 14px',background:'#090d16',borderBottom:'1px solid rgba(255,255,255,.05)',flexShrink:0 }}>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color:'#edf0f7' }}>{tick.bid.toFixed(dp)}</div>
              <div style={{ display:'flex',gap:12,fontSize:12 }}>
                <span style={{ color:'#2dd4a0' }}>Achat: <b>{tick.ask.toFixed(dp)}</b></span>
                <span style={{ color:'#f0544f' }}>Vente: <b>{tick.bid.toFixed(dp)}</b></span>
                <span style={{ color:'#5a677d' }}>Écart: <b style={{ color:'#f0b43c' }}>{((tick.ask-tick.bid)/(SYMBOLS.find(s=>s.id===symbol)?.pip||0.0001)).toFixed(1)} pts</b></span>
              </div>
              {/* Tabs */}
              <div style={{ marginLeft:'auto',display:'flex',gap:4 }}>
                {[['chart','📈 Graphique'],['robot',`🤖 Robot${robotOn?' ●':''}`],['history','📋 Historique']].map(([t,l])=>(
                  <button key={t} onClick={()=>setTab(t as any)} style={{ padding:'4px 11px',borderRadius:6,border:`1px solid ${tab===t?'#d4a843':'rgba(255,255,255,.07)'}`,background:tab===t?'rgba(212,168,67,.1)':'transparent',color:tab===t?'#d4a843':'#5a677d',fontSize:11,fontWeight:600,cursor:'pointer' }}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Chart */}
          {tab==='chart' && (
            <div style={{ flex:1,position:'relative',overflow:'hidden' }}>
              <canvas ref={canvasRef} style={{ width:'100%',height:'100%',display:'block' }} />
              {!connected&&<div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(6,8,14,.8)' }}><div style={{ textAlign:'center',color:'#5a677d' }}><div style={{ fontSize:28,marginBottom:8 }}>📡</div><div style={{ fontSize:13 }}>Connexion aux marchés...</div></div></div>}
            </div>
          )}

          {/* Robot tab */}
          {tab==='robot' && (
            <div style={{ flex:1,overflow:'auto',padding:14 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                <div style={{ background:'#0c0f1a',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,padding:18 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:10 }}>🤖 Robot Pegazus</div>
                  <div style={{ fontSize:12,color:'#5a677d',marginBottom:14,lineHeight:1.6 }}>Stratégie EMA{emaFast}/{emaSlow} + RSI(7). Exécution automatique sur signal. Lot fixe 0.01. Max 2 positions/sens.</div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14 }}>
                    {[['EMA rapide',emaFast,setEmaFast],['EMA lente',emaSlow,setEmaSlow]].map(([l,v,fn])=>(
                      <div key={l as string}><div style={{ fontSize:10,color:'#5a677d',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4 }}>{l}</div><input type="number" style={sInput} value={v as number} onChange={e=>(fn as any)(+e.target.value)} min={2} max={200} /></div>
                    ))}
                  </div>
                  <button onClick={toggleRobot} style={{ width:'100%',padding:13,borderRadius:9,border:`1px solid ${robotOn?'rgba(240,84,79,.4)':'rgba(45,212,160,.4)'}`,background:robotOn?'rgba(240,84,79,.1)':'rgba(45,212,160,.1)',color:robotOn?'#f0544f':'#2dd4a0',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:"'Syne',sans-serif" }}>
                    {robotOn?'⏹ Arrêter le robot':'▶ Démarrer le robot'}
                  </button>
                </div>
                <div style={{ background:'#0c0f1a',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,padding:18 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:12 }}>📊 Session en cours</div>
                  {[['Positions ouvertes',String(positions.length),'#edf0f7'],['P&L flottant',`${totalPL>=0?'+':''}${fmt(totalPL)}`,totalPL>=0?'#2dd4a0':'#f0544f'],['Trades fermés',String(closedTrades.length),'#d4a843'],['Balance',fmt(wallet?.balance||0),'#edf0f7'],['Équité',fmt(equity),equity>=(wallet?.balance||0)?'#2dd4a0':'#f0544f'],['Robot',robotOn?'ACTIF ●':'ARRÊTÉ',robotOn?'#2dd4a0':'#5a677d']].map(([l,v,c])=>(
                    <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,.04)',fontSize:12 }}>
                      <span style={{ color:'#5a677d' }}>{l}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace",color:c as string,fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:'#0c0f1a',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,overflow:'hidden' }}>
                <div style={{ padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,.07)',fontSize:12,fontWeight:700,fontFamily:"'Syne',sans-serif" }}>Journal du robot</div>
                <div style={{ height:200,overflowY:'auto',padding:'6px 0',fontFamily:"'DM Mono',monospace",fontSize:11 }}>
                  {robotLog.length===0?<div style={{ padding:'16px 14px',color:'#5a677d' }}>Robot non démarré...</div>
                  :robotLog.map((l,i)=>(
                    <div key={i} style={{ padding:'2px 14px',color:l.includes('BUY')||l.includes('✅')?'#2dd4a0':l.includes('SELL')||l.includes('❌')||l.includes('⛔')?'#f0544f':l.includes('▶')||l.includes('Signal')?'#d4a843':'#5a677d' }}>{l}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Historique */}
          {tab==='history' && (
            <div style={{ flex:1,overflow:'auto',padding:14 }}>
              <div style={{ background:'#0c0f1a',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,overflow:'hidden' }}>
                <div style={{ padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,.07)',fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span>📋 Trades fermés ({closedTrades.length})</span>
                  {closedTrades.length>0&&<span style={{ fontFamily:"'DM Mono',monospace",fontSize:13,color:closedTrades.reduce((s,t)=>s+t.closePL,0)>=0?'#2dd4a0':'#f0544f' }}>
                    Total : {closedTrades.reduce((s,t)=>s+t.closePL,0)>=0?'+':''}{fmt(closedTrades.reduce((s,t)=>s+t.closePL,0))}
                  </span>}
                </div>
                {closedTrades.length===0?<div style={{ padding:32,textAlign:'center',color:'#5a677d',fontSize:13 }}>Aucun trade fermé dans cette session</div>
                :<table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                  <thead><tr style={{ background:'rgba(255,255,255,.02)' }}>{['Symbole','Type','Lot','Ouverture','Clôture','Résultat','P&L','Heure'].map(h=><th key={h} style={{ padding:'8px 12px',textAlign:'left',color:'#5a677d',fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {closedTrades.map(t=>(
                      <tr key={t.id} style={{ borderTop:'1px solid rgba(255,255,255,.03)' }}>
                        <td style={{ padding:'9px 12px',fontWeight:600 }}>{SYMBOLS.find(s=>s.id===t.symbol)?.display}</td>
                        <td style={{ padding:'9px 12px' }}><span style={{ padding:'2px 7px',borderRadius:4,background:t.type==='BUY'?'rgba(45,212,160,.12)':'rgba(240,84,79,.12)',color:t.type==='BUY'?'#2dd4a0':'#f0544f',fontWeight:700,fontSize:10 }}>{t.type}</span></td>
                        <td style={{ padding:'9px 12px',fontFamily:"'DM Mono',monospace" }}>{t.lot}</td>
                        <td style={{ padding:'9px 12px',fontFamily:"'DM Mono',monospace" }}>{t.openPrice.toFixed(dp)}</td>
                        <td style={{ padding:'9px 12px',fontFamily:"'DM Mono',monospace" }}>{t.closePrice.toFixed(dp)}</td>
                        <td style={{ padding:'9px 12px' }}><span style={{ padding:'2px 7px',borderRadius:4,background:t.result==='WIN'?'rgba(45,212,160,.12)':'rgba(240,84,79,.12)',color:t.result==='WIN'?'#2dd4a0':'#f0544f',fontWeight:700,fontSize:10 }}>{t.result}</span></td>
                        <td style={{ padding:'9px 12px',fontFamily:"'DM Mono',monospace",fontWeight:700,color:t.closePL>=0?'#2dd4a0':'#f0544f' }}>{t.closePL>=0?'+':''}{fmt(t.closePL)}</td>
                        <td style={{ padding:'9px 12px',color:'#5a677d' }}>{t.closeTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
              </div>
            </div>
          )}

          {/* Positions ouvertes */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,.07)',flexShrink:0,maxHeight:160,overflow:'auto' }}>
            <div style={{ padding:'7px 14px',background:'#090d16',borderBottom:'1px solid rgba(255,255,255,.04)',fontSize:10,fontWeight:600,color:'#5a677d',textTransform:'uppercase',letterSpacing:'.06em',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <span>Positions ouvertes ({positions.length})</span>
              {positions.length>0&&<span style={{ fontFamily:"'DM Mono',monospace",color:totalPL>=0?'#2dd4a0':'#f0544f' }}>P&L : {totalPL>=0?'+':''}{fmt(totalPL)}</span>}
            </div>
            {positions.length===0?<div style={{ padding:'10px 14px',color:'#5a677d',fontSize:12 }}>Aucune position ouverte</div>
            :<table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
              <thead><tr style={{ background:'rgba(255,255,255,.02)' }}>{['Instrument','Dir.','Lot','Ouv.','Actuel','SL','TP','Pips','P&L',''].map(h=><th key={h} style={{ padding:'5px 10px',textAlign:'left',color:'#5a677d',fontSize:9,fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
              <tbody>
                {positions.map(p=>(
                  <tr key={p.id} style={{ borderTop:'1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding:'7px 10px',fontWeight:600 }}>{SYMBOLS.find(s=>s.id===p.symbol)?.display}</td>
                    <td style={{ padding:'7px 10px' }}><span style={{ padding:'2px 6px',borderRadius:3,background:p.type==='BUY'?'rgba(45,212,160,.15)':'rgba(240,84,79,.15)',color:p.type==='BUY'?'#2dd4a0':'#f0544f',fontWeight:700,fontSize:9 }}>{p.type}</span></td>
                    <td style={{ padding:'7px 10px',fontFamily:"'DM Mono',monospace" }}>{p.lot}</td>
                    <td style={{ padding:'7px 10px',fontFamily:"'DM Mono',monospace" }}>{p.openPrice.toFixed(dp)}</td>
                    <td style={{ padding:'7px 10px',fontFamily:"'DM Mono',monospace" }}>{p.currentPrice.toFixed(dp)}</td>
                    <td style={{ padding:'7px 10px',fontFamily:"'DM Mono',monospace",color:'#f0544f' }}>{p.sl.toFixed(dp)}</td>
                    <td style={{ padding:'7px 10px',fontFamily:"'DM Mono',monospace",color:'#2dd4a0' }}>{p.tp.toFixed(dp)}</td>
                    <td style={{ padding:'7px 10px',fontFamily:"'DM Mono',monospace",color:p.pip>=0?'#2dd4a0':'#f0544f' }}>{p.pip>=0?'+':''}{p.pip}</td>
                    <td style={{ padding:'7px 10px',fontFamily:"'DM Mono',monospace",fontWeight:700,color:p.pl>=0?'#2dd4a0':'#f0544f' }}>{p.pl>=0?'+':''}{fmt(p.pl)}</td>
                    <td style={{ padding:'7px 10px' }}><button onClick={()=>closePosition(p.id)} style={{ padding:'2px 8px',background:'rgba(240,84,79,.1)',border:'1px solid rgba(240,84,79,.3)',borderRadius:4,color:'#f0544f',fontSize:10,fontWeight:600,cursor:'pointer' }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </div>
        </div>

        {/* ── PANNEAU DROIT — ORDRE ── */}
        <div style={{ borderLeft:'1px solid rgba(255,255,255,.07)',background:'#0c0f1a',display:'flex',flexDirection:'column',overflow:'auto' }}>
          {/* Prix live */}
          {tick&&(
            <div style={{ padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,.07)' }}>
              <div style={{ fontSize:11,color:'#5a677d',marginBottom:6,fontWeight:600 }}>{SYMBOLS.find(s=>s.id===symbol)?.display}</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                <div style={{ background:'rgba(45,212,160,.07)',border:'1px solid rgba(45,212,160,.2)',borderRadius:8,padding:'9px',textAlign:'center',cursor:'pointer' }} onClick={()=>setOrderType('BUY')}>
                  <div style={{ fontSize:9,color:'#2dd4a0',fontWeight:600,marginBottom:3,letterSpacing:'.06em' }}>ACHAT</div>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:17,fontWeight:700,color:'#2dd4a0' }}>{tick.ask.toFixed(dp)}</div>
                </div>
                <div style={{ background:'rgba(240,84,79,.07)',border:'1px solid rgba(240,84,79,.2)',borderRadius:8,padding:'9px',textAlign:'center',cursor:'pointer' }} onClick={()=>setOrderType('SELL')}>
                  <div style={{ fontSize:9,color:'#f0544f',fontWeight:600,marginBottom:3,letterSpacing:'.06em' }}>VENTE</div>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:17,fontWeight:700,color:'#f0544f' }}>{tick.bid.toFixed(dp)}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ padding:'14px',flex:1,overflow:'auto' }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,marginBottom:12 }}>Passer un ordre</div>

            {/* Direction */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14 }}>
              {(['BUY','SELL'] as const).map(t=>(
                <button key={t} onClick={()=>setOrderType(t)} style={{ padding:'10px',borderRadius:8,border:`2px solid ${orderType===t?(t==='BUY'?'#2dd4a0':'#f0544f'):'rgba(255,255,255,.07)'}`,background:orderType===t?(t==='BUY'?'rgba(45,212,160,.1)':'rgba(240,84,79,.1)'):'transparent',color:orderType===t?(t==='BUY'?'#2dd4a0':'#f0544f'):'#5a677d',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:"'Syne',sans-serif" }}>
                  {t==='BUY'?'▲ Acheter':'▼ Vendre'}
                </button>
              ))}
            </div>

            {/* Lot */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10,color:'#5a677d',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5 }}>Volume (lot)</div>
              <input type="number" style={sInput} value={lot} onChange={e=>setLot(e.target.value)} step="0.01" min="0.01" max="10" />
              <div style={{ display:'flex',gap:5,marginTop:5 }}>
                {[0.01,0.05,0.1,0.5,1].map(v=>(
                  <button key={v} onClick={()=>setLot(String(v))} style={{ flex:1,padding:'4px',borderRadius:5,border:'1px solid rgba(255,255,255,.07)',background:'none',color:'#5a677d',fontSize:10,cursor:'pointer' }}>{v}</button>
                ))}
              </div>
            </div>

            {/* SL / TP */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
              {[['Stop Loss (pips)',slPips,setSlPips,'#f0544f'],['Take Profit (pips)',tpPips,setTpPips,'#2dd4a0']].map(([l,v,fn,c])=>(
                <div key={l as string}>
                  <div style={{ fontSize:10,color:c as string,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4,fontWeight:600 }}>{l}</div>
                  <input type="number" style={{ ...sInput,borderColor:`rgba(${c==='#f0544f'?'240,84,79':'45,212,160'},.2)` }} value={v as string} onChange={e=>(fn as any)(e.target.value)} />
                </div>
              ))}
            </div>

            {/* R/R */}
            <div style={{ background:'rgba(255,255,255,.03)',borderRadius:8,padding:'10px 12px',marginBottom:14,fontSize:12 }}>
              {[['Ratio R/R',`1:${(parseFloat(tpPips||'1')/parseFloat(slPips||'1')).toFixed(1)}`,parseFloat(tpPips)/parseFloat(slPips)>=1.5?'#2dd4a0':'#f0b43c'],['Risque',fmt(parseFloat(slPips||'0')*parseFloat(lot||'0')*10),'#f0544f'],['Objectif',fmt(parseFloat(tpPips||'0')*parseFloat(lot||'0')*10),'#2dd4a0']].map(([l,v,c])=>(
                <div key={l} style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                  <span style={{ color:'#5a677d' }}>{l}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",color:c as string,fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>

            <button onClick={placeOrder} style={{ width:'100%',padding:14,borderRadius:9,border:'none',background:orderType==='BUY'?'#2dd4a0':'#f0544f',color:'#06080e',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:"'Syne',sans-serif",marginBottom:8 }}>
              {orderType==='BUY'?'▲ Acheter':'▼ Vendre'} — {lot} lot
            </button>

            {tick&&<div style={{ fontSize:11,color:'#5a677d',textAlign:'center',marginBottom:16 }}>Prix : {orderType==='BUY'?tick.ask.toFixed(dp):tick.bid.toFixed(dp)}</div>}

            {/* Robot compact */}
            <div style={{ padding:'12px',background:robotOn?'rgba(45,212,160,.05)':'rgba(255,255,255,.03)',border:`1px solid ${robotOn?'rgba(45,212,160,.25)':'rgba(255,255,255,.07)'}`,borderRadius:10,textAlign:'center' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8 }}>
                <div style={{ width:7,height:7,borderRadius:'50%',background:robotOn?'#2dd4a0':'#5a677d',boxShadow:robotOn?'0 0 6px #2dd4a0':'none' }}/>
                <span style={{ fontSize:12,fontWeight:600,color:robotOn?'#2dd4a0':'#5a677d',fontFamily:"'Syne',sans-serif" }}>Robot EMA{emaFast}/{emaSlow}</span>
              </div>
              <button onClick={toggleRobot} style={{ width:'100%',padding:'8px',borderRadius:8,border:`1px solid ${robotOn?'rgba(240,84,79,.3)':'rgba(45,212,160,.3)'}`,background:robotOn?'rgba(240,84,79,.08)':'rgba(45,212,160,.08)',color:robotOn?'#f0544f':'#2dd4a0',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:"'Syne',sans-serif" }}>
                {robotOn?'⏹ Arrêter':'▶ Démarrer le robot'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

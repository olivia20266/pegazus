# 🔗 Intégration Pegazus ↔ vertex-mentor.com

## Architecture du flux automatique

```
[Utilisateur Pegazus]
       │
       │ Trade fermé (SL/TP/Manuel)
       ▼
[API Pegazus /api/trading/close-position]
       │
       ├─ 1. MAJ wallet Supabase (balance + learning_balance)
       ├─ 2. Enregistre la transaction
       ├─ 3. Log dans audit_logs (visible par l'admin)
       └─ 4. POST vers vertex-mentor.com/api/pegazus/sync-balance
                    │
                    └─ Crédite/débite automatiquement
                       le compte Vertex de l'utilisateur
```

---

## Ce que Vertex Mentor doit implémenter

### Endpoint 1 — Réception de sync de solde

```
POST https://vertex-mentor.com/api/pegazus/sync-balance
Headers:
  X-API-Key: <VERTEX_MENTOR_API_KEY>
  X-Secret:  <VERTEX_MENTOR_SECRET>

Body:
{
  "userId":        "uuid-supabase",
  "learningId":    "LEARN-2024-JEAN",
  "newBalance":    1250.00,
  "delta":         +52.10,
  "reason":        "trade_profit",   // ou "trade_loss"
  "tradeDetails":  {
    "symbol":     "R_50",
    "type":       "BUY",
    "lot":        0.01,
    "openPrice":  1234.567,
    "closePrice": 1235.123,
    "pl":         52.10,
    "reason":     "TP"
  },
  "timestamp":     "2024-07-14T09:35:00Z"
}

Réponse attendue:
{ "ok": true, "newBalance": 1250.00 }
```

### Endpoint 2 — Réception webhook depuis Vertex

Pegazus écoute sur :
```
POST https://pegazus.com/api/webhooks/vertex

Headers:
  X-Vertex-Signature: <HMAC-SHA256(body, VERTEX_MENTOR_SECRET)>

Events supportés:
  - balance.updated   → MAJ du solde formation dans Pegazus
  - deposit.approved  → Crédite le wallet Pegazus
  - user.verified     → Passe le KYC à VERIFIED dans Pegazus
```

---

## Variables d'environnement à configurer

### Côté Pegazus (.env.local)
```
VERTEX_MENTOR_URL=https://vertex-mentor.com
VERTEX_MENTOR_API_KEY=<clé générée sur Vertex>
VERTEX_MENTOR_SECRET=<secret HMAC partagé>
```

### Côté Vertex Mentor
```
PEGAZUS_URL=https://pegazus.com
PEGAZUS_API_KEY=<même valeur que VERTEX_MENTOR_API_KEY>
PEGAZUS_SECRET=<même valeur que VERTEX_MENTOR_SECRET>
```

---

## Exemple côté Vertex Mentor (Node.js)

```javascript
// Recevoir la sync de Pegazus
app.post('/api/pegazus/sync-balance', verifyApiKey, async (req, res) => {
  const { learningId, newBalance, delta, reason } = req.body

  const user = await User.findOne({ learningId })
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  // Mettre à jour le solde de trading sur Vertex
  user.tradingBalance = newBalance
  user.tradingHistory.push({
    date:    new Date(),
    delta,
    reason,
    balance: newBalance,
  })
  await user.save()

  // Notifier l'utilisateur (optionnel)
  await sendNotification(user, delta >= 0
    ? `✅ Gain de ${delta.toFixed(2)}$ sur Pegazus !`
    : `❌ Perte de ${Math.abs(delta).toFixed(2)}$ sur Pegazus`
  )

  res.json({ ok: true, newBalance })
})
```

---

## Ce que l'utilisateur voit

| Sur Pegazus | Sur vertex-mentor.com |
|-----------------|----------------------|
| Graphiques + ordres | Solde de trading mis à jour automatiquement |
| Trade fermé → toast | Notification push / email |
| Wallet Pegazus MAJ | Balance formation MAJ |
| Historique des trades | Rapport de performance |

**L'utilisateur ne voit jamais "Deriv" ou "Binary.com".**
Tout s'affiche sous la marque Pegazus.

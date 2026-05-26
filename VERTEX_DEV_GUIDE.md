# Guide d'intégration Pegazus ↔ Vertex Mentor
## Pour le développeur de vertex-mentor.com

---

## 1. Informations de connexion

```
Pegazus API URL  : https://pegazus.vercel.app
API Key          : pegazus_api_k3y_vtx_2024
Secret HMAC      : pegazus_hmac_s3cr3t_vtx_2024
```

---

## 2. Ce que Pegazus envoie automatiquement à Vertex

À chaque modification sur Pegazus, une requête est envoyée vers :
```
POST https://vertex-mentor.com/api/pegazus/sync
Header : X-Pegazus-Key: pegazus_api_k3y_vtx_2024
```

### Événements envoyés :

#### Solde modifié (dépôt, retrait, trade, ajustement admin)
```json
{
  "event": "wallet.updated",
  "pegazus_user_id": "uuid",
  "learning_id": "LEARN-2024-JEAN",
  "first_name": "Jean",
  "last_name": "Dupont",
  "balance": 2750.00,
  "learning_balance": 2750.00,
  "delta_balance": 300.00,
  "reason": "bonus",
  "timestamp": "2024-07-14T10:30:00Z"
}
```

#### Profil modifié (KYC, statut, rôle)
```json
{
  "event": "profile.updated",
  "learning_id": "LEARN-2024-JEAN",
  "kyc_status": "VERIFIED",
  "status": "ACTIVE",
  "role": "USER",
  "timestamp": "2024-07-14T10:30:00Z"
}
```

#### Nouvelle transaction
```json
{
  "event": "transaction.created",
  "learning_id": "LEARN-2024-JEAN",
  "tx_id": "uuid",
  "type": "TRADE",
  "amount": 52.10,
  "status": "COMPLETED",
  "description": "Trade fermé BUY EURUSD",
  "timestamp": "2024-07-14T10:30:00Z"
}
```

---

## 3. Ce que Vertex doit envoyer à Pegazus

### URL du webhook Pegazus :
```
POST https://pegazus.vercel.app/api/webhooks/vertex
```

### Calcul de la signature (obligatoire) :
```javascript
const crypto = require('crypto')
const SECRET  = 'pegazus_hmac_s3cr3t_vtx_2024'
const body    = JSON.stringify(payload)
const sig     = crypto.createHmac('sha256', SECRET).update(body).digest('hex')

// Envoyer dans le header :
'X-Pegazus-Key': sig
```

---

## 4. Événements à envoyer depuis Vertex

### A. Nouvel utilisateur Vertex → crée automatiquement son compte Pegazus
```json
{
  "event": "user.created",
  "data": {
    "learning_id": "LEARN-2024-NOUVEAU",
    "email": "utilisateur@exemple.com",
    "first_name": "Prénom",
    "last_name": "Nom",
    "country": "Gabon",
    "phone": "+241770000000",
    "initial_balance": 500.00
  }
}
```
**Résultat :** Pegazus crée le compte, le wallet, et renvoie :
```json
{
  "ok": true,
  "pegazus_id": "uuid",
  "mt5_login": "12345678"
}
```

### B. Admin Vertex ajuste un solde → répercuté sur Pegazus
```json
{
  "event": "admin.balance_adjusted",
  "data": {
    "learning_id": "LEARN-2024-JEAN",
    "delta": 200.00,
    "reason": "bonus",
    "admin_note": "Bonus formation complétée"
  }
}
```

### C. KYC validé sur Vertex → validé automatiquement sur Pegazus
```json
{
  "event": "kyc.verified",
  "data": {
    "learning_id": "LEARN-2024-JEAN"
  }
}
```

### D. Mise à jour du solde formation
```json
{
  "event": "balance.updated",
  "data": {
    "learning_id": "LEARN-2024-JEAN",
    "new_balance": 1200.00
  }
}
```

---

## 5. Vérifier si un utilisateur Vertex a un compte Pegazus

```
GET https://pegazus.vercel.app/api/vertex/user?learning_id=LEARN-2024-JEAN
Header : X-Pegazus-Key: pegazus_api_k3y_vtx_2024

Réponse :
{
  "exists": true,
  "pegazus_id": "uuid",
  "kyc_status": "VERIFIED",
  "status": "ACTIVE",
  "balance": 2450.00,
  "learning_balance": 2450.00,
  "mt5_login": "12345678"
}
```

---

## 6. Endpoint à créer côté Vertex (obligatoire)

Pegazus appelle cet endpoint à chaque modification :

```javascript
// Sur vertex-mentor.com
app.post('/api/pegazus/sync', verifyApiKey, async (req, res) => {
  const { event, learning_id, balance, learning_balance, delta_balance } = req.body

  const user = await User.findOne({ learningId: learning_id })
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  if (event === 'wallet.updated') {
    user.tradingBalance = learning_balance
    user.tradingHistory.push({
      date:    new Date(),
      delta:   delta_balance,
      balance: learning_balance,
    })
    await user.save()

    // Notifier l'utilisateur si gain ou perte
    if (delta_balance > 0)
      await notify(user, `✅ Gain de $${delta_balance} sur Pegazus`)
    else if (delta_balance < 0)
      await notify(user, `📉 Perte de $${Math.abs(delta_balance)} sur Pegazus`)
  }

  if (event === 'profile.updated' && req.body.kyc_status === 'VERIFIED') {
    user.kycStatus = 'verified'
    await user.save()
  }

  res.json({ ok: true })
})

// Vérifier la clé API
function verifyApiKey(req, res, next) {
  if (req.headers['x-pegazus-key'] !== 'pegazus_api_k3y_vtx_2024')
    return res.status(401).json({ error: 'Non autorisé' })
  next()
}
```

---

## 7. Le champ learning_id — clé de liaison

C'est le lien entre les deux plateformes.

| Vertex Mentor | Pegazus |
|---------------|---------|
| `user.id` ou `user.learningId` | `profiles.learning_id` |

Quand Vertex crée un utilisateur, il envoie son `learning_id`.
Pegazus stocke ce `learning_id` dans `profiles.learning_id`.
Toutes les syncs utilisent ce champ pour trouver l'utilisateur.

**Format recommandé :** `LEARN-2024-PRENOM` ou l'ID interne Vertex

---

## 8. Résumé du flux complet

```
Vertex user s'inscrit
        ↓
Vertex envoie POST /api/webhooks/vertex  { event: "user.created" }
        ↓
Pegazus crée le compte automatiquement
        ↓
User trade sur Pegazus → gain $50
        ↓
Pegazus met à jour le wallet Supabase
        ↓ (trigger automatique)
Pegazus envoie POST /api/pegazus/sync  { event: "wallet.updated", delta: +50 }
        ↓
Vertex met à jour le solde de l'utilisateur
        ↓
User voit son solde mis à jour sur Vertex ✅
```

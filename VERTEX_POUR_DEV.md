# 🔗 Guide d'intégration pour le développeur Vertex Mentor

## Ce que Pegazus envoie automatiquement à Vertex

À chaque modification (solde, KYC, statut), Pegazus envoie un POST à :
```
POST https://vertex-mentor.com/api/pegazus/sync
Header: X-Pegazus-Key: pegazus_api_k3y_vtx_2024
```

### Événements envoyés par Pegazus :
| event | Déclencheur |
|-------|-------------|
| `wallet.updated` | Solde modifié (dépôt, retrait, gain, perte, ajustement admin) |
| `profile.updated` | KYC approuvé/rejeté, compte bloqué/débloqué |
| `transaction.created` | Nouvelle transaction enregistrée |

### Exemple de payload `wallet.updated` :
```json
{
  "event": "wallet.updated",
  "pegazus_user_id": "uuid-supabase",
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

---

## Ce que Vertex doit envoyer à Pegazus

### URL des webhooks Pegazus :
```
POST https://pegazus.vercel.app/api/webhooks/vertex
Header: X-Pegazus-Key: <HMAC-SHA256(body, pegazus_hmac_s3cr3t_vtx_2024)>
```

### Événements à envoyer depuis Vertex :

#### 1. Nouvel utilisateur Vertex → créer compte Pegazus automatiquement
```json
{
  "event": "user.created",
  "data": {
    "learning_id": "LEARN-2024-NOUVEAU",
    "email": "nouveau@exemple.com",
    "first_name": "Prénom",
    "last_name": "Nom",
    "country": "Gabon",
    "phone": "+241770000000",
    "initial_balance": 500.00
  }
}
```
→ Pegazus crée automatiquement le compte + wallet + MT5 login

#### 2. Admin Vertex ajuste un solde → répercuter sur Pegazus
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

#### 3. KYC validé sur Vertex → valider sur Pegazus
```json
{
  "event": "kyc.verified",
  "data": { "learning_id": "LEARN-2024-JEAN" }
}
```

#### 4. MAJ du solde formation
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

## Vérifier si un utilisateur Vertex a un compte Pegazus
```
GET https://pegazus.vercel.app/api/vertex/user?learning_id=LEARN-2024-JEAN
Header: X-Pegazus-Key: pegazus_api_k3y_vtx_2024

Réponse :
{
  "exists": true,
  "pegazus_id": "uuid",
  "kyc_status": "VERIFIED",
  "balance": 2450.00,
  "learning_balance": 2450.00,
  "mt5_login": "12345678"
}
```

---

## Calcul de la signature HMAC (côté Vertex)
```javascript
const crypto = require('crypto')
const SECRET = 'pegazus_hmac_s3cr3t_vtx_2024'
const body   = JSON.stringify(payload)
const sig    = crypto.createHmac('sha256', SECRET).update(body).digest('hex')
// Envoyer dans le header : X-Pegazus-Key: sig
```

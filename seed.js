// ================================================================
//  PEGAZUS — Setup Admin (production)
//  Usage : node seed.js
//  Crée uniquement le compte Super Admin
// ================================================================
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function setupAdmin() {
  const email    = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.log('\nUsage : node seed.js admin@pegazus.io MotDePasseAdmin\n')
    process.exit(1)
  }

  console.log('\n🦅 Pegazus — Création du compte admin...\n')

  // Créer l'utilisateur Auth
  const { data: auth, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  })

  if (error) {
    console.error('Erreur :', error.message)
    process.exit(1)
  }

  const uid = auth.user.id

  // Profil admin
  await supabase.from('profiles').upsert({
    id: uid, first_name: 'Super', last_name: 'Admin',
    role: 'SUPERADMIN', kyc_status: 'VERIFIED', status: 'ACTIVE', leverage: '1:50',
  })

  // Wallet admin
  await supabase.from('wallets').upsert({
    user_id: uid, balance: 0, equity: 0, margin: 0,
    free_margin: 0, floating_pl: 0, learning_balance: 0,
    currency: 'USD', mt5_login: '00000001', mt5_server: 'Pegazus-Live01',
  })

  console.log(`✅ Admin créé : ${email}`)
  console.log(`   ID Supabase : ${uid}\n`)
}

setupAdmin()

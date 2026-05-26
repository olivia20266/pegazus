// SERVER COMPONENT — rendu côté serveur, aucun code client exposé
import { Suspense } from 'react'
import LoginClient from './LoginClient'

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#06080e',display:'flex',alignItems:'center',justifyContent:'center',color:'#d4a843'}}>Chargement...</div>}>
      <LoginClient />
    </Suspense>
  )
}

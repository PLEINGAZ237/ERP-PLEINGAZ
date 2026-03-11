import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const payload = await req.json()
    const { record, old_record, type, table } = payload

    let subject = ""
    let messageHtml = ""
    let rolesCibles: string[] = []
    let inclureEmploye = false

    const APP_URL = "https://procurement.monpleingaz.com/" // À ajuster selon ton URL réelle

    // --- LOGIQUE DE ROUTAGE SELON LA FEUILLE DE ROUTE ---
    
    if (table === 'besoins') {
      if (type === 'INSERT') {
        subject = `[NOUVEAU] Besoin ${record.numero}`
        messageHtml = `Un nouveau besoin de <b>${record.montant_demande.toLocaleString()} FCFA</b> a été créé.`
        rolesCibles = ['DFC']
      } 
      else if (type === 'UPDATE' && record.statut !== old_record.statut) {
        switch (record.statut) {
          case 'EN_ATTENTE_DG':
            subject = `[DFC VALIDÉ] Besoin ${record.numero}`
            messageHtml = `Le DFC a validé le besoin. En attente de signature DG.`
            rolesCibles = ['DG']
            inclureEmploye = true
            break;
          case 'REJETE_DFC':
            subject = `[REJETÉ DFC] Besoin ${record.numero}`
            messageHtml = `Le DFC a rejeté ce besoin.`
            inclureEmploye = true
            break;
          case 'VALIDE_DG':
            subject = `[APPROUVÉ DG] Besoin ${record.numero}`
            messageHtml = `Le DG a approuvé le décaissement.`
            rolesCibles = ['DFC', 'Caissiere']
            inclureEmploye = true
            break;
          case 'REJETE_DG':
            subject = `[REJETÉ DG] Besoin ${record.numero}`
            messageHtml = `Le DG a reje.té ce besoin.`
            rolesCibles = ['DFC']
            inclureEmploye = true
            break;
          case 'EN_ATTENTE_RETOUR_CAISSE':
            subject = `[RELIQUAT DÉTECTÉ] Besoin ${record.numero}`
            messageHtml = `Un reliquat a été détecté. Retour caisse attendu.`
            rolesCibles = ['DFC', 'DG', 'Caissiere']
            inclureEmploye = true
            break;
        }
      }
    } else if (table === 'decaissements') {
        subject = `[DÉCAISSÉ] Besoin ${record.numero_besoin || 'Info non disp.'}`
        messageHtml = `Le montant de <b>${record.montant_decaisse.toLocaleString()} FCFA</b> a été décaissé.`
        rolesCibles = ['DFC', 'DG']
        inclureEmploye = true
    }

    // --- RÉCUPÉRATION DES DESTINATAIRES ---
// --- RÉCUPÉRATION DES DESTINATAIRES (CORRIGÉ) ---

const emails = new Set<string>()
let entrepriseIdIdenitifie = record.entreprise_id

// 1. Email de l'employé ET récupération de son entreprise si besoin
const proprietaireId = record.employe_id || record.agent_id || record.caissiere_id

if (proprietaireId) {
  const { data: emp } = await supabase
    .from('profiles')
    .select('email, entreprise_id')
    .eq('id', proprietaireId)
    .single()
    
  if (emp?.email) emails.add(emp.email)
  // Si record.entreprise_id était undefined, on utilise celui du profil
  if (!entrepriseIdIdenitifie) entrepriseIdIdenitifie = emp?.entreprise_id
}

// 2. Emails des rôles (DFC, DG, etc.)
if (rolesCibles.length > 0) {
  let query = supabase
    .from('utilisateur_roles')
    .select('profiles!inner(email, entreprise_id), roles!inner(nom)')
    .in('roles.nom', rolesCibles)

  // On ne filtre par entreprise QUE si on a réussi à en trouver une
  if (entrepriseIdIdenitifie) {
    query = query.eq('profiles.entreprise_id', entrepriseIdIdenitifie)
  }

  const { data: staff } = await query
  staff?.forEach(s => { if (s.profiles?.email) emails.add(s.profiles.email) })
}

    if (emails.size === 0) return new Response(JSON.stringify({ info: "Aucun destinataire trouvé" }))

    // --- ENVOI RESEND ---
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'PleinGaz <s.mfambou@monpleingaz.com>',
        to: Array.from(emails),
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #2563eb;">${subject}</h2>
            <p>${messageHtml}</p>
            <hr/>
            <p><strong>Détails du dossier :</strong></p>
            <ul>
              <li><strong>Numéro :</strong> ${record.numero}</li>
              <li><strong>Description :</strong> ${record.description || 'N/A'}</li>
            </ul>
            <a href="${APP_URL}" style="background: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Ouvrir l'application</a>
          </div>
        `,
      }),
    })

    console.log("Roles cibles:", rolesCibles);
    console.log("Entreprise ID détecté:", record.entreprise_id);
    console.log("Emails trouvés:", Array.from(emails));

    const result = await res.json()
    return new Response(JSON.stringify(result), { 
      status: res.status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
  
})
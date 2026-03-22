import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL = "https://procurement.monpleingaz.com/"

// ── Couleurs et styles par statut ──
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  EN_ATTENTE_DFC:           { color: '#D97706', bg: '#FFFBEB', icon: '⏳', label: 'En attente DFC' },
  EN_ATTENTE_DG:            { color: '#2563EB', bg: '#EFF6FF', icon: '📋', label: 'En attente DG' },
  VALIDE_DG:                { color: '#059669', bg: '#ECFDF5', icon: '✅', label: 'Approuvé DG' },
  REJETE_DFC:               { color: '#DC2626', bg: '#FEF2F2', icon: '❌', label: 'Rejeté DFC' },
  REJETE_DG:                { color: '#DC2626', bg: '#FEF2F2', icon: '❌', label: 'Rejeté DG' },
  DECAISSE:                 { color: '#7C3AED', bg: '#F5F3FF', icon: '💰', label: 'Décaissé' },
  EN_ATTENTE_RETOUR_CAISSE: { color: '#D97706', bg: '#FFFBEB', icon: '🔄', label: 'Retour caisse attendu' },
  BOUCLE:                   { color: '#6B7280', bg: '#F9FAFB', icon: '✔️', label: 'Bouclé' },
}

// ── Template HTML ──
function buildEmailHtml(params: {
  subject: string
  icon: string
  color: string
  bg: string
  statusLabel: string
  numero: string
  description: string
  montant: string
  employe: string
  entreprise: string
  departement: string
  message: string
  details?: { label: string; value: string }[]
}) {
  const { subject, icon, color, bg, statusLabel, numero, description, montant, employe, entreprise, departement, message, details } = params

  const detailRows = (details ?? []).map(d =>
    `<tr><td style="padding:8px 12px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;">${d.label}</td><td style="padding:8px 12px;font-size:13px;color:#111;font-weight:600;border-bottom:1px solid #F3F4F6;">${d.value}</td></tr>`
  ).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1F2937,#111827);border-radius:16px 16px 0 0;padding:24px 28px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.1);border-radius:12px;padding:8px 16px;margin-bottom:12px;">
        <span style="color:#fff;font-size:14px;font-weight:800;letter-spacing:0.1em;">🔥 PLEINGAZ ERP</span>
      </div>
      <p style="color:#9CA3AF;font-size:12px;margin:0;letter-spacing:0.05em;">INFOTECH SA / WONDERFUL</p>
    </div>
    
    <!-- Contenu -->
    <div style="background:#fff;padding:28px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;">
      
      <!-- Badge statut -->
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;font-size:32px;margin-bottom:8px;">${icon}</span>
        <div style="display:inline-block;background:${bg};color:${color};border:1px solid ${color}22;border-radius:20px;padding:6px 16px;font-size:12px;font-weight:700;letter-spacing:0.04em;">
          ${statusLabel}
        </div>
      </div>
      
      <!-- Message principal -->
      <h2 style="font-size:18px;color:#111;margin:0 0 8px;text-align:center;">${subject}</h2>
      <p style="font-size:14px;color:#6B7280;text-align:center;margin:0 0 24px;line-height:1.6;">${message}</p>
      
      <!-- Infos du besoin -->
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        <div style="background:${color}11;padding:12px 16px;border-bottom:1px solid #E5E7EB;">
          <span style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.08em;">Détails du besoin</span>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 12px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;">Numéro</td>
            <td style="padding:10px 12px;font-size:14px;color:#111;font-weight:700;font-family:monospace;border-bottom:1px solid #F3F4F6;">${numero}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;">Demandeur</td>
            <td style="padding:10px 12px;font-size:13px;color:#111;font-weight:600;border-bottom:1px solid #F3F4F6;">${employe}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;">Entreprise</td>
            <td style="padding:10px 12px;font-size:13px;color:#111;border-bottom:1px solid #F3F4F6;">${entreprise}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;">Département</td>
            <td style="padding:10px 12px;font-size:13px;color:#111;border-bottom:1px solid #F3F4F6;">${departement}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;">Description</td>
            <td style="padding:10px 12px;font-size:13px;color:#374151;border-bottom:1px solid #F3F4F6;">${description}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-size:13px;color:#6B7280;">Montant</td>
            <td style="padding:10px 12px;font-size:16px;color:${color};font-weight:800;">${montant} FCFA</td>
          </tr>
          ${detailRows}
        </table>
      </div>
      
      <!-- Bouton CTA -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#DC2626,#991B1B);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.02em;">
          Ouvrir PleinGaz ERP →
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:20px 28px;text-align:center;">
      <p style="font-size:11px;color:#9CA3AF;margin:0;">
        Cet email a été envoyé automatiquement par PleinGaz ERP.<br>
        © ${new Date().getFullYear()} INFOTECH SA — Tous droits réservés.
      </p>
    </div>
    
  </div>
</body>
</html>`
}

// ── Helpers ──
function fmtMontant(n: number | null | undefined): string {
  if (n == null) return '0'
  return Number(n).toLocaleString('fr-FR')
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
    let message = ""
    let rolesCibles: string[] = []
    let statusKey = record?.statut ?? ''
    let extraDetails: { label: string; value: string }[] = []

    // ═══════════════════════════════════════════════════════════
    // ROUTAGE SELON TABLE ET ÉVÉNEMENT
    // ═══════════════════════════════════════════════════════════

    if (table === 'besoins') {
      if (type === 'INSERT') {
        statusKey = 'EN_ATTENTE_DFC'
        subject = `Nouveau besoin : ${record.numero}`
        message = `Un nouveau besoin de <b>${fmtMontant(record.montant_demande)} FCFA</b> a été soumis et attend votre validation.`
        rolesCibles = ['DFC']
      }
      else if (type === 'UPDATE' && record.statut !== old_record?.statut) {
        switch (record.statut) {
          case 'EN_ATTENTE_DG':
            subject = `Besoin validé par DFC : ${record.numero}`
            message = `Le DFC a validé ce besoin. Il est maintenant en attente de votre approbation.`
            rolesCibles = ['DG']
            break

          case 'REJETE_DFC':
            subject = `Besoin rejeté par DFC : ${record.numero}`
            message = `Le DFC a rejeté votre besoin. Consultez le motif de rejet dans l'application.`
            rolesCibles = []
            break

          case 'VALIDE_DG':
            subject = `Besoin approuvé par DG : ${record.numero}`
            message = `Le Directeur Général a approuvé le décaissement. La caissière peut procéder.`
            rolesCibles = ['DFC', 'decaissement']
            break

          case 'REJETE_DG':
            subject = `Besoin rejeté par DG : ${record.numero}`
            message = `Le Directeur Général a rejeté ce besoin. Consultez le motif dans l'application.`
            rolesCibles = ['DFC']
            break

          case 'DECAISSE':
            subject = `Besoin décaissé : ${record.numero}`
            message = `Le montant a été décaissé. En attente de saisie du justificatif.`
            rolesCibles = ['Justif', 'DFC']
            break

          case 'EN_ATTENTE_RETOUR_CAISSE':
            subject = `Retour en caisse attendu : ${record.numero}`
            message = `Un reliquat a été détecté après justification. La caissière doit confirmer la réception du retour.`
            rolesCibles = ['decaissement', 'DFC', 'DG']
            break

          case 'BOUCLE':
            subject = `Besoin bouclé : ${record.numero}`
            message = `Ce besoin a été entièrement traité et bouclé. Aucune action requise.`
            rolesCibles = ['DFC', 'DG']
            break

          default:
            return new Response(JSON.stringify({ info: "Statut non géré" }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }
      } else {
        return new Response(JSON.stringify({ info: "Événement ignoré" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }
    else if (table === 'decaissements' && type === 'INSERT') {
      // Récupérer le besoin lié
      const { data: besoin } = await supabase
        .from('besoins')
        .select('numero, description, montant_demande, employe_id, entreprise_id')
        .eq('id', record.besoin_id)
        .single()

      if (besoin) {
        record.numero = besoin.numero
        record.description = besoin.description
        record.montant_demande = besoin.montant_demande
        record.employe_id = besoin.employe_id
        record.entreprise_id = besoin.entreprise_id
      }

      statusKey = 'DECAISSE'
      subject = `Décaissement effectué : ${record.numero ?? 'N/A'}`
      message = `Un montant de <b>${fmtMontant(record.montant_decaisse)} FCFA</b> a été décaissé.`
      rolesCibles = ['Justif', 'DFC', 'DG']
      extraDetails = [
        { label: 'Montant décaissé', value: `${fmtMontant(record.montant_decaisse)} FCFA` },
      ]
      if (record.justification_si_inferieur) {
        extraDetails.push({ label: 'Justification écart', value: record.justification_si_inferieur })
      }
    }
    else if (table === 'justificatifs' && type === 'INSERT') {
      // Récupérer le besoin via décaissement
      const { data: dec } = await supabase
        .from('decaissements')
        .select('besoin_id, besoins(numero, description, montant_demande, employe_id, entreprise_id)')
        .eq('id', record.decaissement_id)
        .single()

      const besoin = dec?.besoins as any
      if (besoin) {
        record.numero = besoin.numero
        record.description = besoin.description
        record.montant_demande = besoin.montant_demande
        record.employe_id = besoin.employe_id
        record.entreprise_id = besoin.entreprise_id
      }

      statusKey = 'DECAISSE'
      subject = `Justificatif saisi : ${record.numero ?? 'N/A'}`
      message = `Un justificatif a été saisi pour ce besoin. Facture n° <b>${record.numero_facture}</b> de <b>${fmtMontant(record.montant_facture)} FCFA</b>.`
      rolesCibles = ['DFC', 'DG', 'decaissement']
      extraDetails = [
        { label: 'N° facture', value: record.numero_facture },
        { label: 'Montant facture', value: `${fmtMontant(record.montant_facture)} FCFA` },
      ]
    }
    else {
      return new Response(JSON.stringify({ info: "Table/événement non géré" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ═══════════════════════════════════════════════════════════
    // RÉCUPÉRATION DES INFOS EMPLOYÉ
    // ═══════════════════════════════════════════════════════════

    let employeNom = 'N/A'
    let entrepriseNom = 'N/A'
    let departementNom = 'N/A'
    let entrepriseId = record.entreprise_id

    const proprietaireId = record.employe_id || record.agent_id || record.caissiere_id
    if (proprietaireId) {
      const { data: emp } = await supabase
        .from('profiles')
        .select('prenom, nom, email, entreprise_id, entreprises(nom), departements(nom)')
        .eq('id', proprietaireId)
        .single()

      if (emp) {
        employeNom = `${emp.prenom ?? ''} ${emp.nom ?? ''}`.trim() || emp.email || 'N/A'
        entrepriseNom = (emp.entreprises as any)?.nom ?? 'N/A'
        departementNom = (emp.departements as any)?.nom ?? 'N/A'
        if (!entrepriseId) entrepriseId = emp.entreprise_id
      }
    }

    // ═══════════════════════════════════════════════════════════
    // RÉCUPÉRATION DES DESTINATAIRES
    // ═══════════════════════════════════════════════════════════

    const emails = new Set<string>()

    // Toujours notifier l'employé concerné
    if (proprietaireId) {
      const { data: empProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', proprietaireId)
        .single()
      if (empProfile?.email) emails.add(empProfile.email)
    }

    // Notifier les rôles cibles
    if (rolesCibles.length > 0) {
      // Rôles via service_role_module
      const { data: srmUsers } = await supabase
        .from('service_role_module')
        .select('services(profiles(email, entreprise_id))')
        .in('roles.nom', rolesCibles)

      // Rôles via utilisateur_roles (Admin, etc.)
      const { data: directUsers } = await supabase
        .from('utilisateur_roles')
        .select('profiles!inner(email), roles!inner(nom)')
        .in('roles.nom', rolesCibles)

      directUsers?.forEach((u: any) => {
        if (u.profiles?.email) emails.add(u.profiles.email)
      })

      // Approche alternative plus fiable : chercher par rôle dans service_role_module
      for (const role of rolesCibles) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('id')
          .eq('nom', role)
          .single()

        if (roleData) {
          const { data: srmData } = await supabase
            .from('service_role_module')
            .select('service_id')
            .eq('role_id', roleData.id)

          const serviceIds = (srmData ?? []).map(s => s.service_id)
          if (serviceIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('email')
              .in('service_id', serviceIds)
              .eq('statut', 'actif')

            profiles?.forEach(p => {
              if (p.email) emails.add(p.email)
            })
          }
        }
      }
    }

    if (emails.size === 0) {
      console.log("[email] Aucun destinataire trouvé")
      return new Response(JSON.stringify({ info: "Aucun destinataire trouvé" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ═══════════════════════════════════════════════════════════
    // CONSTRUCTION ET ENVOI DU MAIL
    // ═══════════════════════════════════════════════════════════

    const config = STATUS_CONFIG[statusKey] ?? { color: '#6B7280', bg: '#F9FAFB', icon: '📌', label: statusKey }

    const html = buildEmailHtml({
      subject,
      icon: config.icon,
      color: config.color,
      bg: config.bg,
      statusLabel: config.label,
      numero: record.numero ?? 'N/A',
      description: record.description ?? 'N/A',
      montant: fmtMontant(record.montant_demande),
      employe: employeNom,
      entreprise: entrepriseNom,
      departement: departementNom,
      message,
      details: extraDetails,
    })

    console.log(`[email] Envoi à ${emails.size} destinataire(s):`, Array.from(emails))
    console.log(`[email] Sujet: ${subject}`)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'PleinGaz ERP <s.mfambou@monpleingaz.com>',
        to: Array.from(emails),
        subject,
        html,
      }),
    })

    const result = await res.json()
    console.log("[email] Résultat Resend:", JSON.stringify(result))

    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("[email] ERREUR:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
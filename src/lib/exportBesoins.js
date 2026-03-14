import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ══════════════════════════════════════════════════════════════════════════════
// FORMATAGE
// ══════════════════════════════════════════════════════════════════════════════
function fmtMontant(n) {
  if (n == null || n === '' || isNaN(n)) return ''
  var num = Math.round(Number(n))
  var str = Math.abs(num).toString()
  var result = ''
  for (var i = str.length - 1, c = 0; i >= 0; i--, c++) {
    if (c > 0 && c % 3 === 0) result = '.' + result
    result = str[i] + result
  }
  return num < 0 ? '-' + result : result
}

function fmtFCFA(n) {
  var m = fmtMontant(n)
  return m ? m + ' FCFA' : ''
}

function fmtDateTime(d) {
  if (!d) return ''
  var dt = new Date(d)
  return String(dt.getDate()).padStart(2, '0') + '/' +
    String(dt.getMonth() + 1).padStart(2, '0') + '/' +
    dt.getFullYear() + ' a ' +
    String(dt.getHours()).padStart(2, '0') + ':' +
    String(dt.getMinutes()).padStart(2, '0')
}

var STATUT_LABELS = {
  EN_ATTENTE_DFC: 'En attente DFC', REJETE_DFC: 'Rejete DFC', EN_ATTENTE_DG: 'En attente DG',
  VALIDE_DG: 'Valide DG', REJETE_DG: 'Rejete DG', DECAISSE: 'Decaisse',
  EN_ATTENTE_RETOUR_CAISSE: 'Retour caisse en attente', BOUCLE: 'Boucle',
}
function statutLabel(s) { return STATUT_LABELS[s] || s }
function nomComplet(p) { return p ? ((p.prenom || '') + ' ' + (p.nom || '')).trim() : '' }

// ══════════════════════════════════════════════════════════════════════════════
// CHARGEMENT COMPLET
// ══════════════════════════════════════════════════════════════════════════════
export async function fetchFullBesoins(ids) {
  var chunks = []
  for (var i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50))
  var all = []
  for (var ci = 0; ci < chunks.length; ci++) {
    var res = await supabase.from('besoins').select(
      'id, numero, montant_demande, description, justification, statut, created_at,' +
      'profiles!employe_id(nom, prenom, email, entreprises(nom), departements(nom)),' +
      'validations_dfc(montant_valide, commentaire, statut, created_at, profiles!dfc_id(nom, prenom)),' +
      'validations_dg(montant_valide, mode_decaissement, commentaire, action, created_at,' +
      '  profiles!dg_id(nom, prenom), caisses(nom), virements(nom),' +
      '  validations_dg_repartitions(montant, mode, caisses(nom), virements(nom))),' +
      'decaissements(montant_decaisse, justification_si_inferieur, created_at,' +
      '  profiles!caissiere_id(nom, prenom),' +
      '  justificatifs(numero_facture, montant_facture, created_at,' +
      '    profiles!agent_id(nom, prenom),' +
      '    retours_caisse(montant_retour, date_confirmation, created_at,' +
      '      profiles!confirme_par_caissiere_id(nom, prenom))))'
    ).in('id', chunks[ci])
    if (res.data) all.push.apply(all, res.data)
  }
  return all
}

// ══════════════════════════════════════════════════════════════════════════════
// EXTRACTION STRUCTUREE
// ══════════════════════════════════════════════════════════════════════════════
function extractBesoin(b) {
  var emp = b.profiles
  var allDfc = b.validations_dfc || []
  var vdfc = null
  for (var i = allDfc.length - 1; i >= 0; i--) {
    if (allDfc[i].statut === 'valide') { vdfc = allDfc[i]; break }
  }
  var vdfcAll = allDfc.length > 0 ? allDfc[allDfc.length - 1] : null
  var allDg = b.validations_dg || []
  var vdg = allDg.length > 0 ? allDg[allDg.length - 1] : null
  var dec = b.decaissements && b.decaissements[0] ? b.decaissements[0] : null
  var justif = dec && dec.justificatifs && dec.justificatifs[0] ? dec.justificatifs[0] : null
  var retour = justif && justif.retours_caisse && justif.retours_caisse[0] ? justif.retours_caisse[0] : null
  var reps = (vdg && vdg.validations_dg_repartitions) ? vdg.validations_dg_repartitions : []

  var modeDetail = ''
  if (vdg) {
    if (vdg.mode_decaissement === 'repartie' && reps.length > 0) {
      var parts = []
      for (var ri = 0; ri < reps.length; ri++) {
        var r = reps[ri]
        parts.push(fmtFCFA(r.montant) + ' via ' + (r.mode === 'caisse' ? 'Caisse (' + (r.caisses ? r.caisses.nom : '?') + ')' : 'Virement (' + (r.virements ? r.virements.nom : '?') + ')'))
      }
      modeDetail = parts.join(' | ')
    } else if (vdg.mode_decaissement === 'caisse') {
      modeDetail = 'Caisse : ' + (vdg.caisses ? vdg.caisses.nom : '')
    } else if (vdg.mode_decaissement === 'virement') {
      modeDetail = 'Virement : ' + (vdg.virements ? vdg.virements.nom : '')
    }
  }

  var motifRejet = ''
  if (b.statut === 'REJETE_DFC') motifRejet = vdfcAll ? (vdfcAll.commentaire || '') : ''
  else if (b.statut === 'REJETE_DG') motifRejet = vdg ? (vdg.commentaire || '') : ''

  var etapes = []
  etapes.push({ label: 'Soumission du besoin', date: b.created_at, par: nomComplet(emp) })
  if (vdfc) etapes.push({ label: 'Validation DFC (' + fmtFCFA(vdfc.montant_valide) + ')', date: vdfc.created_at, par: nomComplet(vdfc.profiles) })
  if (b.statut === 'REJETE_DFC' && vdfcAll) etapes.push({ label: 'Rejet DFC', date: vdfcAll.created_at, par: nomComplet(vdfcAll.profiles) })
  if (vdg && vdg.action !== 'rejete') etapes.push({ label: 'Validation DG (' + fmtFCFA(vdg.montant_valide) + ')', date: vdg.created_at, par: nomComplet(vdg.profiles) })
  if (b.statut === 'REJETE_DG' && vdg) etapes.push({ label: 'Rejet DG', date: vdg.created_at, par: nomComplet(vdg.profiles) })
  if (dec) etapes.push({ label: 'Decaissement (' + fmtFCFA(dec.montant_decaisse) + ')', date: dec.created_at, par: nomComplet(dec.profiles) })
  if (justif) etapes.push({ label: 'Justificatif N' + justif.numero_facture + ' (' + fmtFCFA(justif.montant_facture) + ')', date: justif.created_at, par: nomComplet(justif.profiles) })
  if (retour && retour.date_confirmation) etapes.push({ label: 'Retour caisse (' + fmtFCFA(retour.montant_retour) + ')', date: retour.date_confirmation, par: nomComplet(retour.profiles) })

  return {
    numero: b.numero, statut: statutLabel(b.statut), statutBrut: b.statut, dateCreation: b.created_at,
    employe: nomComplet(emp), email: emp ? (emp.email || '') : '', departement: emp && emp.departements ? (emp.departements.nom || '') : '', entreprise: emp && emp.entreprises ? (emp.entreprises.nom || '') : '',
    titre: b.description || '', details: b.justification || '', montantDemande: b.montant_demande,
    dfcPar: vdfc ? nomComplet(vdfc.profiles) : '', dfcMontant: vdfc ? vdfc.montant_valide : null, dfcCommentaire: vdfc ? (vdfc.commentaire || '') : '', dfcDate: vdfc ? vdfc.created_at : null,
    dgPar: vdg ? nomComplet(vdg.profiles) : '', dgMontant: vdg ? vdg.montant_valide : null, dgMode: modeDetail, dgCommentaire: vdg ? (vdg.commentaire || '') : '', dgDate: vdg ? vdg.created_at : null,
    decPar: dec ? nomComplet(dec.profiles) : '', decMontant: dec ? dec.montant_decaisse : null, decDate: dec ? dec.created_at : null, decEcart: dec ? (dec.justification_si_inferieur || '') : '',
    justifNumero: justif ? (justif.numero_facture || '') : '', justifMontant: justif ? justif.montant_facture : null, justifDate: justif ? justif.created_at : null, justifPar: justif ? nomComplet(justif.profiles) : '',
    retourMontant: retour ? retour.montant_retour : null, retourDate: retour ? retour.date_confirmation : null, retourPar: retour ? nomComplet(retour.profiles) : '',
    motifRejet: motifRejet, etapes: etapes,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT EXCEL
// ══════════════════════════════════════════════════════════════════════════════
export async function exportExcel(filteredIds, stats) {
  var fullData = await fetchFullBesoins(filteredIds)
  var ordered = []
  for (var i = 0; i < filteredIds.length; i++) {
    for (var j = 0; j < fullData.length; j++) {
      if (fullData[j].id === filteredIds[i]) { ordered.push(extractBesoin(fullData[j])); break }
    }
  }
  var rows = ordered.map(function(b) {
    return {
      'Numero': b.numero, 'Statut': b.statut, 'Date soumission': fmtDateTime(b.dateCreation),
      'Employe': b.employe, 'Email': b.email, 'Departement': b.departement, 'Entreprise': b.entreprise,
      'Titre': b.titre, 'Details': b.details, 'Montant demande': b.montantDemande != null ? Number(b.montantDemande) : '',
      'DFC par': b.dfcPar, 'DFC date': fmtDateTime(b.dfcDate), 'DFC montant': b.dfcMontant != null ? Number(b.dfcMontant) : '', 'DFC commentaire': b.dfcCommentaire,
      'DG par': b.dgPar, 'DG date': fmtDateTime(b.dgDate), 'DG montant': b.dgMontant != null ? Number(b.dgMontant) : '', 'DG mode': b.dgMode, 'DG commentaire': b.dgCommentaire,
      'Decaisse par': b.decPar, 'Decaissement date': fmtDateTime(b.decDate), 'Montant decaisse': b.decMontant != null ? Number(b.decMontant) : '', 'Ecart justifie': b.decEcart,
      'N facture': b.justifNumero, 'Montant facture': b.justifMontant != null ? Number(b.justifMontant) : '', 'Justif date': fmtDateTime(b.justifDate), 'Justif par': b.justifPar,
      'Retour montant': b.retourMontant != null ? Number(b.retourMontant) : '', 'Retour date': fmtDateTime(b.retourDate), 'Retour par': b.retourPar,
      'Motif rejet': b.motifRejet,
      'Historique': b.etapes.map(function(e) { return fmtDateTime(e.date) + ' | ' + e.label + ' | ' + e.par }).join('\n'),
    }
  })
  var ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [22,18,22,22,26,18,18,35,40,18,20,22,18,30,20,22,18,35,30,20,22,18,30,16,18,22,20,18,22,20,40,60].map(function(w) { return { wch: w } })
  var moneyCols = [9, 12, 16, 21, 24, 27]
  var range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (var R = range.s.r + 1; R <= range.e.r; R++) {
    for (var mc = 0; mc < moneyCols.length; mc++) {
      var addr = XLSX.utils.encode_cell({ r: R, c: moneyCols[mc] })
      if (ws[addr] && typeof ws[addr].v === 'number') ws[addr].z = '#,##0'
    }
  }
  var wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Besoins')

  var parStatutEntries = Object.entries(stats.parStatut).sort(function(a, b) { return b[1].count - a[1].count })
  var parDeptEntries = Object.entries(stats.parDept).sort(function(a, b) { return b[1].count - a[1].count })
  var summary = [
    ['RAPPORT - PLEINGAZ ERP'], [],
    ['Date export', fmtDateTime(new Date().toISOString())],
    ['Nombre', ordered.length], ['Total demande', fmtFCFA(stats.montantTotal)],
    ['Moyen', fmtFCFA(Math.round(stats.montantMoyen))],
    ['Valides', stats.valides], ['Rejetes', stats.rejetes], [],
    ['PAR STATUT', 'Nombre', 'Montant'],
  ]
  for (var si = 0; si < parStatutEntries.length; si++) summary.push([statutLabel(parStatutEntries[si][0]), parStatutEntries[si][1].count, fmtFCFA(parStatutEntries[si][1].montant)])
  summary.push([])
  summary.push(['PAR DEPARTEMENT', 'Nombre', 'Montant'])
  for (var di = 0; di < parDeptEntries.length; di++) summary.push([parDeptEntries[di][0], parDeptEntries[di][1].count, fmtFCFA(parDeptEntries[di][1].montant)])

  var ws2 = XLSX.utils.aoa_to_sheet(summary)
  ws2['!cols'] = [{ wch: 35 }, { wch: 14 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Resume')
  XLSX.writeFile(wb, 'besoins_rapport_' + new Date().toISOString().slice(0, 10) + '.xlsx')
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT PDF
// ══════════════════════════════════════════════════════════════════════════════
export async function exportPDF(filteredIds, stats) {
  var fullData = await fetchFullBesoins(filteredIds)
  var ordered = []
  for (var i = 0; i < filteredIds.length; i++) {
    for (var j = 0; j < fullData.length; j++) {
      if (fullData[j].id === filteredIds[i]) { ordered.push(extractBesoin(fullData[j])); break }
    }
  }

  var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  var PW = doc.internal.pageSize.getWidth()
  var ML = 14, MR = 14, CW = PW - ML - MR
  var RED = [150, 20, 20]
  var DARK = [40, 40, 40]
  var GRAY = [120, 120, 120]
  var y = 0

  // ── PAGE 1 : RESUME ──
  y = 28
  doc.setFontSize(20); doc.setTextColor(RED[0], RED[1], RED[2]); doc.setFont('helvetica', 'bold')
  doc.text('RAPPORT DES BESOINS', ML, y); y += 7
  doc.setFontSize(11); doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]); doc.setFont('helvetica', 'normal')
  doc.text('PleinGaz ERP - Analyse complete', ML, y); y += 10
  doc.setDrawColor(RED[0], RED[1], RED[2]); doc.setLineWidth(0.7); doc.line(ML, y, PW - MR, y); y += 10
  doc.setFontSize(9); doc.setTextColor(GRAY[0], GRAY[1], GRAY[2])
  doc.text("Date d'export : " + fmtDateTime(new Date().toISOString()), ML, y); y += 5
  doc.text('Nombre de besoins : ' + ordered.length, ML, y); y += 10

  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Montant total demande', fmtFCFA(stats.montantTotal)],
      ['Montant moyen par besoin', fmtFCFA(Math.round(stats.montantMoyen))],
      ['Besoins valides (DG+)', String(stats.valides) + ' (' + (stats.total > 0 ? Math.round(stats.valides / stats.total * 100) : 0) + '%)'],
      ['Besoins rejetes', String(stats.rejetes) + ' (' + (stats.total > 0 ? Math.round(stats.rejetes / stats.total * 100) : 0) + '%)'],
      ['En cours', String(stats.total - stats.valides - stats.rejetes)],
    ],
    styles: { fontSize: 9, cellPadding: 3.5 },
    headStyles: { fillColor: RED, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right', cellWidth: 50 } },
    margin: { left: ML }, tableWidth: 110,
  })
  y = doc.lastAutoTable.finalY + 8

  // Par statut
  var sRows = Object.entries(stats.parStatut).sort(function(a, b) { return b[1].count - a[1].count }).map(function(e) { return [statutLabel(e[0]), String(e[1].count), fmtFCFA(e[1].montant)] })
  if (sRows.length > 0) {
    doc.setFontSize(10); doc.setTextColor(DARK[0], DARK[1], DARK[2]); doc.setFont('helvetica', 'bold')
    doc.text('Repartition par statut', ML, y); y += 4
    autoTable(doc, {
      startY: y, head: [['Statut', 'Nb', 'Montant']], body: sRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'center', cellWidth: 14 }, 2: { halign: 'right', cellWidth: 40 } },
      margin: { left: ML }, tableWidth: 130,
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Par département
  var dRows = Object.entries(stats.parDept).sort(function(a, b) { return b[1].count - a[1].count }).map(function(e) { return [e[0], String(e[1].count), fmtFCFA(e[1].montant)] })
  if (dRows.length > 0) {
    doc.setFontSize(10); doc.setTextColor(DARK[0], DARK[1], DARK[2]); doc.setFont('helvetica', 'bold')
    doc.text('Repartition par departement', ML, y); y += 4
    autoTable(doc, {
      startY: y, head: [['Departement', 'Nb', 'Montant']], body: dRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'center', cellWidth: 14 }, 2: { halign: 'right', cellWidth: 40 } },
      margin: { left: ML }, tableWidth: 130,
    })
  }

  // ── PAGES PAR BESOIN ──
  for (var bi = 0; bi < ordered.length; bi++) {
    var b = ordered[bi]
    doc.addPage()
    y = 14

    // Bandeau
    doc.setFillColor(245, 243, 243)
    doc.roundedRect(ML, y, CW, 16, 2, 2, 'F')
    doc.setFontSize(12); doc.setTextColor(RED[0], RED[1], RED[2]); doc.setFont('helvetica', 'bold')
    doc.text(b.numero, ML + 4, y + 6)
    doc.setFontSize(8); doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]); doc.setFont('helvetica', 'bold')
    doc.text('Statut : ' + b.statut, ML + 4, y + 12)
    doc.setFont('helvetica', 'normal')
    doc.text('Soumis le ' + fmtDateTime(b.dateCreation), PW - MR - 4, y + 6, { align: 'right' })
    y += 22

    // DEMANDEUR
    doc.setFontSize(9); doc.setTextColor(RED[0], RED[1], RED[2]); doc.setFont('helvetica', 'bold')
    doc.text('DEMANDEUR', ML, y); y += 1
    autoTable(doc, {
      startY: y, theme: 'plain',
      body: [['Employe', b.employe], ['Email', b.email], ['Departement', b.departement], ['Entreprise', b.entreprise]],
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', textColor: GRAY, cellWidth: 30 }, 1: { textColor: DARK } },
      margin: { left: ML, right: PW * 0.4 },
    })
    y = doc.lastAutoTable.finalY + 3

    // BESOIN
    doc.setFontSize(9); doc.setTextColor(RED[0], RED[1], RED[2]); doc.setFont('helvetica', 'bold')
    doc.text('BESOIN', ML, y); y += 1
    var besoinBody = [['Titre', b.titre]]
    if (b.details) besoinBody.push(['Details', b.details])
    besoinBody.push(['Montant demande', fmtFCFA(b.montantDemande)])
    autoTable(doc, {
      startY: y, theme: 'plain',
      body: besoinBody,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: { 0: { fontStyle: 'bold', textColor: GRAY, cellWidth: 30 }, 1: { textColor: DARK, cellWidth: CW - 35 } },
      margin: { left: ML, right: MR },
    })
    y = doc.lastAutoTable.finalY + 3

    // CHAINE DE VALIDATION
    doc.setFontSize(9); doc.setTextColor(RED[0], RED[1], RED[2]); doc.setFont('helvetica', 'bold')
    doc.text('CHAINE DE VALIDATION', ML, y); y += 1

    var chain = []
    if (b.dfcPar || b.statutBrut === 'REJETE_DFC') {
      chain.push(['[ VALIDATION DFC ]', ''])
      if (b.dfcPar) chain.push(['Valide par', b.dfcPar])
      if (b.dfcDate) chain.push(['Date et heure', fmtDateTime(b.dfcDate)])
      if (b.dfcMontant != null) chain.push(['Montant valide', fmtFCFA(b.dfcMontant)])
      if (b.dfcCommentaire) chain.push(['Commentaire', b.dfcCommentaire])
      if (b.statutBrut === 'REJETE_DFC' && b.motifRejet) chain.push(['MOTIF DU REJET', b.motifRejet])
      chain.push(['', ''])
    }
    if (b.dgPar || b.statutBrut === 'REJETE_DG') {
      chain.push(['[ VALIDATION DG ]', ''])
      if (b.dgPar) chain.push(['Valide par', b.dgPar])
      if (b.dgDate) chain.push(['Date et heure', fmtDateTime(b.dgDate)])
      if (b.dgMontant != null) chain.push(['Montant valide', fmtFCFA(b.dgMontant)])
      if (b.dgMode) chain.push(['Mode decaissement', b.dgMode])
      if (b.dgCommentaire) chain.push(['Commentaire', b.dgCommentaire])
      if (b.statutBrut === 'REJETE_DG' && b.motifRejet) chain.push(['MOTIF DU REJET', b.motifRejet])
      chain.push(['', ''])
    }
    if (b.decPar) {
      chain.push(['[ DECAISSEMENT ]', ''])
      chain.push(['Decaisse par', b.decPar])
      if (b.decDate) chain.push(['Date et heure', fmtDateTime(b.decDate)])
      chain.push(['Montant decaisse', fmtFCFA(b.decMontant)])
      if (b.decEcart) chain.push(['Justification ecart', b.decEcart])
      chain.push(['', ''])
    }
    if (b.justifNumero) {
      chain.push(['[ JUSTIFICATIF ]', ''])
      chain.push(['N de facture', b.justifNumero])
      chain.push(['Montant facture', fmtFCFA(b.justifMontant)])
      if (b.justifDate) chain.push(['Date et heure', fmtDateTime(b.justifDate)])
      if (b.justifPar) chain.push(['Saisi par', b.justifPar])
      chain.push(['', ''])
    }
    if (b.retourMontant != null) {
      chain.push(['[ RETOUR EN CAISSE ]', ''])
      chain.push(['Montant retourne', fmtFCFA(b.retourMontant)])
      if (b.retourDate) chain.push(['Date confirmation', fmtDateTime(b.retourDate)])
      if (b.retourPar) chain.push(['Confirme par', b.retourPar])
    }
    if (chain.length === 0) chain.push(['', 'Aucune validation enregistree.'])

    autoTable(doc, {
      startY: y, theme: 'plain',
      body: chain,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: GRAY, cellWidth: 35 },
        1: { textColor: DARK },
      },
      margin: { left: ML, right: MR },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 0) {
          var val = String(data.cell.raw || '')
          if (val.charAt(0) === '[' && val.charAt(val.length - 1) === ']') {
            data.cell.styles.textColor = RED
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fontSize = 8.5
          }
          if (val.indexOf('MOTIF DU REJET') !== -1) {
            data.cell.styles.textColor = [180, 30, 30]
            data.cell.styles.fontStyle = 'bold'
          }
        }
        if (data.section === 'body' && data.column.index === 1) {
          var lbl = data.row.raw ? String(data.row.raw[0] || '') : ''
          if (lbl.indexOf('MOTIF DU REJET') !== -1) {
            data.cell.styles.textColor = [180, 30, 30]
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
    })
    y = doc.lastAutoTable.finalY + 5

    // CHRONOLOGIE
    doc.setFontSize(9); doc.setTextColor(RED[0], RED[1], RED[2]); doc.setFont('helvetica', 'bold')
    doc.text('CHRONOLOGIE', ML, y); y += 1
    var chronoBody = []
    for (var ei = 0; ei < b.etapes.length; ei++) {
      chronoBody.push([fmtDateTime(b.etapes[ei].date), b.etapes[ei].label, b.etapes[ei].par])
    }
    autoTable(doc, {
      startY: y,
      head: [['Date et heure', 'Evenement', 'Par']],
      body: chronoBody,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [220, 220, 220], textColor: DARK, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: CW - 70 }, 2: { cellWidth: 35 } },
      margin: { left: ML, right: MR },
    })
    y = doc.lastAutoTable.finalY + 3
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3); doc.line(ML, y, PW - MR, y)
  }

  // Pieds de page
  var pc = doc.internal.getNumberOfPages()
  for (var pi = 1; pi <= pc; pi++) {
    doc.setPage(pi)
    var ph = doc.internal.pageSize.getHeight()
    doc.setFontSize(7); doc.setTextColor(160, 160, 160); doc.setFont('helvetica', 'normal')
    doc.text('PleinGaz ERP - Rapport des besoins - Page ' + pi + '/' + pc, ML, ph - 6)
    doc.text(fmtDateTime(new Date().toISOString()), PW - MR, ph - 6, { align: 'right' })
  }

  doc.save('besoins_rapport_' + new Date().toISOString().slice(0, 10) + '.pdf')
}
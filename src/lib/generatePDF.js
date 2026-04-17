import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = (n) => {
  if (n == null) return '0'
  return Number(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const R = [200, 30, 30]     // Rouge INFOTECH
const D = [35, 35, 35]      // Noir doux
const G = [130, 130, 130]   // Gris texte
const LG = [245, 245, 245]  // Gris fond


// ────────────────────────────────────────────────────────────
// FACTURE
// ────────────────────────────────────────────────────────────
export function genererFacturePDF(facture, commande, lignes, client, reglements = []) {
  const doc = new jsPDF({ format: 'a5' })
  const W = 148.5, m = 10
  let y = 12

  // ── Bandeau haut rouge ──
  doc.setFillColor(...R)
  doc.rect(0, 0, W, 2.5, 'F')

  // ── Nom société ──
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...R)
  doc.text('INFOTECH S.A.', m, y)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  doc.text('Distribution GPL — Marque PLeingaz', m, y + 5)
  doc.text('RC/YAO/2014/M/170 • NIU M121300048218 • BP 8107 Yaoundé', m, y + 9)
  doc.text('Tél: 680 00 00 75 / 699 79 51 81', m, y + 13)

  // ── FACTURE à droite ──
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text('FACTURE', W - m, y - 1, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...R)
  doc.text(facture.numero ?? '', W - m, y + 5, { align: 'right' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  doc.text('Date : ' + new Date(facture.created_at ?? Date.now()).toLocaleDateString('fr-FR'), W - m, y + 10, { align: 'right' })
  doc.text('Cmd : ' + (commande?.numero ?? '—'), W - m, y + 14, { align: 'right' })

  // ── Ligne séparatrice ──
  y += 18
  doc.setDrawColor(...R)
  doc.setLineWidth(0.6)
  doc.line(m, y, W - m, y)
  y += 6

  // ── Bloc client ──
  doc.setFillColor(...LG)
  doc.roundedRect(m, y, W - 2 * m, 20, 2, 2, 'F')

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...R)
  doc.text('FACTURER À', m + 4, y + 4.5)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text(client?.nom_interne ?? '—', m + 4, y + 11)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  const infos = [client?.ville, client?.quartier, client?.telephone].filter(Boolean).join(' • ')
  doc.text(infos || '', m + 4, y + 16)

  if (client?.categorie) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...R)
    doc.text(client.categorie, W - m - 4, y + 11, { align: 'right' })
  }

  y += 25

  // ── Tableau articles ──
  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Qté', 'P.U.', 'Montant']],
    body: (lignes ?? []).map(l => [
      l.articles?.nom ?? l.article_nom ?? '—',
      (l.quantite ?? 0).toString(),
      fmt(l.prix_unitaire) + ' F',
      fmt((l.quantite ?? 0) * (l.prix_unitaire ?? 0)) + ' F',
    ]),
    theme: 'striped',
    headStyles: { fillColor: R, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
    bodyStyles: { fontSize: 7.5, textColor: D, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
    alternateRowStyles: { fillColor: [252, 248, 248] },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 14 },
      2: { halign: 'right', cellWidth: 24 },
      3: { halign: 'right', cellWidth: 26 },
    },
    margin: { left: m, right: m },
  })

  y = doc.lastAutoTable.finalY + 6

  // ── Totaux ──
  const total = (lignes ?? []).reduce((s, l) => s + ((l.quantite ?? 0) * (l.prix_unitaire ?? 0)), 0)
  const regle = Number(facture.montant_regle ?? 0)
  const reste = total - regle

  const bw = 58, bx = W - m - bw
  doc.setFillColor(...LG)
  doc.roundedRect(bx, y, bw, reste > 0 ? 26 : 18, 2, 2, 'F')

  // Total
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  doc.text('Total TTC', bx + 3, y + 5.5)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text(fmt(total) + ' F', bx + bw - 3, y + 5.5, { align: 'right' })

  // Réglé
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 130, 30)
  doc.text('Réglé', bx + 3, y + 12)
  doc.text(fmt(regle) + ' F', bx + bw - 3, y + 12, { align: 'right' })

  // Reste
  if (reste > 0) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...R)
    doc.text('Reste à payer', bx + 3, y + 19)
    doc.setFontSize(10)
    doc.text(fmt(reste) + ' F', bx + bw - 3, y + 19, { align: 'right' })
  }

  y += reste > 0 ? 32 : 24

  // ── Règlements ──
  if (reglements && reglements.length > 0) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...G)
    doc.text('RÈGLEMENTS', m, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['Mode', 'Montant', 'Banque', 'Réf.']],
      body: reglements.map(r => [
        (r.mode ?? '').toUpperCase(),
        fmt(r.montant) + ' F',
        r.banques?.nom ?? r.banque ?? '—',
        r.reference_cheque ?? '—',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [70, 70, 70], fontSize: 6.5, textColor: [255, 255, 255] },
      bodyStyles: { fontSize: 6.5, textColor: D },
      margin: { left: m, right: m },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── Signatures ──
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text('Signature Client', m + 15, y + 2)
  doc.text('Signature Commercial', W - m - 35, y + 2)
  doc.setDrawColor(210, 210, 210)
  doc.setLineWidth(0.3)
  doc.line(m, y + 4, m + 48, y + 4)
  doc.line(W - m - 48, y + 4, W - m, y + 4)

  // ── Pied de page ──
  const fY = 210 - 12
  doc.setFillColor(...R)
  doc.rect(0, 210 - 2.5, W, 2.5, 'F')
  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.2)
  doc.line(m, fY, W - m, fY)
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  doc.text('INFOTECH S.A. • Distribution GPL • Marque PLeingaz • RC/YAO/2014/M/170 • NIU M121300048218 • BP 8107 Yaoundé', W / 2, fY + 4, { align: 'center' })
  doc.text('Imprimé le ' + new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR'), W / 2, fY + 7.5, { align: 'center' })

  doc.save('Facture_' + (facture.numero ?? 'DRAFT') + '.pdf')
}


// ────────────────────────────────────────────────────────────
// BON DE LIVRAISON
// ────────────────────────────────────────────────────────────
export function genererBonLivraisonPDF(bl, facture, commande, lignes, client) {
  const doc = new jsPDF({ format: 'a5' })
  const W = 148.5, m = 10
  let y = 12

  doc.setFillColor(...R)
  doc.rect(0, 0, W, 2.5, 'F')

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...R)
  doc.text('INFOTECH S.A.', m, y)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  doc.text('Distribution GPL — Marque PLeingaz', m, y + 5)
  doc.text('Tél: 680 00 00 75 / 699 79 51 81 • Yaoundé', m, y + 9)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text('BON DE LIVRAISON', W - m, y - 1, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...R)
  doc.text(bl.numero ?? '', W - m, y + 5, { align: 'right' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  doc.text('Facture : ' + (facture?.numero ?? '—'), W - m, y + 10, { align: 'right' })
  doc.text('Date : ' + new Date(bl.created_at ?? Date.now()).toLocaleDateString('fr-FR'), W - m, y + 14, { align: 'right' })

  y += 18
  doc.setDrawColor(...R)
  doc.setLineWidth(0.6)
  doc.line(m, y, W - m, y)
  y += 6

  // Client
  doc.setFillColor(...LG)
  doc.roundedRect(m, y, W - 2 * m, 16, 2, 2, 'F')
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...R)
  doc.text('LIVRER À', m + 4, y + 4.5)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text(client?.nom_interne ?? '—', m + 4, y + 11)
  y += 20

  // Tableau
  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Quantité']],
    body: (lignes ?? []).map(l => [l.articles?.nom ?? '—', (l.quantite ?? 0).toString()]),
    theme: 'striped',
    headStyles: { fillColor: R, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8, textColor: D, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    alternateRowStyles: { fillColor: [252, 248, 248] },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center', cellWidth: 26 } },
    margin: { left: m, right: m },
  })

  y = doc.lastAutoTable.finalY + 12
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text('Signature Magasinier', m + 12, y)
  doc.text('Signature Client', W - m - 28, y)
  doc.setDrawColor(210, 210, 210)
  doc.line(m, y + 3, m + 48, y + 3)
  doc.line(W - m - 48, y + 3, W - m, y + 3)

  const fY = 210 - 10
  doc.setFillColor(...R)
  doc.rect(0, 210 - 2.5, W, 2.5, 'F')
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  doc.text('INFOTECH S.A. • Distribution GPL PLeingaz • Yaoundé', W / 2, fY + 4, { align: 'center' })

  doc.save('BL_' + (bl.numero ?? 'DRAFT') + '.pdf')
}


// ────────────────────────────────────────────────────────────
// BON DE SORTIE
// ────────────────────────────────────────────────────────────
export function genererBonSortiePDF(bl, facture, lignes, client, magasin) {
  const doc = new jsPDF({ format: 'a5' })
  const W = 148.5, m = 10
  let y = 12

  doc.setFillColor(...R)
  doc.rect(0, 0, W, 2.5, 'F')

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...R)
  doc.text('INFOTECH S.A.', m, y)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  doc.text('Distribution GPL — Marque PLeingaz', m, y + 5)
  doc.text('Tél: 680 00 00 75 / 699 79 51 81 • Yaoundé', m, y + 9)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text('BON DE SORTIE', W - m, y - 1, { align: 'right' })

  const bsNum = 'BS-' + (bl.numero ?? '').replace('BL-', '')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...R)
  doc.text(bsNum, W - m, y + 5, { align: 'right' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  doc.text('BL : ' + (bl.numero ?? '—') + '  •  Facture : ' + (facture?.numero ?? '—'), W - m, y + 10, { align: 'right' })
  doc.text('Date : ' + new Date().toLocaleDateString('fr-FR'), W - m, y + 14, { align: 'right' })

  y += 18
  doc.setDrawColor(...R)
  doc.setLineWidth(0.6)
  doc.line(m, y, W - m, y)
  y += 6

  // Magasin + Client
  const hw = (W - 2 * m - 6) / 2
  doc.setFillColor(...LG)
  doc.roundedRect(m, y, hw, 16, 2, 2, 'F')
  doc.roundedRect(m + hw + 6, y, hw, 16, 2, 2, 'F')

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...R)
  doc.text('MAGASIN', m + 4, y + 4.5)
  doc.setFontSize(10)
  doc.setTextColor(...D)
  doc.text(magasin ?? '—', m + 4, y + 11)

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...R)
  doc.text('CLIENT', m + hw + 10, y + 4.5)
  doc.setFontSize(10)
  doc.setTextColor(...D)
  doc.text(client?.nom_interne ?? '—', m + hw + 10, y + 11)

  y += 21

  // Tableau
  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Quantité sortie']],
    body: (lignes ?? []).map(l => [l.articles?.nom ?? '—', (l.quantite ?? 0).toString()]),
    theme: 'striped',
    headStyles: { fillColor: R, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8, textColor: D, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    alternateRowStyles: { fillColor: [252, 248, 248] },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center', cellWidth: 28 } },
    margin: { left: m, right: m },
  })

  y = doc.lastAutoTable.finalY + 12
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text('Signature Magasinier', m + 12, y)
  doc.text('Signature Récepteur', W - m - 30, y)
  doc.setDrawColor(210, 210, 210)
  doc.line(m, y + 3, m + 48, y + 3)
  doc.line(W - m - 48, y + 3, W - m, y + 3)

  const fY = 210 - 10
  doc.setFillColor(...R)
  doc.rect(0, 210 - 2.5, W, 2.5, 'F')
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  doc.text('INFOTECH S.A. • Distribution GPL PLeingaz • Yaoundé', W / 2, fY + 4, { align: 'center' })

  doc.save('BS_' + (bl.numero ?? 'DRAFT') + '.pdf')
}


// ────────────────────────────────────────────────────────────
// BORDEREAU DE ROUTE (sortie hors ville)
// ────────────────────────────────────────────────────────────
export function genererBordereauRoutePDF(sortie, lignes, vendeur, vehicule) {
  const doc = new jsPDF({ format: 'a4' })
  const W = 210, m = 15
  let y = 15

  // ── Bandeau haut rouge ──
  doc.setFillColor(...R)
  doc.rect(0, 0, W, 4, 'F')

  // ── Nom société ──
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...R)
  doc.text('INFOTECH S.A.', m, y + 5)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)
  doc.text('Distribution GPL PLeingaz', m, y + 11)
  doc.text('Yaoundé — Cameroun', m, y + 15)

  // ── Titre ──
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text('BORDEREAU DE ROUTE', W - m, y + 5, { align: 'right' })

  doc.setFontSize(10)
  doc.setTextColor(...R)
  doc.text(sortie.numero ?? '', W - m, y + 12, { align: 'right' })

  y += 25

  // ── Ligne séparatrice ──
  doc.setDrawColor(...R)
  doc.setLineWidth(0.5)
  doc.line(m, y, W - m, y)
  y += 8

  // ── Infos sortie ──
  const infos = [
    ['Commercial', `${vendeur?.prenom ?? ''} ${vendeur?.nom ?? ''}`],
    ['Véhicule', `${vehicule?.immatriculation ?? ''} ${vehicule?.nom ? '— ' + vehicule.nom : ''}`],
    ['Destination', sortie.destination ?? '—'],
    ['Durée prévue', `${sortie.duree_prevue ?? 1} jour(s)`],
    ['Date départ', new Date(sortie.date_sortie ?? sortie.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
    ['Frais de route', sortie.frais_route ? fmt(sortie.frais_route) + ' F CFA' : '—'],
    ['Itinéraire', sortie.itineraires?.nom ?? '—'],
  ]

  doc.setFontSize(9)
  infos.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...G)
    doc.text(label + ' :', m, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...D)
    doc.text(value, m + 45, y)
    y += 6
  })

  if (sortie.notes) {
    y += 2
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...G)
    doc.text('Instructions :', m, y)
    y += 5
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...D)
    const splitNotes = doc.splitTextToSize(sortie.notes, W - 2 * m)
    doc.text(splitNotes, m, y)
    y += splitNotes.length * 4.5
  }

  y += 8

  // ── Tableau articles chargés ──
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text('Articles chargés', m, y)
  y += 3

  const tableData = lignes.filter(l => l.quantite_sortie > 0).map(l => [
    l.articles?.nom ?? l.nom ?? '—',
    l.quantite_sortie.toString(),
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: m, right: m },
    head: [['Article', 'Quantité']],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 3, textColor: D },
    headStyles: { fillColor: R, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: LG },
    columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
  })

  y = doc.lastAutoTable.finalY + 5
  const totalUnites = lignes.filter(l => l.quantite_sortie > 0).reduce((s, l) => s + l.quantite_sortie, 0)

  doc.setFillColor(...LG)
  doc.roundedRect(m, y, W - 2 * m, 10, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D)
  doc.text(`Total : ${lignes.filter(l => l.quantite_sortie > 0).length} article(s) — ${totalUnites} unité(s)`, m + 5, y + 6.5)

  y += 20

  // ── Signatures ──
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...G)

  const sigW = (W - 3 * m) / 2
  doc.text('Signature Chef d\'agence', m, y)
  doc.setDrawColor(200, 200, 200)
  doc.line(m, y + 2, m + sigW, y + 2)

  doc.text('Signature Commercial', m + sigW + m, y)
  doc.line(m + sigW + m, y + 2, W - m, y + 2)

  y += 25
  doc.text('Signature Magasinier (stock déchargé)', m, y)
  doc.line(m, y + 2, m + sigW, y + 2)

  doc.text('Date retour : ____/____/________', m + sigW + m, y)

  // ── Pied de page ──
  doc.setFillColor(...R)
  doc.rect(0, 297 - 3, W, 3, 'F')
  doc.setFontSize(6)
  doc.setTextColor(...G)
  doc.text('INFOTECH S.A. • Distribution GPL PLeingaz • Yaoundé — Document généré automatiquement', W / 2, 297 - 5, { align: 'center' })

  doc.save('Bordereau_Route_' + (sortie.numero ?? 'DRAFT') + '.pdf')
}

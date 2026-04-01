import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') : '0'

// Couleurs
const RED = [220, 53, 34]
const DARK = [40, 40, 40]
const GRAY = [120, 120, 120]
const LIGHT = [248, 248, 248]
const WHITE = [255, 255, 255]

function entete(doc, titre, numero, date, refExtra) {
  const W = doc.internal.pageSize.getWidth()
  const m = 15
  let y = 15

  // Bande rouge en haut
  doc.setFillColor(...RED)
  doc.rect(0, 0, W, 4, 'F')

  // INFOTECH S.A.
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...RED)
  doc.text('INFOTECH S.A.', m, y + 4)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  y += 10
  doc.text('S.A. au capital de 100 000 000 Fcfa • RC/YAO/2014/M/170', m, y)
  y += 4
  doc.text('N° Contrib. M121300048218 • BP 8107 Yaoundé-Cameroun', m, y)
  y += 4
  doc.text('Tél: 680 00 00 75 / 699 79 51 81 • info@monpleingaz.com', m, y)

  // Titre document à droite
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...RED)
  doc.text(titre, W - m, 22, { align: 'right' })

  // Numéro
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(numero ?? '', W - m, 30, { align: 'right' })

  // Date
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('Date: ' + (date ? new Date(date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')), W - m, 36, { align: 'right' })

  // Ref extra
  if (refExtra) {
    doc.text(refExtra, W - m, 42, { align: 'right' })
  }

  // Ligne rouge
  y += 6
  doc.setDrawColor(...RED)
  doc.setLineWidth(1)
  doc.line(m, y, W - m, y)

  return y + 6
}

function blocClient(doc, y, client) {
  const m = 15
  const W = doc.internal.pageSize.getWidth()

  doc.setFillColor(...LIGHT)
  doc.roundedRect(m, y, W - 2 * m, 24, 3, 3, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...RED)
  doc.text('CLIENT', m + 5, y + 5)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(client?.nom_interne ?? '—', m + 5, y + 13)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  const infos = [client?.ville, client?.quartier, client?.telephone].filter(Boolean).join(' • ')
  doc.text(infos || '', m + 5, y + 19)

  if (client?.categorie) {
    doc.setFontSize(8)
    doc.setTextColor(...RED)
    doc.text(client.categorie, W - m - 5, y + 13, { align: 'right' })
  }

  return y + 30
}

function piedDePage(doc) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const footerY = H - 20

  // Bande rouge en bas
  doc.setFillColor(...RED)
  doc.rect(0, H - 4, W, 4, 'F')

  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(15, footerY, W - 15, footerY)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('INFOTECH S.A. — RC/YAO/2014/M/170 — NIU: M121300048218 — BP 8107 Yaoundé', W / 2, footerY + 5, { align: 'center' })
  doc.text('Distribution GPL — Marque PLeingaz — www.monpleingaz.com', W / 2, footerY + 9, { align: 'center' })
  doc.text('Imprimé le ' + new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR'), W / 2, footerY + 13, { align: 'center' })
}


/**
 * FACTURE PDF — A4 rouge et blanc
 */
export function genererFacturePDF(facture, commande, lignes, client, reglements = []) {
  const doc = new jsPDF()
  const W = doc.internal.pageSize.getWidth()
  const m = 15

  let y = entete(doc, 'FACTURE', facture.numero, facture.created_at, 'Commande: ' + (commande?.numero ?? '—'))
  y = blocClient(doc, y, client)

  // Tableau articles
  const tableData = (lignes ?? []).map(l => [
    l.articles?.nom ?? l.article_nom ?? '—',
    (l.quantite ?? 0).toString(),
    fmt(l.prix_unitaire) + ' F',
    fmt((l.quantite ?? 0) * (l.prix_unitaire ?? 0)) + ' F',
  ])

  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Qté', 'Prix unitaire', 'Montant']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: RED, textColor: WHITE, fontStyle: 'bold', fontSize: 9, halign: 'center' },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: [252, 245, 245] },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: m, right: m },
  })

  y = doc.lastAutoTable.finalY + 8

  // Totaux
  const totalHT = (lignes ?? []).reduce((s, l) => s + ((l.quantite ?? 0) * (l.prix_unitaire ?? 0)), 0)
  const montantRegle = Number(facture.montant_regle ?? 0)
  const reste = totalHT - montantRegle

  const bx = W - m - 75
  doc.setFillColor(...LIGHT)
  doc.roundedRect(bx, y, 75, reste > 0 ? 30 : 22, 2, 2, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('TOTAL TTC', bx + 4, y + 7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...DARK)
  doc.text(fmt(totalHT) + ' F', bx + 71, y + 7, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(34, 139, 34)
  doc.text('Réglé', bx + 4, y + 15)
  doc.text(fmt(montantRegle) + ' F', bx + 71, y + 15, { align: 'right' })

  if (reste > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...RED)
    doc.text('RESTE', bx + 4, y + 23)
    doc.setFontSize(12)
    doc.text(fmt(reste) + ' F', bx + 71, y + 23, { align: 'right' })
  }

  y += reste > 0 ? 38 : 30

  // Règlements
  if (reglements && reglements.length > 0) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...RED)
    doc.text('DÉTAIL DES RÈGLEMENTS', m, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Mode', 'Montant', 'Banque', 'Référence']],
      body: reglements.map(r => [
        (r.mode ?? '').toUpperCase(),
        fmt(r.montant) + ' F',
        r.banques?.nom ?? r.banque ?? '—',
        r.reference_cheque ?? '—',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [80, 80, 80], fontSize: 8, textColor: WHITE },
      bodyStyles: { fontSize: 8 },
      margin: { left: m, right: m },
    })

    y = doc.lastAutoTable.finalY + 10
  }

  // Signatures
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Signature Client', m + 20, y + 4)
  doc.text('Signature Commercial', W - m - 40, y + 4)

  doc.setDrawColor(200, 200, 200)
  doc.line(m, y + 6, m + 60, y + 6)
  doc.line(W - m - 60, y + 6, W - m, y + 6)

  piedDePage(doc)
  doc.save('Facture_' + (facture.numero ?? 'DRAFT') + '.pdf')
}


/**
 * BON DE LIVRAISON PDF — A4 rouge et blanc
 */
export function genererBonLivraisonPDF(bl, facture, commande, lignes, client) {
  const doc = new jsPDF()
  const W = doc.internal.pageSize.getWidth()
  const m = 15

  let y = entete(doc, 'BON DE LIVRAISON', bl.numero, bl.created_at, 'Facture: ' + (facture?.numero ?? '—'))
  y = blocClient(doc, y, client)

  // Tableau
  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Quantité']],
    body: (lignes ?? []).map(l => [
      l.articles?.nom ?? l.article_nom ?? '—',
      (l.quantite ?? 0).toString(),
    ]),
    theme: 'grid',
    headStyles: { fillColor: RED, textColor: WHITE, fontStyle: 'bold', fontSize: 10, halign: 'center' },
    bodyStyles: { fontSize: 10, textColor: DARK },
    alternateRowStyles: { fillColor: [252, 245, 245] },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center', cellWidth: 30 } },
    margin: { left: m, right: m },
  })

  y = doc.lastAutoTable.finalY + 15

  // Signatures
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Signature Magasinier', m + 15, y)
  doc.text('Signature Client', W - m - 40, y)

  doc.setDrawColor(200, 200, 200)
  doc.line(m, y + 3, m + 60, y + 3)
  doc.line(W - m - 60, y + 3, W - m, y + 3)

  piedDePage(doc)
  doc.save('BL_' + (bl.numero ?? 'DRAFT') + '.pdf')
}


/**
 * BON DE SORTIE PDF — A4 rouge et blanc
 */
export function genererBonSortiePDF(bl, facture, lignes, client, magasin) {
  const doc = new jsPDF()
  const W = doc.internal.pageSize.getWidth()
  const m = 15

  const bsNumero = 'BS-' + (bl.numero ?? '').replace('BL-', '')
  let y = entete(doc, 'BON DE SORTIE', bsNumero, null, 'BL: ' + (bl.numero ?? '—') + '  •  Facture: ' + (facture?.numero ?? '—'))

  // Bloc infos
  doc.setFillColor(...LIGHT)
  doc.roundedRect(m, y, (W - 2 * m) / 2 - 5, 18, 3, 3, 'F')
  doc.roundedRect(m + (W - 2 * m) / 2 + 5, y, (W - 2 * m) / 2 - 5, 18, 3, 3, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...RED)
  doc.text('MAGASIN SOURCE', m + 5, y + 5)
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text(magasin ?? '—', m + 5, y + 13)

  const cx = m + (W - 2 * m) / 2 + 10
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...RED)
  doc.text('CLIENT DESTINATAIRE', cx, y + 5)
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text(client?.nom_interne ?? '—', cx, y + 13)

  y += 24

  // Tableau
  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Quantité sortie']],
    body: (lignes ?? []).map(l => [
      l.articles?.nom ?? l.article_nom ?? '—',
      (l.quantite ?? 0).toString(),
    ]),
    theme: 'grid',
    headStyles: { fillColor: RED, textColor: WHITE, fontStyle: 'bold', fontSize: 10, halign: 'center' },
    bodyStyles: { fontSize: 10, textColor: DARK },
    alternateRowStyles: { fillColor: [252, 245, 245] },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center', cellWidth: 35 } },
    margin: { left: m, right: m },
  })

  y = doc.lastAutoTable.finalY + 15

  // Signatures
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Signature Magasinier', m + 15, y)
  doc.text('Signature Récepteur', W - m - 40, y)

  doc.setDrawColor(200, 200, 200)
  doc.line(m, y + 3, m + 60, y + 3)
  doc.line(W - m - 60, y + 3, W - m, y + 3)

  piedDePage(doc)
  doc.save('BS_' + (bl.numero ?? 'DRAFT') + '.pdf')
}

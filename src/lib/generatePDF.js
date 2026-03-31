import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = (n) => n != null ? Number(n).toLocaleString('fr-FR') : '0'

/**
 * Facture INFOTECH S.A. — format identique au carnet papier
 * Taille : ~185mm x 135mm (petit format reçu)
 */
export function genererFacturePDF(facture, commande, lignes, client, reglements = []) {
  // Format petit reçu (185 x 135 mm)
  const doc = new jsPDF({ unit: 'mm', format: [185, 135] })
  const W = 185
  const H = 135
  const m = 6 // marge
  let y = 6

  // ═══════════════════════════════════════════
  // EN-TÊTE
  // ═══════════════════════════════════════════

  // Logo cercle (simulé)
  doc.setDrawColor(200, 0, 0)
  doc.setLineWidth(0.5)
  doc.circle(m + 7, y + 7, 6)
  doc.setFontSize(3.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(200, 0, 0)
  doc.text('INFOTECH S.A.', m + 7, y + 8.5, { align: 'center' })

  // Nom entreprise
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(220, 0, 0)
  doc.text('INFOTECH S.A.', m + 16, y + 4)

  // Infos légales
  doc.setFontSize(4.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)
  doc.text('S.A. au capital de 100 000 000 Fcfa • RC/YAO/2014/M/170', m + 16, y + 8)
  doc.text('N° Contrib. M121300048218 • 8107 Yaoundé-Cameroun', m + 16, y + 11)
  doc.text('YAOUNDÉ: Mending face EM Money • Tél.: 680 00 00 75 / 699 79 51 81', m + 16, y + 14)
  doc.text('DOUALA: Carrefour Anatole • Tél.: 699 81 83 52 / 699 82 14 17', m + 16, y + 17)
  doc.text('DSCHANG: Marché Tsinfem • Tél.: 699 70 72 62', m + 16, y + 20)
  doc.text('MAROUA: Petit marché Domayo • Tél.: 699 81 82 92', m + 16, y + 23)

  // Boîte BP à droite
  const bpX = W - m - 30
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.rect(bpX, y, 30, 8)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('BP', bpX + 2, y + 5)
  // BP client
  doc.setFont('helvetica', 'normal')
  doc.text(client?.bp ?? '', bpX + 10, y + 5)

  // FACTURE N°
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('FACTURE', W - m - 30, y + 17)
  
  doc.setFontSize(9)
  doc.text('N°', W - m - 14, y + 17)
  
  doc.setTextColor(220, 0, 0)
  doc.setFontSize(10)
  doc.text(facture.numero ?? '', W - m, y + 17, { align: 'right' })

  // Date en petit
  doc.setFontSize(5)
  doc.setTextColor(100, 100, 100)
  doc.text(`Le ${new Date(facture.created_at ?? Date.now()).toLocaleDateString('fr-FR')}`, W - m, y + 21, { align: 'right' })

  y += 27

  // ═══════════════════════════════════════════
  // REÇU DE M
  // ═══════════════════════════════════════════

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(m, y, W - m, y)
  y += 4

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('REÇU de M', m, y)
  
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(5)
  doc.setTextColor(100, 100, 100)
  doc.text('Received from', m + 22, y)

  // Nom du client
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.text(client?.nom_interne ?? '________________________________', m + 42, y)

  // Ligne pointillée
  doc.setLineDashPattern([0.5, 0.5], 0)
  doc.line(m + 42, y + 1, W - m, y + 1)
  doc.setLineDashPattern([], 0)

  y += 6

  // ═══════════════════════════════════════════
  // TABLEAU DES ARTICLES
  // ═══════════════════════════════════════════

  const tableData = (lignes ?? []).map(l => [
    l.articles?.nom ?? l.article_nom ?? '',
    (l.quantite ?? 0).toString(),
    fmt(l.prix_unitaire),
    fmt(l.quantite * l.prix_unitaire),
  ])

  // Remplir jusqu'à 6 lignes minimum pour le format papier
  while (tableData.length < 6) {
    tableData.push(['', '', '', ''])
  }

  autoTable(doc, {
    startY: y,
    head: [['Désignations', 'Qté', 'Prix Unit.', 'Montant']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 15 },
      2: { halign: 'right', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 25 },
    },
    margin: { left: m, right: m },
  })

  y = doc.lastAutoTable.finalY

  // ═══════════════════════════════════════════
  // ARRÊTÉ + TOTAL
  // ═══════════════════════════════════════════

  const totalHT = (lignes ?? []).reduce((s, l) => s + (l.quantite * l.prix_unitaire), 0)

  // Ligne "Arrêté la présente facture à la somme de :"
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  y += 0.5

  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(0, 0, 0)
  doc.text('Arrêté la présente facture à la somme de :', m + 2, y + 3.5)

  // TOTAL box à droite
  const totalX = W - m - 25
  doc.setLineWidth(0.3)
  doc.rect(totalX - 15, y, 40, 6)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', totalX - 13, y + 4)
  doc.setFontSize(8)
  doc.text(fmt(totalHT) + ' F', W - m - 2, y + 4, { align: 'right' })

  y += 8

  // ═══════════════════════════════════════════
  // RESTE / BALANCE
  // ═══════════════════════════════════════════

  const montantRegle = Number(facture.montant_regle ?? 0)
  const reste = totalHT - montantRegle

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Reste', m + 40, y + 2)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(5)
  doc.setTextColor(100, 100, 100)
  doc.text('Balance', m + 50, y + 2)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(220, 0, 0)
  doc.text(reste > 0 ? fmt(reste) + ' F' : '—', m + 65, y + 2)

  // Fait à ... le ...
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Fait à', W - m - 55, y + 2)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(5)
  doc.setTextColor(100, 100, 100)
  doc.text('Issued at', W - m - 48, y + 2)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(0, 0, 0)
  doc.text('Yaoundé', W - m - 35, y + 2)

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text('le', W - m - 18, y + 2)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(5)
  doc.setTextColor(100, 100, 100)
  doc.text('The', W - m - 15, y + 2)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(0, 0, 0)
  doc.text(new Date(facture.created_at ?? Date.now()).toLocaleDateString('fr-FR'), W - m - 8, y + 2)

  y += 7

  // ═══════════════════════════════════════════
  // SIGNATURES
  // ═══════════════════════════════════════════

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(m, y, W - m, y)
  y += 3

  // Signature Client
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Signature Client', m + 15, y + 2)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(4.5)
  doc.setTextColor(100, 100, 100)
  doc.text('Customers visa', m + 15, y + 5)

  // Signature Commercial
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Signature Commercial', W - m - 40, y + 2)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(4.5)
  doc.setTextColor(100, 100, 100)
  doc.text('Commercial visa', W - m - 40, y + 5)

  // Télécharger
  doc.save(`Facture_${facture.numero ?? 'DRAFT'}.pdf`)
}


/**
 * Bon de livraison INFOTECH S.A. — même format
 */
export function genererBonLivraisonPDF(bl, facture, commande, lignes, client) {
  const doc = new jsPDF({ unit: 'mm', format: [185, 135] })
  const W = 185
  const m = 6
  let y = 6

  // En-tête identique
  doc.setDrawColor(200, 0, 0)
  doc.setLineWidth(0.5)
  doc.circle(m + 7, y + 7, 6)
  doc.setFontSize(3.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(200, 0, 0)
  doc.text('INFOTECH S.A.', m + 7, y + 8.5, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(220, 0, 0)
  doc.text('INFOTECH S.A.', m + 16, y + 4)

  doc.setFontSize(4.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)
  doc.text('S.A. au capital de 100 000 000 Fcfa • RC/YAO/2014/M/170', m + 16, y + 8)
  doc.text('N° Contrib. M121300048218 • 8107 Yaoundé-Cameroun', m + 16, y + 11)
  doc.text('YAOUNDÉ: Mending face EM Money • Tél.: 680 00 00 75 / 699 79 51 81', m + 16, y + 14)
  doc.text('DOUALA: Carrefour Anatole • Tél.: 699 81 83 52 / 699 82 14 17', m + 16, y + 17)

  // BON DE LIVRAISON N°
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('BON DE LIVRAISON', W - m - 30, y + 10)
  
  doc.setFontSize(8)
  doc.text('N°', W - m - 14, y + 15)
  doc.setTextColor(220, 0, 0)
  doc.text(bl.numero ?? '', W - m, y + 15, { align: 'right' })

  doc.setFontSize(5)
  doc.setTextColor(100, 100, 100)
  doc.text(`Facture: ${facture?.numero ?? '—'}`, W - m, y + 19, { align: 'right' })
  doc.text(`Le ${new Date(bl.created_at ?? Date.now()).toLocaleDateString('fr-FR')}`, W - m, y + 22, { align: 'right' })

  y += 27
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(m, y, W - m, y)
  y += 4

  // LIVRER À
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('LIVRER À:', m, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(client?.nom_interne ?? '—', m + 22, y)
  y += 6

  // Tableau
  const tableData = (lignes ?? []).map(l => [
    l.articles?.nom ?? l.article_nom ?? '',
    (l.quantite ?? 0).toString(),
  ])
  while (tableData.length < 6) tableData.push(['', ''])

  autoTable(doc, {
    startY: y,
    head: [['Désignations', 'Quantité']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { halign: 'left', cellWidth: 'auto' }, 1: { halign: 'center', cellWidth: 25 } },
    margin: { left: m, right: m },
  })

  y = doc.lastAutoTable.finalY + 5
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.2)
  doc.line(m, y, W - m, y)
  y += 3

  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.text('Signature Magasinier', m + 10, y + 2)
  doc.text('Signature Client', W - m - 35, y + 2)

  doc.save(`BL_${bl.numero ?? 'DRAFT'}.pdf`)
}

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { BillItem, BillSummary, formatCurrency } from '@/lib/billCalculations';

// Sharp & Muted aesthetic - no rounded corners, professional monochrome
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #1a1a1a',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 12,
    color: '#525252',
    marginBottom: 3,
  },
  billInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  billInfoItem: {
    fontSize: 9,
    color: '#525252',
  },
  billNumber: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  table: {
    width: '100%',
    borderTop: '1 solid #d4d4d4',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottom: '1 solid #a3a3a3',
    paddingVertical: 8,
    paddingHorizontal: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e5e5',
    paddingVertical: 6,
    paddingHorizontal: 5,
    fontSize: 9,
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  col1: { width: '15%' }, // Date
  col2: { width: '10%' }, // Type
  col3: { width: '35%' }, // Description
  col4: { width: '13%', textAlign: 'right' }, // Debit
  col5: { width: '13%', textAlign: 'right' }, // Credit
  col6: { width: '14%', textAlign: 'right' }, // Balance
  cellText: {
    color: '#262626',
  },
  cellTextMuted: {
    color: '#737373',
    fontSize: 8,
  },
  cellTextBold: {
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  summary: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '50%',
    borderTop: '2 solid #a3a3a3',
    paddingTop: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 10,
  },
  summaryLabel: {
    color: '#525252',
  },
  summaryValue: {
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    textAlign: 'right',
  },
  summaryTotal: {
    borderTop: '2 solid #1a1a1a',
    paddingTop: 10,
    marginTop: 5,
  },
  summaryTotalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  summaryTotalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1 solid #d4d4d4',
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 9,
    color: '#525252',
    marginBottom: 25,
  },
  signatureLine: {
    borderTop: '1 solid #a3a3a3',
    paddingTop: 5,
  },
  signatureText: {
    fontSize: 8,
    color: '#737373',
  },
  notes: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    border: '1 solid #d4d4d4',
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#525252',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 8,
    color: '#525252',
    fontStyle: 'italic',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: '#a3a3a3',
  },
});

interface BillTemplateProps {
  billNumber: string;
  generatedDate: string;
  periodStart: string;
  periodEnd: string;
  items: BillItem[];
  summary: BillSummary;
  staffName?: string;
  billTitle?: string;
}

export const BillTemplate: React.FC<BillTemplateProps> = ({
  billNumber,
  generatedDate,
  periodStart,
  periodEnd,
  items,
  summary,
  staffName = 'Staff Member',
  billTitle = 'Food Spend Optimizer',
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{billTitle}</Text>
          <Text style={styles.subtitle}>Settlement Bill</Text>
          <View style={styles.billInfo}>
            <View>
              <Text style={styles.billInfoItem}>Bill Period:</Text>
              <Text style={styles.billInfoItem}>{periodStart} to {periodEnd}</Text>
            </View>
            <View>
              <Text style={styles.billNumber}>Bill #{billNumber}</Text>
              <Text style={styles.billInfoItem}>Generated: {generatedDate}</Text>
            </View>
          </View>
        </View>

        {/* Staff Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settlement For</Text>
          <Text style={styles.cellText}>{staffName}</Text>
        </View>

        {/* Itemized Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itemized Breakdown</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Date</Text>
              <Text style={styles.col2}>Type</Text>
              <Text style={styles.col3}>Description</Text>
              <Text style={styles.col4}>Debit</Text>
              <Text style={styles.col5}>Credit</Text>
              <Text style={styles.col6}>Balance</Text>
            </View>

            {items.map((item, index) => (
              <View 
                key={item.id} 
                style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
              >
                <View style={styles.col1}>
                  <Text style={styles.cellText}>{item.gregorianDate}</Text>
                  <Text style={styles.cellTextMuted}>{item.nepaliDate}</Text>
                </View>
                <Text style={[styles.col2, styles.cellTextMuted]}>
                  {item.type}
                </Text>
                <View style={styles.col3}>
                  <Text style={styles.cellText}>{item.description}</Text>
                  {item.notes && (
                    <Text style={styles.cellTextMuted}>{item.notes}</Text>
                  )}
                </View>
                <Text style={[styles.col4, styles.cellText]}>
                  {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                </Text>
                <Text style={[styles.col5, styles.cellText]}>
                  {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                </Text>
                <Text style={[styles.col6, styles.cellTextBold]}>
                  {formatCurrency(item.balance)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Cook Fees:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalCookFees)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Reimbursable Groceries:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalStaffGroceries)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Due:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.subtotalDue)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Payments Made:</Text>
            <Text style={styles.summaryValue}>-{formatCurrency(summary.totalPayments)}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Final Amount Due:</Text>
            <Text style={styles.summaryTotalValue}>{formatCurrency(summary.finalAmountDue)}</Text>
          </View>

          {summary.totalTips > 0 && (
            <View style={[styles.summaryRow, { marginTop: 15 }]}>
              <Text style={[styles.summaryLabel, { fontSize: 8 }]}>
                (Tips paid separately: {formatCurrency(summary.totalTips)})
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Staff Signature:</Text>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureText}>_______________________</Text>
              </View>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Date:</Text>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureText}>_______________________</Text>
              </View>
            </View>
          </View>

          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>
              This bill includes cook fees and staff-purchased groceries (reimbursable items).
              Tips are excluded from the amount due calculation.
            </Text>
          </View>
        </View>

        {/* Page Number */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
};

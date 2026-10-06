import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import { Platform } from 'react-native';

const PROFIT_REPORT_DIRECTORY_KEY = '@corbital/profit-report-directory';
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 36;

export type ProfitOverviewReportRow = {
  email: string;
  entryCount: number;
  netProfit: number;
  purchaseAmount: number;
  sellAmount: number;
  username: string;
};

type ProfitOverviewReportInput = {
  month?: number;
  period: 'monthly' | 'yearly';
  rows: ProfitOverviewReportRow[];
  year: number;
};

const formatCurrency = (value: number) =>
  `Rs. ${Math.round(value).toLocaleString('en-IN')}`;

const toPdfText = (value: string) =>
  value.replace(/[^\x20-\x7e\xa0-\xff]/g, '?');

const drawRightAlignedText = (
  page: PDFPage,
  font: PDFFont,
  text: string,
  right: number,
  y: number,
  size: number,
  color = rgb(0.22, 0.25, 0.3),
) => {
  const safeText = toPdfText(text);
  page.drawText(safeText, {
    color,
    font,
    size,
    x: right - font.widthOfTextAtSize(safeText, size),
    y,
  });
};

async function createProfitOverviewPdf(
  input: ProfitOverviewReportInput,
  periodLabel: string,
) {
  const document = await PDFDocument.create();
  const regularFont = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const darkRed = rgb(0.6, 0.11, 0.11);
  const muted = rgb(0.42, 0.46, 0.51);
  const totals = input.rows.reduce(
    (summary, row) => ({
      entryCount: summary.entryCount + row.entryCount,
      netProfit: summary.netProfit + row.netProfit,
      purchaseAmount: summary.purchaseAmount + row.purchaseAmount,
      sellAmount: summary.sellAmount + row.sellAmount,
    }),
    { entryCount: 0, netProfit: 0, purchaseAmount: 0, sellAmount: 0 },
  );
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_MARGIN;

  const drawTableHeader = () => {
    page.drawRectangle({
      color: darkRed,
      height: 24,
      width: PAGE_WIDTH - PAGE_MARGIN * 2,
      x: PAGE_MARGIN,
      y: y - 17,
    });
    page.drawText('USER', { color: rgb(1, 1, 1), font: boldFont, size: 8, x: 43, y: y - 9 });
    drawRightAlignedText(page, boldFont, 'ENTRIES', 325, y - 9, 8, rgb(1, 1, 1));
    drawRightAlignedText(page, boldFont, 'PURCHASE', 407, y - 9, 8, rgb(1, 1, 1));
    drawRightAlignedText(page, boldFont, 'SELL', 487, y - 9, 8, rgb(1, 1, 1));
    drawRightAlignedText(page, boldFont, 'NET PROFIT', 552, y - 9, 8, rgb(1, 1, 1));
    y -= 29;
  };

  const addContinuationPage = () => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - PAGE_MARGIN;
    page.drawText('Profit Contribution Overview', {
      color: darkRed,
      font: boldFont,
      size: 14,
      x: PAGE_MARGIN,
      y,
    });
    y -= 26;
    drawTableHeader();
  };

  page.drawText('Profit Contribution Overview', {
    color: darkRed,
    font: boldFont,
    size: 24,
    x: PAGE_MARGIN,
    y,
  });
  y -= 22;
  page.drawText(`Selected period: ${toPdfText(periodLabel)}`, {
    color: muted,
    font: regularFont,
    size: 11,
    x: PAGE_MARGIN,
    y,
  });
  y -= 38;

  const summaryItems = [
    ['CONTRIBUTORS', String(input.rows.length)],
    ['ENTRIES', String(totals.entryCount)],
    ['TOTAL SELL', formatCurrency(totals.sellAmount)],
    ['NET PROFIT', formatCurrency(totals.netProfit)],
  ];
  const summaryWidth = (PAGE_WIDTH - PAGE_MARGIN * 2 - 24) / 4;

  summaryItems.forEach(([label, value], index) => {
    const x = PAGE_MARGIN + index * (summaryWidth + 8);
    page.drawRectangle({
      borderColor: rgb(0.99, 0.75, 0.75),
      borderWidth: 1,
      color: rgb(1, 0.95, 0.94),
      height: 50,
      width: summaryWidth,
      x,
      y: y - 32,
    });
    page.drawText(label, { color: darkRed, font: boldFont, size: 7, x: x + 8, y: y + 5 });
    page.drawText(toPdfText(value), {
      color: rgb(0.07, 0.09, 0.13),
      font: boldFont,
      size: 10,
      x: x + 8,
      y: y - 14,
    });
  });
  y -= 72;
  drawTableHeader();

  input.rows.forEach(row => {
    if (y < 70) {
      addContinuationPage();
    }

    page.drawText(toPdfText(row.username), {
      color: rgb(0.07, 0.09, 0.13),
      font: boldFont,
      size: 10,
      x: 43,
      y,
    });
    page.drawText(toPdfText(row.email), {
      color: muted,
      font: regularFont,
      size: 7,
      x: 43,
      y: y - 11,
    });
    drawRightAlignedText(page, regularFont, String(row.entryCount), 325, y - 4, 9);
    drawRightAlignedText(page, regularFont, formatCurrency(row.purchaseAmount), 407, y - 4, 8);
    drawRightAlignedText(page, regularFont, formatCurrency(row.sellAmount), 487, y - 4, 8);
    drawRightAlignedText(page, boldFont, formatCurrency(row.netProfit), 552, y - 4, 8, darkRed);
    page.drawLine({
      color: rgb(0.9, 0.91, 0.93),
      end: { x: 552, y: y - 17 },
      start: { x: PAGE_MARGIN, y: y - 17 },
      thickness: 0.5,
    });
    y -= 31;
  });

  if (y < 65) {
    addContinuationPage();
  }
  page.drawRectangle({
    color: rgb(0.96, 0.96, 0.97),
    height: 25,
    width: PAGE_WIDTH - PAGE_MARGIN * 2,
    x: PAGE_MARGIN,
    y: y - 17,
  });
  page.drawText('ALL CONTRIBUTORS', {
    color: darkRed,
    font: boldFont,
    size: 8,
    x: 43,
    y: y - 8,
  });
  drawRightAlignedText(page, boldFont, String(totals.entryCount), 325, y - 8, 8, darkRed);
  drawRightAlignedText(page, boldFont, formatCurrency(totals.purchaseAmount), 407, y - 8, 8, darkRed);
  drawRightAlignedText(page, boldFont, formatCurrency(totals.sellAmount), 487, y - 8, 8, darkRed);
  drawRightAlignedText(page, boldFont, formatCurrency(totals.netProfit), 552, y - 8, 8, darkRed);

  return document.saveAsBase64({ dataUri: false });
}

export async function downloadProfitOverviewReport(
  input: ProfitOverviewReportInput,
) {
  const monthName = input.month
    ? new Date(2000, input.month - 1, 1).toLocaleString('en-IN', { month: 'long' })
    : '';
  const periodLabel =
    input.period === 'monthly' ? `${monthName} ${input.year}` : String(input.year);
  const fileBaseName =
    input.period === 'monthly'
      ? `profit-overview-${monthName.toLowerCase()}-${input.year}`
      : `profit-overview-${input.year}`;
  const base64Pdf = await createProfitOverviewPdf(input, periodLabel);

  if (Platform.OS === 'android') {
    let directoryUri = await AsyncStorage.getItem(PROFIT_REPORT_DIRECTORY_KEY);

    if (!directoryUri) {
      const documentsUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot(
        'Documents',
      );
      const permission =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
          documentsUri,
        );

      if (!permission.granted) {
        throw new Error('Documents folder permission is required to save the PDF.');
      }

      directoryUri = permission.directoryUri;
      await AsyncStorage.setItem(PROFIT_REPORT_DIRECTORY_KEY, directoryUri);
    }

    try {
      const documentUri = await FileSystem.StorageAccessFramework.createFileAsync(
        directoryUri,
        fileBaseName,
        'application/pdf',
      );
      await FileSystem.StorageAccessFramework.writeAsStringAsync(
        documentUri,
        base64Pdf,
        { encoding: FileSystem.EncodingType.Base64 },
      );
      return documentUri;
    } catch {
      await AsyncStorage.removeItem(PROFIT_REPORT_DIRECTORY_KEY);
      throw new Error(
        'Unable to save in Documents. Tap Download PDF again and select the Documents folder.',
      );
    }
  }

  if (Platform.OS === 'ios' && FileSystem.documentDirectory) {
    const documentUri = `${FileSystem.documentDirectory}${fileBaseName}.pdf`;
    await FileSystem.writeAsStringAsync(documentUri, base64Pdf, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return documentUri;
  }

  return `data:application/pdf;base64,${base64Pdf}`;
}

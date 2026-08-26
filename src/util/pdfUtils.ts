import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { GroupedHisab, GroupByMode } from '../types';

let canvas2dCtx: CanvasRenderingContext2D | null = null;

/**
 * Converts any CSS color string (including modern oklch, oklab, color-mix, var)
 * into a safe, standard rgb(r, g, b) or hex string using standard Canvas 2D context.
 */
const toStandardRgb = (colorStr: string, className = ''): string => {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)' || colorStr === 'rgba(0,0,0,0)') {
    if (className.includes('slate-50') || className.includes('bg-slate-50')) return '#f1f5f9';
    if (className.includes('emerald-50') || className.includes('bg-emerald-50')) return '#ecfdf5';
    if (className.includes('white') || className.includes('bg-white')) return '#ffffff';
    return 'transparent';
  }

  // If it already doesn't contain oklch/oklab/color-mix, return as is
  if (!/oklch|oklab|color-mix|color\(/i.test(colorStr)) {
    return colorStr;
  }

  try {
    if (!canvas2dCtx) {
      canvas2dCtx = document.createElement('canvas').getContext('2d');
    }
    if (canvas2dCtx) {
      canvas2dCtx.fillStyle = '#000000';
      canvas2dCtx.fillStyle = colorStr;
      const parsed = canvas2dCtx.fillStyle;
      if (parsed && parsed !== '#000000' && parsed !== '#000' && !/oklch|oklab|color-mix|color\(/i.test(parsed)) {
        return parsed;
      }
    }
  } catch (_) {}

  // Fallbacks based on className or colorStr
  const lower = colorStr.toLowerCase();
  const cls = className.toLowerCase();

  if (cls.includes('slate-500') || cls.includes('text-slate-500')) return '#64748b';
  if (cls.includes('slate-600') || cls.includes('text-slate-600')) return '#475569';
  if (cls.includes('slate-700') || cls.includes('text-slate-700')) return '#334155';
  if (cls.includes('slate-800') || cls.includes('text-slate-800')) return '#1e293b';
  if (cls.includes('slate-900') || cls.includes('text-slate-900')) return '#0f172a';
  if (cls.includes('emerald-700') || cls.includes('text-emerald-700')) return '#047857';
  if (cls.includes('red-600') || cls.includes('text-red-600')) return '#dc2626';
  if (cls.includes('slate-50') || cls.includes('bg-slate-50')) return '#f1f5f9';
  if (cls.includes('emerald-50') || cls.includes('bg-emerald-50')) return '#ecfdf5';

  if (lower.includes('white') || lower.includes('255, 255, 255')) return '#ffffff';
  if (lower.includes('red') || lower.includes('220')) return '#dc2626';
  if (lower.includes('green') || lower.includes('047857') || lower.includes('1b5e20')) return '#1b5e20';

  return '#1e293b';
};

/**
 * Copies computed CSS styles from visible DOM element to target element inside isolated iframe,
 * converting all color values to standard RGB/Hex so html2canvas never sees oklch strings.
 */
const copyComputedStyles = (source: HTMLElement, target: HTMLElement): void => {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll('*'))] as HTMLElement[];
  const targetNodes = [target, ...Array.from(target.querySelectorAll('*'))] as HTMLElement[];

  const trRowIndexMap = new Map<HTMLElement, number>();
  const tbodyMap = new Map<HTMLElement, number>();

  sourceNodes.forEach((node) => {
    if (node.tagName === 'TR') {
      const tbody = node.closest('tbody');
      if (tbody) {
        let count = tbodyMap.get(tbody) ?? 0;
        trRowIndexMap.set(node, count);
        tbodyMap.set(tbody, count + 1);
      }
    }
  });

  for (let i = 0; i < sourceNodes.length; i++) {
    const src = sourceNodes[i];
    const tgt = targetNodes[i];
    if (!src || !tgt) continue;

    const cs = window.getComputedStyle(src);
    const className = src.className && typeof src.className === 'string' ? src.className : '';

    let color = toStandardRgb(cs.color, className);
    let bg = toStandardRgb(cs.backgroundColor, className);
    const borderColor = toStandardRgb(cs.borderColor, className);

    let rowIndex: number | undefined = undefined;
    if (src.tagName === 'TR') {
      rowIndex = trRowIndexMap.get(src);
    } else if (src.tagName === 'TD' || src.tagName === 'TH') {
      const parentTr = src.closest('TR') as HTMLElement;
      if (parentTr) {
        rowIndex = trRowIndexMap.get(parentTr);
      }
    }

    if (color) tgt.style.color = color;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      tgt.style.backgroundColor = bg;
    } else if (src.tagName === 'TR' || src.tagName === 'TD') {
      tgt.style.backgroundColor = rowIndex !== undefined && rowIndex % 2 === 1 ? '#f1f5f9' : '#ffffff';
    }

    if (borderColor && borderColor !== 'transparent' && borderColor !== 'rgba(0, 0, 0, 0)') {
      tgt.style.borderColor = borderColor;
    } else if (src.tagName === 'TD' || src.tagName === 'TH') {
      tgt.style.borderColor = '#cbd5e1';
      tgt.style.borderWidth = '1px';
      tgt.style.borderStyle = 'solid';
    }

    if (cs.fontSize) tgt.style.fontSize = cs.fontSize;
    if (cs.fontWeight) tgt.style.fontWeight = cs.fontWeight;
    if (cs.fontFamily) tgt.style.fontFamily = cs.fontFamily;
    if (cs.textAlign) tgt.style.textAlign = cs.textAlign;
    if (cs.padding) tgt.style.padding = cs.padding;
    if (cs.margin) tgt.style.margin = cs.margin;
    if (cs.lineHeight) tgt.style.lineHeight = cs.lineHeight;

    if (tgt.tagName === 'TABLE') {
      tgt.style.width = '100%';
      tgt.style.borderCollapse = 'collapse';
      tgt.style.tableLayout = 'auto';
      tgt.style.border = '1px solid #cbd5e1';
    }
  }
};

/**
 * Helper to handle PDF download or Capacitor native sharing
 */
const saveOrSharePdf = async (pdf: jsPDF, filename: string): Promise<void> => {
  const finalFileName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = pdf.output('datauristring').split(',')[1];

      const fileResult = await Filesystem.writeFile({
        path: finalFileName,
        data: base64Data,
        directory: Directory.Cache
      });

      await Share.share({
        title: 'হিসাব খাতা রিপোর্ট',
        text: 'হিসাব খাতা থেকে সেভ করা PDF রিপোর্ট',
        url: fileResult.uri,
        dialogTitle: 'PDF ফাইল সেভ বা শেয়ার করুন'
      });
      return;
    } catch (nativeErr) {
      console.warn('Native export failed, falling back to browser save:', nativeErr);
    }
  }

  try {
    pdf.save(finalFileName);
  } catch (saveError) {
    console.warn('pdf.save failed, using blob fallback:', saveError);
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 2000);
  }
};

/**
 * Converts a DOM report element into a full-width, clean A4 PDF document.
 * Creates an isolated iframe with zero Tailwind oklch stylesheets so html2canvas
 * can render Bengali text, green headers (#1B5E20), white text, and table rows cleanly
 * without splitting rows or hiding text under whitespace.
 */
export const exportDomToPdf = async (
  element: HTMLElement,
  filename: string
): Promise<void> => {
  if (!element) {
    throw new Error('রেন্ডার করার জন্য কোনো উপাদান পাওয়া যায়নি');
  }

  // 1. Create a clean isolated iframe to isolate html2canvas from Tailwind v4 oklch rules
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '850px';
  iframe.style.height = 'auto';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    throw new Error('আইফ্রেম তৈরি করতে ব্যর্থ হয়েছে');
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 12px;
            background: #ffffff;
            font-family: 'Hind Siliguri', 'Plus Jakarta Sans', system-ui, sans-serif;
            width: 850px;
            color: #1e293b;
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { word-wrap: break-word; overflow-wrap: break-word; }
        </style>
      </head>
      <body></body>
    </html>
  `);
  iframeDoc.close();

  try {
    // Clone original report into iframe
    const clone = element.cloneNode(true) as HTMLElement;
    iframeDoc.body.appendChild(clone);

    // Apply inline computed RGB styles to clone
    copyComputedStyles(element, clone);

    // Ensure alternating zebra striping colors are explicitly set on every TR and TD for html2canvas
    const tables = clone.querySelectorAll('table');
    tables.forEach((table) => {
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((tr, rowIndex) => {
        const bgColor = rowIndex % 2 === 1 ? '#f1f5f9' : '#ffffff';
        (tr as HTMLElement).style.backgroundColor = bgColor;
        const tds = tr.querySelectorAll('td');
        tds.forEach((td) => {
          (td as HTMLElement).style.backgroundColor = bgColor;
          (td as HTMLElement).style.display = 'table-cell';
        });
      });
    });

    // Wait for fonts & layout to settle
    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      await iframeDoc.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Measure bounding boxes of table rows inside iframe
    const bodyRect = iframeDoc.body.getBoundingClientRect();
    const rows = Array.from(clone.querySelectorAll('tr')) as HTMLElement[];
    const rowBounds: { top: number; bottom: number }[] = [];

    rows.forEach((tr) => {
      const rect = tr.getBoundingClientRect();
      if (rect.height > 2) {
        rowBounds.push({
          top: rect.top - bodyRect.top,
          bottom: rect.bottom - bodyRect.top
        });
      }
    });

    // Render full clean document to canvas
    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 850,
      onclone: (clonedDoc) => {
        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach((s) => {
          if (/oklch|oklab/i.test(s.innerHTML)) s.remove();
        });
      }
    });

    // Clean up iframe
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('ক্যানভাস রেন্ডারিং ব্যর্থ হয়েছে');
    }

    // Convert DOM row bounds to Canvas pixel coordinates
    const scaleY = canvas.height / bodyRect.height;
    const canvasRowBounds = rowBounds.map((b) => ({
      top: b.top * scaleY,
      bottom: b.bottom * scaleY
    }));

    // Setup A4 jsPDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfPageWidth = 210;   // mm
    const pdfPageHeight = 297;  // mm
    const marginX = 2;          // mm (full width)
    const marginY = 4;          // mm (full height)
    const printWidth = pdfPageWidth - marginX * 2;   // 206 mm
    const printHeight = pdfPageHeight - marginY * 2; // 289 mm

    // Max height of one PDF page in canvas pixels
    const pxPageHeight = Math.floor((canvas.width * printHeight) / printWidth);

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;

    let currentY = 0;
    const slices: { currentY: number; targetY: number; sliceHeight: number }[] = [];

    while (currentY < canvas.height - 4) {
      const maxTargetY = currentY + pxPageHeight;
      let targetY = maxTargetY;

      if (targetY >= canvas.height) {
        targetY = canvas.height;
      } else {
        // Check if maxTargetY cuts inside any table row
        let bestCutY = maxTargetY;

        for (const bounds of canvasRowBounds) {
          if (bounds.top < maxTargetY - 4 && bounds.bottom > maxTargetY + 4) {
            const proposedCut = bounds.top - 4;
            if (proposedCut > currentY + 30 && proposedCut < bestCutY) {
              bestCutY = proposedCut;
            }
          }
        }

        if (bestCutY > currentY + 30 && bestCutY < maxTargetY) {
          targetY = bestCutY;
        }
      }

      if (targetY <= currentY) {
        targetY = currentY + pxPageHeight;
      }

      const sliceHeight = Math.max(1, targetY - currentY);
      slices.push({ currentY, targetY, sliceHeight });
      currentY = targetY;
    }

    const totalPages = slices.length;

    for (let i = 0; i < totalPages; i++) {
      const { currentY, sliceHeight } = slices[i];
      sliceCanvas.height = sliceHeight;

      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceHeight);
        ctx.drawImage(
          canvas,
          0,
          currentY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );
      }

      const sliceDataUrl = sliceCanvas.toDataURL('image/jpeg', 0.95);
      const slicePdfHeight = (sliceHeight * printWidth) / canvas.width;

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(sliceDataUrl, 'JPEG', marginX, marginY, printWidth, slicePdfHeight);

      // Add page number at the top right corner inside the page area (slightly higher and to the left)
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Page ${i + 1} of ${totalPages}`, pdfPageWidth - marginX - 6, marginY + 2, { align: 'right' });
    }

    // Save or Share PDF
    await saveOrSharePdf(pdf, filename);

  } catch (err) {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    console.error('PDF export error:', err);
    alert('সরাসরি PDF তৈরি করা সম্ভব হয়নি।');
  }
};

export const exportSingleGroupPdf = (
  group: GroupedHisab,
  mode: GroupByMode = GroupByMode.BY_USER_DETAILS
) => {
  const safeName = (
    mode === GroupByMode.BY_DATE_WORK
      ? `${group.date}_${group.hisabType || 'Work'}`
      : `${group.name || group.date || 'Group'}`
  ).replace(/[^a-zA-Z0-9]/g, '_');

  return `Hisab_Report_${safeName}.pdf`;
};

import type { PdfExtractionResult, PdfPageContent } from '@/src/types/study';

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

let workerConfigured = false;

async function getPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (!workerConfigured && typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
    workerConfigured = true;
  }
  return pdfjs;
}

export async function extractTextFromPdfFile(file: File): Promise<PdfExtractionResult> {
  const isPdfMime = file.type === 'application/pdf';
  const hasPdfExt = file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfMime && !hasPdfExt) {
    throw new Error('Please choose a valid .pdf file.');
  }
  if (file.size === 0) {
    throw new Error('The selected PDF file is empty.');
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error('This PDF exceeds the 20 MB browser extraction limit.');
  }

  const buffer = await file.arrayBuffer();
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  const pageCount = pdfDoc.numPages;
  const pages: PdfPageContent[] = [];
  let totalChars = 0;

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const rawText = textContent.items
      .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pages.push({
      pageNumber,
      text: rawText,
      charCount: rawText.length,
    });
    totalChars += rawText.length;
  }

  const nonEmptyPages = pages.filter((p) => p.charCount > 20).length;
  const isLikelyScanned = pageCount > 0 && (totalChars < 60 || nonEmptyPages === 0);
  const warnings: string[] = [];

  if (isLikelyScanned) {
    warnings.push(
      'Very little selectable text was found in this PDF. It appears to be scanned or image-based; StudyMate AI does not run OCR automatically, so consider pasting text notes directly.',
    );
  }
  if (pageCount > 40) {
    warnings.push(
      `This document has ${pageCount} pages. Select only the specific pages you need to keep inference fast and within context limits.`,
    );
  }

  const cleanedTitle = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();

  return {
    fileName: file.name,
    title: cleanedTitle || 'Study PDF',
    pageCount,
    totalChars,
    pages,
    isLikelyScanned,
    warnings,
  };
}

export function buildExcerptFromPages(
  pages: PdfPageContent[],
  selectedPageNumbers: number[],
  maxChars: number,
): { excerpt: string; includedPages: number[]; truncated: boolean } {
  const selectedSet = new Set(selectedPageNumbers);
  const targetPages = pages.filter((p) => selectedSet.has(p.pageNumber) && p.text.length > 0);

  const chunks: string[] = [];
  const includedPages: number[] = [];
  let lengthSoFar = 0;
  let truncated = false;

  for (const page of targetPages) {
    const section = `[Page ${page.pageNumber}]\n${page.text}`;
    if (lengthSoFar + section.length > maxChars) {
      const remaining = maxChars - lengthSoFar;
      if (remaining > 80) {
        chunks.push(section.slice(0, remaining));
        includedPages.push(page.pageNumber);
      }
      truncated = true;
      break;
    }
    chunks.push(section);
    includedPages.push(page.pageNumber);
    lengthSoFar += section.length + 2;
  }

  return {
    excerpt: chunks.join('\n\n').trim(),
    includedPages,
    truncated,
  };
}

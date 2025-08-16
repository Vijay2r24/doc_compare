import { diffWords, diffSentences } from 'diff';
import { DiffResult, ComparisonResult } from '../types';

export const compareDocuments = (leftText: string, rightText: string): ComparisonResult => {
  // Use sentence-based diff for better readability in formatted documents
  const diffs = diffSentences(leftText, rightText);
  
  const leftDiffs: DiffResult[] = [];
  const rightDiffs: DiffResult[] = [];
  let summary = { additions: 0, deletions: 0, changes: 0 };
  
  diffs.forEach(diff => {
    if (diff.added) {
      rightDiffs.push({ type: 'insert', content: diff.value });
      leftDiffs.push({ type: 'equal', content: '' });
      summary.additions++;
    } else if (diff.removed) {
      leftDiffs.push({ type: 'delete', content: diff.value });
      rightDiffs.push({ type: 'equal', content: '' });
      summary.deletions++;
    } else {
      leftDiffs.push({ type: 'equal', content: diff.value });
      rightDiffs.push({ type: 'equal', content: diff.value });
    }
  });
  
  summary.changes = summary.additions + summary.deletions;
  
  return { leftDiffs, rightDiffs, summary };
};

export const highlightDifferences = (diffs: DiffResult[]): string => {
  return diffs.map(diff => {
    switch (diff.type) {
      case 'insert':
        return `<span class="diff-insert">${escapeHtml(diff.content)}</span>`;
      case 'delete':
        return `<span class="diff-delete">${escapeHtml(diff.content)}</span>`;
      default:
        return escapeHtml(diff.content);
    }
  }).join('');
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Enhanced comparison for HTML content
export const compareHtmlDocuments = (leftHtml: string, rightHtml: string): ComparisonResult => {
  // Extract text content while preserving structure
  const leftText = extractTextWithStructure(leftHtml);
  const rightText = extractTextWithStructure(rightHtml);
  
  return compareDocuments(leftText, rightText);
};

const extractTextWithStructure = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Preserve paragraph breaks and structure
  const elements = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, div');
  const textParts: string[] = [];
  
  elements.forEach(element => {
    const text = element.textContent?.trim();
    if (text) {
      textParts.push(text);
    }
  });
  
  return textParts.join('\n\n');
};
import { diffWords, diffSentences, diffArrays } from 'diff';
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
  // Parse block-level HTML to preserve structure
  const leftBlocks = parseHtmlBlocks(leftHtml);
  const rightBlocks = parseHtmlBlocks(rightHtml);

  const diff = diffArrays(
    leftBlocks.map(b => b.text),
    rightBlocks.map(b => b.text)
  );

  const leftDiffs: DiffResult[] = [];
  const rightDiffs: DiffResult[] = [];
  let summary = { additions: 0, deletions: 0, changes: 0 };

  let leftIndex = 0;
  let rightIndex = 0;

  diff.forEach(part => {
    const values = part.value as string[];
    const length = values.length;

    if (part.added) {
      for (let i = 0; i < length; i++) {
        const block = rightBlocks[rightIndex++];
        rightDiffs.push({ type: 'insert', content: block.html });
        leftDiffs.push({ type: 'equal', content: '' });
        summary.additions++;
      }
    } else if (part.removed) {
      for (let i = 0; i < length; i++) {
        const block = leftBlocks[leftIndex++];
        leftDiffs.push({ type: 'delete', content: block.html });
        rightDiffs.push({ type: 'equal', content: '' });
        summary.deletions++;
      }
    } else {
      // equal blocks on both sides, preserve original HTML for each side
      for (let i = 0; i < length; i++) {
        const leftBlock = leftBlocks[leftIndex++];
        const rightBlock = rightBlocks[rightIndex++];
        leftDiffs.push({ type: 'equal', content: leftBlock.html });
        rightDiffs.push({ type: 'equal', content: rightBlock.html });
      }
    }
  });

  summary.changes = summary.additions + summary.deletions;

  return { leftDiffs, rightDiffs, summary };
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

// Parse HTML into block-level units with both text and original HTML
const parseHtmlBlocks = (html: string): { text: string; html: string }[] => {
  const container = document.createElement('div');
  container.innerHTML = html;

  // Target common Word-like block elements
  const elements = container.querySelectorAll(
    'p, h1, h2, h3, h4, h5, h6, li, td, th, table, blockquote, ul, ol, img'
  );

  const blocks: { text: string; html: string }[] = [];

  elements.forEach(el => {
    const tagName = el.tagName.toLowerCase();
    let text = (el.textContent || '').trim();

    if (!text) {
      if (tagName === 'img') {
        const src = (el as HTMLImageElement).src || el.getAttribute('src') || '';
        text = `IMG:${src}`;
      } else if (tagName === 'table') {
        text = 'TABLE';
      } else {
        text = tagName;
      }
    }

    blocks.push({ text, html: (el as HTMLElement).outerHTML });
  });

  // Fallback to entire HTML if no blocks found
  if (blocks.length === 0) {
    const fallbackText = container.textContent?.trim() || '';
    return [{ text: fallbackText, html }];
  }

  return blocks;
};

// Render diffs where content is already HTML; preserve formatting
export const renderHtmlDifferences = (diffs: DiffResult[]): string => {
  return diffs.map(diff => {
    switch (diff.type) {
      case 'insert':
        return `<div class="diff-insert">${diff.content}</div>`;
      case 'delete':
        return `<div class="diff-delete">${diff.content}</div>`;
      default:
        return diff.content;
    }
  }).join('');
};
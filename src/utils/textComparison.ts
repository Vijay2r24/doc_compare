import { diffWords, diffChars, Change } from 'diff';
import { DiffResult, ComparisonResult } from '../types';

export const compareDocuments = (leftText: string, rightText: string): ComparisonResult => {
  // Use word-based diff for better granularity like Git
  const diffs = diffWords(leftText, rightText, { 
    ignoreWhitespace: false,
    ignoreCase: false 
  });
  
  const leftDiffs: DiffResult[] = [];
  const rightDiffs: DiffResult[] = [];
  let summary = { additions: 0, deletions: 0, changes: 0 };
  
  diffs.forEach(diff => {
    if (diff.added) {
      rightDiffs.push({ type: 'insert', content: diff.value });
      summary.additions++;
    } else if (diff.removed) {
      leftDiffs.push({ type: 'delete', content: diff.value });
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

// Enhanced Git-like comparison for HTML content with precise change detection
export const compareHtmlDocuments = (leftHtml: string, rightHtml: string): ComparisonResult => {
  // Parse HTML into structured elements while preserving exact formatting
  const leftElements = parseHtmlElements(leftHtml);
  const rightElements = parseHtmlElements(rightHtml);

  const leftDiffs: DiffResult[] = [];
  const rightDiffs: DiffResult[] = [];
  let summary = { additions: 0, deletions: 0, changes: 0 };

  // Compare elements by their position and type
  const maxLength = Math.max(leftElements.length, rightElements.length);
  
  for (let i = 0; i < maxLength; i++) {
    const leftEl = leftElements[i];
    const rightEl = rightElements[i];

    if (!leftEl && rightEl) {
      // Element added in right document
      rightDiffs.push({ type: 'insert', content: rightEl.html });
      leftDiffs.push({ type: 'equal', content: '' });
      summary.additions++;
    } else if (leftEl && !rightEl) {
      // Element removed from left document
      leftDiffs.push({ type: 'delete', content: leftEl.html });
      rightDiffs.push({ type: 'equal', content: '' });
      summary.deletions++;
    } else if (leftEl && rightEl) {
      // Both elements exist, compare their content
      if (leftEl.tag === rightEl.tag) {
        // Same element type, compare text content with precise diff
        const textComparison = compareElementText(leftEl, rightEl);
        leftDiffs.push(...textComparison.left);
        rightDiffs.push(...textComparison.right);
        summary.additions += textComparison.summary.additions;
        summary.deletions += textComparison.summary.deletions;
      } else {
        // Different element types, treat as replacement
        leftDiffs.push({ type: 'delete', content: leftEl.html });
        rightDiffs.push({ type: 'insert', content: rightEl.html });
        summary.deletions++;
        summary.additions++;
      }
    }
  }

  summary.changes = summary.additions + summary.deletions;
  return { leftDiffs, rightDiffs, summary };
};

interface ParsedElement {
  tag: string;
  html: string;
  text: string;
  attributes: Record<string, string>;
  children: ParsedElement[];
}

const parseHtmlElements = (html: string): ParsedElement[] => {
  const container = document.createElement('div');
  container.innerHTML = html;
  
  const elements: ParsedElement[] = [];
  
  // Process all child nodes, including text nodes
  const processNode = (node: Node): ParsedElement | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        return {
          tag: 'text',
          html: escapeHtml(text),
          text: text,
          attributes: {},
          children: []
        };
      }
      return null;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tag = element.tagName.toLowerCase();
      const text = element.textContent || '';
      const attributes: Record<string, string> = {};
      
      // Capture attributes
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        attributes[attr.name] = attr.value;
      }
      
      const children: ParsedElement[] = [];
      for (let i = 0; i < element.childNodes.length; i++) {
        const child = processNode(element.childNodes[i]);
        if (child) children.push(child);
      }
      
      return {
        tag,
        html: element.outerHTML,
        text,
        attributes,
        children
      };
    }
    return null;
  };
  
  for (let i = 0; i < container.childNodes.length; i++) {
    const element = processNode(container.childNodes[i]);
    if (element) elements.push(element);
  }
  
  return elements;
};

const compareElementText = (leftEl: ParsedElement, rightEl: ParsedElement): {
  left: DiffResult[];
  right: DiffResult[];
  summary: { additions: number; deletions: number };
} => {
  // For text content comparison, use character-level diff for precision
  const diffs = diffChars(leftEl.text, rightEl.text, {
    ignoreWhitespace: false
  });
  
  const leftDiffs: DiffResult[] = [];
  const rightDiffs: DiffResult[] = [];
  let summary = { additions: 0, deletions: 0 };
  
  let leftHtml = '';
  let rightHtml = '';
  
  diffs.forEach(diff => {
    if (diff.added) {
      rightHtml += `<span class="diff-insert">${escapeHtml(diff.value)}</span>`;
      summary.additions++;
    } else if (diff.removed) {
      leftHtml += `<span class="diff-delete">${escapeHtml(diff.value)}</span>`;
      summary.deletions++;
    } else {
      const escaped = escapeHtml(diff.value);
      leftHtml += escaped;
      rightHtml += escaped;
    }
  });
  
  // Reconstruct the HTML with the same structure but highlighted differences
  const leftReconstructed = reconstructElementHtml(leftEl, leftHtml);
  const rightReconstructed = reconstructElementHtml(rightEl, rightHtml);
  
  leftDiffs.push({ 
    type: summary.deletions > 0 ? 'delete' : 'equal', 
    content: leftReconstructed 
  });
  rightDiffs.push({ 
    type: summary.additions > 0 ? 'insert' : 'equal', 
    content: rightReconstructed 
  });
  
  return { left: leftDiffs, right: rightDiffs, summary };
};

const reconstructElementHtml = (element: ParsedElement, newTextContent: string): string => {
  if (element.tag === 'text') {
    return newTextContent;
  }
  
  // Reconstruct the element with new text content but same structure
  const attrs = Object.entries(element.attributes)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(' ');
  
  const attrString = attrs ? ` ${attrs}` : '';
  
  // Self-closing tags
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'];
  if (selfClosing.includes(element.tag)) {
    return `<${element.tag}${attrString} />`;
  }
  
  return `<${element.tag}${attrString}>${newTextContent}</${element.tag}>`;
};

// Render diffs with precise highlighting
export const renderHtmlDifferences = (diffs: DiffResult[]): string => {
  return diffs.map(diff => {
    if (diff.type === 'equal' && !diff.content.trim()) {
      return ''; // Skip empty equal diffs
    }
    return diff.content;
  }).join('');
};

// Enhanced whitespace and structure comparison
export const compareWithWhitespace = (leftText: string, rightText: string): ComparisonResult => {
  // Split into lines to compare structure
  const leftLines = leftText.split('\n');
  const rightLines = rightText.split('\n');
  
  const leftDiffs: DiffResult[] = [];
  const rightDiffs: DiffResult[] = [];
  let summary = { additions: 0, deletions: 0, changes: 0 };
  
  const maxLines = Math.max(leftLines.length, rightLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const leftLine = leftLines[i];
    const rightLine = rightLines[i];
    
    if (leftLine === undefined) {
      // Line added in right
      rightDiffs.push({ type: 'insert', content: rightLine + '\n' });
      leftDiffs.push({ type: 'equal', content: '' });
      summary.additions++;
    } else if (rightLine === undefined) {
      // Line removed from left
      leftDiffs.push({ type: 'delete', content: leftLine + '\n' });
      rightDiffs.push({ type: 'equal', content: '' });
      summary.deletions++;
    } else if (leftLine !== rightLine) {
      // Lines differ, do character-level comparison
      const lineDiffs = diffChars(leftLine, rightLine, { ignoreWhitespace: false });
      
      let leftLineHtml = '';
      let rightLineHtml = '';
      let hasChanges = false;
      
      lineDiffs.forEach(diff => {
        if (diff.added) {
          rightLineHtml += `<span class="diff-insert">${escapeHtml(diff.value)}</span>`;
          hasChanges = true;
        } else if (diff.removed) {
          leftLineHtml += `<span class="diff-delete">${escapeHtml(diff.value)}</span>`;
          hasChanges = true;
        } else {
          const escaped = escapeHtml(diff.value);
          leftLineHtml += escaped;
          rightLineHtml += escaped;
        }
      });
      
      if (hasChanges) {
        leftDiffs.push({ type: 'delete', content: leftLineHtml + '\n' });
        rightDiffs.push({ type: 'insert', content: rightLineHtml + '\n' });
        summary.changes++;
      } else {
        leftDiffs.push({ type: 'equal', content: leftLine + '\n' });
        rightDiffs.push({ type: 'equal', content: rightLine + '\n' });
      }
    } else {
      // Lines are identical
      leftDiffs.push({ type: 'equal', content: leftLine + '\n' });
      rightDiffs.push({ type: 'equal', content: rightLine + '\n' });
    }
  }
  
  summary.changes = summary.additions + summary.deletions;
  return { leftDiffs, rightDiffs, summary };
};
import mammoth from 'mammoth';

export const parseWordDocument = async (file: File): Promise<{ content: string; htmlContent: string }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Configure mammoth to preserve more formatting
    const options = {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => h2.subtitle:fresh",
        "p[style-name='Quote'] => blockquote:fresh",
        "p[style-name='Intense Quote'] => blockquote.intense:fresh",
        "p[style-name='List Paragraph'] => p.list-paragraph:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
        "r[style-name='Subtle Emphasis'] => em.subtle",
        "r[style-name='Intense Emphasis'] => strong.intense",
        "table => table.word-table",
        "tr => tr",
        "td => td",
        "th => th"
      ],
      includeDefaultStyleMap: true,
      convertImage: mammoth.images.imgElement(function(image) {
        return image.read("base64").then(function(imageBuffer) {
          return {
            src: "data:" + image.contentType + ";base64," + imageBuffer
          };
        });
      }),
      ignoreEmptyParagraphs: false,
      preserveEmptyParagraphs: true
    };
    
    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    
    // Extract plain text for comparison while preserving structure
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = result.value;
    
    // Better plain text extraction that preserves paragraph breaks
    const textNodes: string[] = [];
    const walker = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text) {
        textNodes.push(text);
      }
    }
    
    // Also preserve paragraph structure for better comparison
    const paragraphs = Array.from(tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th'));
    const structuredText = paragraphs.map(p => p.textContent?.trim()).filter(Boolean).join('\n\n');
    
    const plainText = structuredText || textNodes.join(' ') || tempDiv.textContent || tempDiv.innerText || '';
    
    // Enhanced HTML with better styling
    const enhancedHtml = enhanceWordHtml(result.value);
    
    return {
      content: plainText,
      htmlContent: enhancedHtml
    };
  } catch (error) {
    console.error('Error parsing document:', error);
    throw new Error('Failed to parse document. Please ensure it\'s a valid Word document.');
  }
};

const enhanceWordHtml = (html: string): string => {
  // Add Word-like styling to the HTML
  const styledHtml = `
    <div class="word-document">
      ${html}
    </div>
  `;
  
  return styledHtml;
};

export const validateFile = (file: File): boolean => {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];
  
  const validExtensions = ['.docx', '.doc'];
  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  
  return hasValidType || hasValidExtension;
};
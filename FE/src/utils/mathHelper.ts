/**
 * Utility to format LaTeX math syntax (e.g. $O(M \times N)$, \(O(N)\), $$...$$) into clean, human-readable math typography.
 */
export function formatLatexMath(text?: string | null): string {
  if (!text) return '';

  let processed = text;

  // 1. Convert display math $$...$$ or \[...\]
  processed = processed.replace(/\$\$(.*?)\$\$/gs, (_m, g1) => {
    return '\n' + cleanMathExpr(g1) + '\n';
  });
  processed = processed.replace(/\\\[(.*?)\\\]/gs, (_m, g1) => {
    return '\n' + cleanMathExpr(g1) + '\n';
  });

  // 2. Convert inline math $...$ or \(...\)
  processed = processed.replace(/\$(.*?)\$/g, (_m, g1) => {
    return cleanMathExpr(g1);
  });
  processed = processed.replace(/\\\((.*?)\\\)/g, (_m, g1) => {
    return cleanMathExpr(g1);
  });

  return processed;
}

function cleanMathExpr(expr: string): string {
  let cleaned = expr.trim();
  cleaned = cleaned
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\star/g, '★')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\ne/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\infty/g, '∞')
    .replace(/\\log/g, 'log')
    .replace(/\\ln/g, 'ln')
    .replace(/\\sqrt/g, '√')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\^n/g, 'ⁿ')
    .replace(/\^k/g, 'ᵏ');

  return `**${cleaned}**`;
}

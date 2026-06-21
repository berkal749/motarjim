import type { Diagnostic, DiagnosticBag as BagInterface, DiagnosticPhase, DiagnosticSeverity, SourceSpan, Result } from './index.js';

let diagnosticCodeCounter = 0;
function nextCode(): string {
  return `D${String(++diagnosticCodeCounter).padStart(4, '0')}`;
}

export function createDiagnostic(
  severity: DiagnosticSeverity,
  code: string,
  message: string,
  phase: DiagnosticPhase,
  sourceSpan?: SourceSpan,
): Diagnostic {
  return { code, message, severity, phase, sourceSpan };
}

export function createError(
  code: string,
  message: string,
  phase: DiagnosticPhase,
  sourceSpan?: SourceSpan,
): Diagnostic {
  return createDiagnostic('error', code, message, phase, sourceSpan);
}

export function createWarning(
  code: string,
  message: string,
  phase: DiagnosticPhase,
  sourceSpan?: SourceSpan,
): Diagnostic {
  return createDiagnostic('warning', code, message, phase, sourceSpan);
}

export function createInfo(
  code: string,
  message: string,
  phase: DiagnosticPhase,
  sourceSpan?: SourceSpan,
): Diagnostic {
  return createDiagnostic('info', code, message, phase, sourceSpan);
}

export function ok<T>(value: T, diagnostics: Diagnostic[] = []): Result<T> {
  return { ok: true, value, diagnostics };
}

export function fail<T>(diagnostics: Diagnostic[]): Result<T> {
  return { ok: false, diagnostics };
}

export function mergeDiagnostics(...results: Result<unknown>[]): Diagnostic[] {
  const all: Diagnostic[] = [];
  for (const r of results) {
    all.push(...r.diagnostics);
  }
  return all;
}

export function isError(d: Diagnostic): boolean {
  return d.severity === 'error';
}

export function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some(isError);
}

export function formatDiagnostic(d: Diagnostic): string {
  const loc = d.sourceSpan
    ? `${d.sourceSpan.file}:${d.sourceSpan.start.line}:${d.sourceSpan.start.column}`
    : '';
  const tag = d.severity === 'error' ? 'ERR' : d.severity === 'warning' ? 'WRN' : 'INF';
  return `[${tag} ${d.code}] ${d.phase}: ${d.message}${loc ? ` (${loc})` : ''}`;
}

export function formatDiagnostics(diagnostics: Diagnostic[]): string {
  return diagnostics.map(formatDiagnostic).join('\n');
}

export class DiagnosticBag implements BagInterface {
  diagnostics: Diagnostic[] = [];

  add(diagnostic: Diagnostic): void {
    this.diagnostics.push(diagnostic);
  }

  addError(code: string, message: string, phase: DiagnosticPhase, sourceSpan?: SourceSpan): void {
    this.diagnostics.push(createDiagnostic('error', code, message, phase, sourceSpan));
  }

  addWarning(code: string, message: string, phase: DiagnosticPhase, sourceSpan?: SourceSpan): void {
    this.diagnostics.push(createDiagnostic('warning', code, message, phase, sourceSpan));
  }

  addInfo(code: string, message: string, phase: DiagnosticPhase, sourceSpan?: SourceSpan): void {
    this.diagnostics.push(createDiagnostic('info', code, message, phase, sourceSpan));
  }

  hasErrors(): boolean {
    return this.diagnostics.some(isError);
  }

  toResult<T>(value: T): Result<T> {
    if (this.hasErrors()) {
      return { ok: false, diagnostics: this.diagnostics };
    }
    return { ok: true, value, diagnostics: this.diagnostics };
  }

  asResult(): Result<never> {
    return { ok: false, diagnostics: this.diagnostics };
  }
}

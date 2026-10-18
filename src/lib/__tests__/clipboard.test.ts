import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { copyText, fallbackCopy } from '../clipboard';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value,
  });
}

afterEach(() => {
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard);
  } else {
    // @ts-expect-error limpieza del mock en tests
    delete navigator.clipboard;
  }
  vi.restoreAllMocks();
});

describe('copyText', () => {
  it('usa navigator.clipboard cuando está disponible y copia exactamente el Markdown esperado', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const markdown = '# SAA-C03\n\n- [ ] Set oficial de 20 preguntas';
    await expect(copyText(markdown)).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(markdown);
  });

  it('cae al fallback con textarea + execCommand si el portapapeles rechaza', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('permiso denegado')) });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });

    await expect(copyText('texto')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('funciona sin navigator.clipboard (navegador antiguo)', async () => {
    setClipboard(undefined);
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    await expect(copyText('texto')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalled();
  });

  it('devuelve false si no hay forma de copiar', async () => {
    setClipboard(undefined);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: undefined });
    await expect(copyText('texto')).resolves.toBe(false);
  });
});

describe('fallbackCopy', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn().mockReturnValue(true) });
  });

  it('crea y elimina el textarea temporal (sin dejar basura en el DOM)', () => {
    const before = document.body.childElementCount;
    expect(fallbackCopy('abc')).toBe(true);
    expect(document.body.childElementCount).toBe(before);
  });
});

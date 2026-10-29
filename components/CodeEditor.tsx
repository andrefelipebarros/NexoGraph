'use client';

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, Ref } from 'react';
import { matchAtCaret, type Highlighted } from '@/lib/mermaid-highlight';
import { renderToken } from './code-tokens';

export type CodeEditorHandle = {
  focus: () => void;
  insert: (text: string, options?: { newLine?: boolean }) => void;
  goToLine: (line: number) => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  highlighted: Highlighted;
  errorLines?: number[];
  ariaLabel: string;
  placeholder?: string;
  onCursor?: (line: number, col: number) => void;
  ref?: Ref<CodeEditorHandle>;
};

const LINE_HEIGHT = 20;
const PAIRS: Record<string, string> = { '[': ']', '(': ')', '{': '}', '"': '"' };
const CLOSERS = new Set([']', ')', '}', '"']);

function exec(textarea: HTMLTextAreaElement, text: string) {
  textarea.focus();
  const done = document.execCommand('insertText', false, text);
  if (!done) {
    textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function lineBounds(value: string, start: number, end: number) {
  const blockStart = value.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = value.indexOf('\n', end);
  const blockEnd = nextBreak === -1 ? value.length : nextBreak;
  return { blockStart, blockEnd };
}

export function CodeEditor({ value, onChange, highlighted, errorLines = [], ariaLabel, placeholder, onCursor, ref }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState({ start: 0, end: 0 });

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (contentRef.current) contentRef.current.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
    if (gutterRef.current) gutterRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
  }, []);

  const syncCaret = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    setCaret((current) => (current.start === ta.selectionStart && current.end === ta.selectionEnd ? current : { start: ta.selectionStart, end: ta.selectionEnd }));
  }, []);

  useLayoutEffect(() => { syncScroll(); }, [value, syncScroll]);

  const activeLine = useMemo(() => value.slice(0, caret.start).split('\n').length, [value, caret.start]);
  const col = useMemo(() => caret.start - (value.lastIndexOf('\n', caret.start - 1) + 1) + 1, [value, caret.start]);
  useEffect(() => { onCursor?.(activeLine, col); }, [activeLine, col, onCursor]);

  const matched = useMemo(() => {
    if (caret.start !== caret.end) return new Set<number>();
    const pair = matchAtCaret(highlighted.bracketAt, caret.start);
    return new Set(pair ?? []);
  }, [highlighted, caret]);

  const errorSet = useMemo(() => new Set(errorLines), [errorLines]);
  const digits = Math.max(2, String(highlighted.lines.length).length);

  const setSelection = (start: number, end = start) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.setSelectionRange(start, end);
    syncCaret();
  };

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    goToLine: (line: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const lines = ta.value.split('\n');
      const target = Math.min(Math.max(1, line), lines.length);
      const offset = lines.slice(0, target - 1).reduce((sum, item) => sum + item.length + 1, 0);
      ta.focus();
      ta.setSelectionRange(offset, offset + lines[target - 1].length);
      ta.scrollTop = Math.max(0, (target - 1) * LINE_HEIGHT - ta.clientHeight / 3);
      syncScroll();
      syncCaret();
    },
    insert: (text: string, options?: { newLine?: boolean }) => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      if (options?.newLine) {
        const { blockStart, blockEnd } = lineBounds(ta.value, ta.selectionStart, ta.selectionEnd);
        const indent = /^[ \t]*/.exec(ta.value.slice(blockStart, blockEnd))?.[0] ?? '';
        ta.setSelectionRange(blockEnd, blockEnd);
        exec(ta, `\n${text.split('\n').map((part) => indent + part).join('\n')}`);
      } else {
        exec(ta, text);
      }
      syncCaret();
    },
  }), [syncCaret, syncScroll]);

  const replaceBlock = (ta: HTMLTextAreaElement, blockStart: number, blockEnd: number, next: string) => {
    ta.setSelectionRange(blockStart, blockEnd);
    exec(ta, next);
    ta.setSelectionRange(blockStart, blockStart + next.length);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    const ta = event.currentTarget;
    const { selectionStart: s, selectionEnd: t, value: v } = ta;

    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
      event.preventDefault();
      const { blockStart, blockEnd } = lineBounds(v, s, t);
      const lines = v.slice(blockStart, blockEnd).split('\n');
      const allCommented = lines.filter((line) => line.trim()).every((line) => /^\s*%%/.test(line));
      const next = lines.map((line) => {
        if (!line.trim()) return line;
        return allCommented ? line.replace(/^(\s*)%% ?/, '$1') : line.replace(/^(\s*)/, '$1%% ');
      }).join('\n');
      replaceBlock(ta, blockStart, blockEnd, next);
      syncCaret();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Tab') {
      event.preventDefault();
      if (s === t && !event.shiftKey) { exec(ta, '  '); return; }
      const { blockStart, blockEnd } = lineBounds(v, s, t);
      const lines = v.slice(blockStart, blockEnd).split('\n');
      const next = lines.map((line) => (event.shiftKey ? line.replace(/^ {1,2}/, '') : `  ${line}`)).join('\n');
      replaceBlock(ta, blockStart, blockEnd, next);
      syncCaret();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const { blockStart } = lineBounds(v, s, s);
      const indent = /^[ \t]*/.exec(v.slice(blockStart))?.[0] ?? '';
      const before = v[s - 1];
      const after = v[t];
      if (before === '{' && after === '}') {
        exec(ta, `\n${indent}  \n${indent}`);
        setSelection(s + 1 + indent.length + 2);
      } else {
        exec(ta, `\n${indent}${before === '{' ? '  ' : ''}`);
      }
      return;
    }

    if (CLOSERS.has(event.key) && s === t && v[s] === event.key && event.key !== '"') {
      event.preventDefault();
      setSelection(s + 1);
      return;
    }
    if (event.key === '"' && s === t && v[s] === '"') {
      event.preventDefault();
      setSelection(s + 1);
      return;
    }

    if (PAIRS[event.key]) {
      const close = PAIRS[event.key];
      if (s !== t) {
        event.preventDefault();
        exec(ta, `${event.key}${v.slice(s, t)}${close}`);
        setSelection(s + 1, t + 1);
        return;
      }
      const next = v[s];
      const prev = v[s - 1];
      const nextIsFree = next === undefined || /[\s)\]}",;:.]/.test(next);
      const quoteAfterWord = event.key === '"' && prev !== undefined && /[\p{L}\p{N}_]/u.test(prev);
      if (nextIsFree && !quoteAfterWord) {
        event.preventDefault();
        exec(ta, `${event.key}${close}`);
        setSelection(s + 1);
      }
      return;
    }

    if (event.key === 'Backspace' && s === t && s > 0 && PAIRS[v[s - 1]] === v[s]) {
      event.preventDefault();
      ta.setSelectionRange(s - 1, s + 1);
      document.execCommand('delete');
      syncCaret();
    }
  };

  return (
    <div className="ce">
      <div className="ce-gutter" aria-hidden="true" style={{ width: `${digits + 3}ch` }}>
        <div className="ce-gutter-inner" ref={gutterRef}>
          {highlighted.lines.map((line) => (
            <div key={line.number} className={`ce-num${line.number === activeLine ? ' is-active' : ''}${errorSet.has(line.number) ? ' has-error' : ''}`}>{line.number}</div>
          ))}
        </div>
      </div>
      <div className="ce-body">
        <div className="ce-layer" aria-hidden="true">
          <div className="ce-content" ref={contentRef}>
            <div className="ce-active-line" style={{ top: (activeLine - 1) * LINE_HEIGHT }} />
            {highlighted.lines.map((line) => (
              <div key={line.number} className={`ce-line${errorSet.has(line.number) ? ' has-error' : ''}`}>
                {line.tokens.map((token, index) => renderToken(token, index, matched))}
              </div>
            ))}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          className="ce-input"
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap="off"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onScroll={syncScroll}
          onSelect={syncCaret}
          onKeyUp={syncCaret}
          onMouseUp={syncCaret}
          onFocus={syncCaret}
        />
      </div>
    </div>
  );
}

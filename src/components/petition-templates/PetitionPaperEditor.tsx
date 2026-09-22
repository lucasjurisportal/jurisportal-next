"use client";

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import {
  decodeRichDocument, encodeRichDocument, richToPlain,
  type RichAlign, type RichBlock, type RichDocument, type RichRun,
} from "@/modules/petition-templates/domain/rich-document";
import styles from "./PetitionTemplates.module.css";

export type PetitionPaperHandle = { insertText: (text: string) => void; focus: () => void };

type Marks = { bold?: boolean; italic?: boolean; underline?: boolean };
function addRuns(node: Node, marks: Marks, runs: RichRun[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent) runs.push({ text: node.textContent, ...marks });
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  if (node.tagName === "BR") { runs.push({ text: "\n", ...marks }); return; }
  const style = node.style;
  const bold = marks.bold || node.matches("b,strong") || style.fontWeight === "bold" || Number(style.fontWeight) >= 600;
  const italic = marks.italic || node.matches("i,em") || style.fontStyle === "italic";
  const underline = marks.underline || node.tagName === "U" || style.textDecoration.includes("underline");
  for (const child of node.childNodes) addRuns(child, { ...(bold ? { bold: true } : {}), ...(italic ? { italic: true } : {}), ...(underline ? { underline: true } : {}) }, runs);
}
function alignment(element: HTMLElement): RichAlign {
  const value = element.style.textAlign;
  return value === "center" || value === "right" || value === "justify" ? value : "left";
}
function serialize(root: HTMLElement): RichDocument {
  const blocks: RichBlock[] = [];
  let trailing: Node[] = [];
  const flush = () => {
    if (!trailing.length) return;
    const runs: RichRun[] = [];
    for (const node of trailing) addRuns(node, {}, runs);
    blocks.push({ type: "paragraph", align: "left", runs }); trailing = [];
  };
  for (const child of root.childNodes) {
    if (child instanceof HTMLElement && (child.matches("p,div,h1,h2,h3") || child.getAttribute("role") === "paragraph")) {
      flush();
      const runs: RichRun[] = [];
      for (const nested of child.childNodes) addRuns(nested, {}, runs);
      blocks.push({ type: child.matches("h1,h2,h3") ? "heading" : "paragraph", align: alignment(child), runs });
    } else if (child instanceof HTMLElement && child.tagName === "BR") {
      flush(); blocks.push({ type: "paragraph", align: "left", runs: [] });
    } else trailing.push(child);
  }
  flush();
  return { version: 1, blocks: blocks.length ? blocks : [{ type: "paragraph", align: "left", runs: [] }] };
}
function renderDocument(root: HTMLElement, content: string) {
  root.replaceChildren();
  const rich = decodeRichDocument(content);
  for (const block of rich.blocks) {
    const element = document.createElement(block.type === "heading" ? "h2" : "p");
    element.style.textAlign = block.align;
    if (!block.runs.length) element.appendChild(document.createElement("br"));
    for (const run of block.runs) {
      let node: Node = document.createTextNode(run.text);
      for (const [enabled, tag] of [[run.underline, "u"], [run.italic, "em"], [run.bold, "strong"]] as const) {
        if (enabled) { const wrapper = document.createElement(tag); wrapper.appendChild(node); node = wrapper; }
      }
      element.appendChild(node);
    }
    root.appendChild(element);
  }
}

export const PetitionPaperEditor = forwardRef<PetitionPaperHandle, {
  content: string;
  resetKey: string | number;
  onChange: (serialized: string, plain: string) => void;
  label?: string;
}>((props, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!editorRef.current) return;
    selectionRef.current = null;
    try { renderDocument(editorRef.current, props.content); setNotice(""); }
    catch { setNotice("O documento não pôde ser apresentado. Não faça alterações antes de recuperar o rascunho original."); }
  // A folha não é recriada enquanto o usuário digita, para preservar o cursor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.resetKey]);
  useEffect(() => {
    const capture = () => {
      const selection = document.getSelection();
      const editor = editorRef.current;
      if (!selection?.rangeCount || !editor || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", capture);
    return () => document.removeEventListener("selectionchange", capture);
  }, []);
  function changed() {
    if (!editorRef.current) return;
    const doc = serialize(editorRef.current);
    props.onChange(encodeRichDocument(doc), richToPlain(doc));
  }
  function command(action: string, arg?: string) {
    editorRef.current?.focus();
    const saved = selectionRef.current;
    if (saved && editorRef.current?.contains(saved.startContainer)) {
      const selection = document.getSelection();
      selection?.removeAllRanges(); selection?.addRange(saved);
    }
    document.execCommand(action, false, arg);
    changed();
  }
  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    insertText: (value) => command("insertText", value),
  }));
  return <div className={styles.paperWorkspace}>
    <div className={styles.paperTools} aria-label="Ferramentas de formatação">
      <span className={styles.paperToolsLabel}>Formatar:</span>
      <button type="button" title="Negrito" onMouseDown={(e) => e.preventDefault()} onClick={() => command("bold")}><strong>N</strong></button>
      <button type="button" title="Itálico" onMouseDown={(e) => e.preventDefault()} onClick={() => command("italic")}><em>I</em></button>
      <button type="button" title="Sublinhado" onMouseDown={(e) => e.preventDefault()} onClick={() => command("underline")}><u>S</u></button>
      <span className={styles.paperToolDivider} />
      <button type="button" title="Parágrafo" onMouseDown={(e) => e.preventDefault()} onClick={() => command("formatBlock", "p")}>Texto</button>
      <button type="button" title="Título" onMouseDown={(e) => e.preventDefault()} onClick={() => command("formatBlock", "h2")}>Título</button>
      <span className={styles.paperToolDivider} />
      <button type="button" title="Alinhar à esquerda" onMouseDown={(e) => e.preventDefault()} onClick={() => command("justifyLeft")}>Esq.</button>
      <button type="button" title="Centralizar" onMouseDown={(e) => e.preventDefault()} onClick={() => command("justifyCenter")}>Centro</button>
      <button type="button" title="Alinhar à direita" onMouseDown={(e) => e.preventDefault()} onClick={() => command("justifyRight")}>Dir.</button>
      <button type="button" title="Justificar" onMouseDown={(e) => e.preventDefault()} onClick={() => command("justifyFull")}>Justificar</button>
      <span className={styles.paperToolDivider} />
      <button type="button" title="Desfazer" onMouseDown={(e) => e.preventDefault()} onClick={() => command("undo")}>↶</button>
      <button type="button" title="Refazer" onMouseDown={(e) => e.preventDefault()} onClick={() => command("redo")}>↷</button>
    </div>
    <div className={styles.paperStage}>
      <div ref={editorRef} className={styles.paperSheet} contentEditable suppressContentEditableWarning
        role="textbox" aria-label={props.label ?? "Editar documento jurídico"} aria-multiline="true" spellCheck
        onInput={changed} onBlur={changed}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          changed();
        }} />
    </div>
    {notice ? <p role="alert" className={styles.error}>{notice}</p> : null}
    <small className={styles.paperFootnote}>Folha A4 para edição. Use «Visualizar PDF» para conferir a paginação exata antes de enviar ou protocolar. Colagens são importadas como texto para segurança.</small>
  </div>;
});
PetitionPaperEditor.displayName = "PetitionPaperEditor";

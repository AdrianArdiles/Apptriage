"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { buscarDiagnosticos, encontrarPorLabel, type DiagnosticoTriage } from "@/constants/diagnostics";
import { cn } from "@/lib/utils";

/** Valor del combobox: codificado (de la lista) o texto libre. */
export type DiagnosticoTriageValue =
  | { tipo: "codificado"; label: string; code: string; category: number }
  | { tipo: "libre"; texto: string }
  | null;

const INPUT_DARK =
  "min-h-[44px] rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]";
const DROPDOWN_BG = "border-slate-600 bg-slate-800/95 shadow-xl";

export interface DiagnosticoComboboxTriageProps {
  value: DiagnosticoTriageValue;
  onChange: (v: DiagnosticoTriageValue) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Si true, resalta el campo cuando está vacío (obligatorio antes de Finalizar). */
  required?: boolean;
}

export function DiagnosticoComboboxTriage({
  value,
  onChange,
  placeholder = "Buscar diagnóstico (Infarto, ACV, Disnea…) o escribir libre",
  className,
  disabled = false,
  required = false,
}: DiagnosticoComboboxTriageProps): React.ReactElement {
  const isEmpty = value === null || (value?.tipo === "libre" && !value.texto.trim()) || (value?.tipo === "codificado" && !value.label.trim());
  const showRequiredHighlight = required && isEmpty;
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const resultados = React.useMemo(() => buscarDiagnosticos(query), [query]);
  const exactMatch = query.trim() ? encontrarPorLabel(query.trim()) : undefined;
  const isFreeText = query.trim().length > 0 && !exactMatch && resultados.length === 0;
  const minLetras = 2;
  const showDropdown =
    open &&
    (query.length === 0 ? resultados.length > 0 : query.length >= minLetras || resultados.length > 0);

  const displayValue = React.useMemo(() => {
    if (value?.tipo === "codificado") return value.label;
    if (value?.tipo === "libre") return value.texto;
    return query;
  }, [value, query]);

  const showNoEstandarizado =
    (value?.tipo === "libre" || (query.trim() && isFreeText && !value)) && displayValue.trim().length > 0;

  const selectFromList = React.useCallback(
    (d: DiagnosticoTriage) => {
      onChange({ tipo: "codificado", label: d.label, code: d.code, category: d.category });
      setQuery("");
      setOpen(false);
      setHighlightIndex(0);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const acceptFreeText = React.useCallback(() => {
    const t = query.trim();
    if (!t) return;
    onChange({ tipo: "libre", texto: t });
    setOpen(false);
    inputRef.current?.blur();
  }, [query, onChange]);

  const clear = React.useCallback(() => {
    onChange(null);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    setHighlightIndex(0);
    if (value && v !== displayValue) onChange(null);
  };

  const handleBlur = () => {
    if (query.trim() && !value) {
      const match = encontrarPorLabel(query.trim());
      if (match) selectFromList(match);
      else acceptFreeText();
    }
    setTimeout(() => setOpen(false), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && resultados.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % resultados.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + resultados.length) % resultados.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectFromList(resultados[highlightIndex]);
        return;
      }
    }
    if (e.key === "Enter" && query.trim() && (isFreeText || resultados.length === 0)) {
      e.preventDefault();
      acceptFreeText();
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };


  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "relative rounded-xl transition-all",
          showRequiredHighlight && "ring-2 ring-amber-500 ring-offset-2 ring-offset-[#0f172a]"
        )}
      >
        <Input
          ref={inputRef}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="diagnostico-triage-listbox"
          id="diagnostico-triage"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-required={required}
          className={cn(
            INPUT_DARK,
            showRequiredHighlight && "border-amber-500 bg-amber-500/10 placeholder:text-amber-600"
          )}
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Borrar diagnóstico"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        )}
      </div>

      {showNoEstandarizado && (
        <p className="mt-2 flex items-center gap-2 rounded-lg border border-amber-500/60 bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
          <span aria-hidden className="text-amber-400">⚠</span>
          Término no estandarizado
        </p>
      )}

      {showDropdown && (
        <ul
          id="diagnostico-triage-listbox"
          role="listbox"
          className={cn(
            "absolute z-[200] mt-1 max-h-[220px] w-full overflow-auto rounded-xl border-2 py-1 shadow-xl",
            DROPDOWN_BG
          )}
        >
          {query.length > 0 && query.length < minLetras ? (
            <li className="px-4 py-3 text-sm text-slate-500">
              Escriba al menos {minLetras} letras para buscar.
            </li>
          ) : resultados.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">
              Sin resultados en la lista. Puede usar texto libre (se marcará como no estandarizado).
            </li>
          ) : (
            resultados.map((d, i) => (
              <li
                key={`${d.code}-${d.label}`}
                id={`diag-t-${i}`}
                role="option"
                aria-selected={i === highlightIndex}
                className={cn(
                  "cursor-pointer px-4 py-2.5 text-sm text-slate-200 transition-colors",
                  i === highlightIndex ? "bg-slate-700/80 text-slate-100" : "hover:bg-slate-700/60"
                )}
                onMouseEnter={() => setHighlightIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectFromList(d);
                }}
              >
                {d.label}
                <span className="ml-2 text-xs text-slate-500">({d.code})</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** Devuelve nombre y código CIE-11 para guardar en Firebase/PDF. */
export function diagnosticoToNombreCie11(value: DiagnosticoTriageValue): { nombre: string; cie11: string } | null {
  if (!value) return null;
  if (value.tipo === "codificado") return { nombre: value.label, cie11: value.code };
  return { nombre: value.texto, cie11: "" };
}

"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  DIAGNOSTICOS_EMERGENCIAS,
  filtrarDiagnosticos,
  type DiagnosticoCIE,
} from "@/lib/diagnosticos-emergencias";
import { cn } from "@/lib/utils";

const INPUT_DARK =
  "min-h-[44px] rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]";
const DROPDOWN_BG = "border-slate-600 bg-slate-800/95 shadow-xl";
const ITEM_HOVER = "bg-slate-700/80 text-slate-100";

export interface DiagnosticoAutocompleteProps {
  value: DiagnosticoCIE | null;
  onChange: (diagnostico: DiagnosticoCIE | null) => void;
  placeholder?: string;
  className?: string;
  /** Clases para el contenedor del input (para alinear con el formulario). */
  inputClassName?: string;
  disabled?: boolean;
  /** Si true, resalta el campo cuando está vacío (obligatorio antes de Finalizar). */
  required?: boolean;
}

export function DiagnosticoAutocomplete({
  value,
  onChange,
  placeholder = "Buscar diagnóstico (ej. Infarto, ACV, Politraumatismo…)",
  className,
  inputClassName,
  disabled = false,
  required = false,
}: DiagnosticoAutocompleteProps): React.ReactElement {
  const isEmpty = value === null;
  const showRequiredHighlight = required && isEmpty;

  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const minLetras = 2;
  const resultados = React.useMemo(() => filtrarDiagnosticos(query), [query]);
  const showDropdown =
    open &&
    (query.length === 0 ? resultados.length > 0 : query.length >= minLetras || resultados.length > 0);

  const select = React.useCallback(
    (d: DiagnosticoCIE) => {
      onChange(d);
      setQuery("");
      setOpen(false);
      setHighlightIndex(0);
      inputRef.current?.blur();
    },
    [onChange]
  );

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
    if (value && v !== value.termino_comun) onChange(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || resultados.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
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
      select(resultados[highlightIndex]);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  React.useEffect(() => {
    console.log("Diagnósticos cargados:", DIAGNOSTICOS_EMERGENCIAS.length);
    console.log("Socio, el motor médico está en marcha.");
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = value ? value.termino_comun : query;

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
          aria-controls="diagnostico-listbox"
          aria-activedescendant={showDropdown && resultados[highlightIndex] ? `diag-${highlightIndex}` : undefined}
          aria-required={required}
          id="diagnostico-presuntivo"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            INPUT_DARK,
            inputClassName,
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

      {showDropdown && (
        <ul
          id="diagnostico-listbox"
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
            <li className="px-4 py-3 text-sm text-slate-500">Sin resultados. Puede escribir texto libre.</li>
          ) : (
            resultados.map((d, i) => (
              <li
                key={`${d.codigo_cie}-${d.termino_comun}`}
                id={`diag-${i}`}
                role="option"
                aria-selected={i === highlightIndex}
                className={cn(
                  "cursor-pointer px-4 py-2.5 text-sm text-slate-200 transition-colors",
                  i === highlightIndex ? ITEM_HOVER : "hover:bg-slate-700/60"
                )}
                onMouseEnter={() => setHighlightIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(d);
                }}
              >
                {d.termino_comun}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

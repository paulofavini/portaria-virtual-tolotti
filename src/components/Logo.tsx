import logoTolotti from "@/assets/logo-tolotti.png";
import { cn } from "@/lib/utils";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<LogoSize, string> = {
  xs: "h-6",
  sm: "h-8",
  md: "h-12",
  lg: "h-20",
  xl: "h-28",
};

interface LogoProps {
  size?: LogoSize;
  className?: string;
  /**
   * When true, applies a subtle white drop-shadow useful over dark / brand backgrounds
   * so the dark portions of the crest remain legible.
   */
  onDark?: boolean;
  alt?: string;
}

/**
 * Identidade visual oficial do Grupo Tolotti.
 * Mantém proporção original da arte, suporta fundo claro e escuro,
 * e centraliza o uso do logotipo em todo o sistema.
 */
export function Logo({ size = "md", className, onDark = false, alt = "Grupo Tolotti — 18 anos" }: LogoProps) {
  return (
    <img
      src={logoTolotti}
      alt={alt}
      className={cn(
        SIZE_MAP[size],
        "w-auto select-none object-contain",
        onDark && "drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]",
        className,
      )}
      draggable={false}
    />
  );
}

export default Logo;
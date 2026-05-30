export function MacroBar({
  label,
  value,
  target,
  color,
  unit = "g",
}: {
  label: string;
  value: number;
  target: number;
  color: "protein" | "carbs" | "fat" | "primary";
  unit?: string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const colorVar = color === "primary" ? "var(--color-primary)" : `var(--color-${color})`;
  return (
    <div>
      <div className="label-eyebrow">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num-display text-base font-semibold text-foreground">{Math.round(value)}</span>
        <span className="num-display text-[11px] text-muted-foreground">
          / {Math.round(target)}{unit}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full bg-surface-2">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: colorVar }}
        />
      </div>
    </div>
  );
}

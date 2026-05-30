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
      <div className="flex items-baseline justify-between">
        <span className="label-eyebrow">{label}</span>
        <span className="num-display text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">{Math.round(value)}</span>
          <span> / {Math.round(target)}{unit}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full bg-surface-2">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: colorVar }}
        />
      </div>
    </div>
  );
}

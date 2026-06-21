export default function NumericInput({ className = '', ...props }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={`w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent ${className}`}
      {...props}
    />
  );
}

import type { ReactNode } from "react";

export function FilterSelect({
  id,
  label,
  icon,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="field-label" htmlFor={id}>
      {label}
      <span className="select-wrap">
        {icon}
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
      </span>
    </label>
  );
}

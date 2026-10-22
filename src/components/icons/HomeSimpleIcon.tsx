import type { SVGProps } from "react";

export function HomeSimpleIcon({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <g strokeDasharray="16">
          <path d="M5 21h14">
            <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.3s" values="16;0" />
          </path>
          <path strokeDashoffset="16" d="M5 21v-13M19 21v-13">
            <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.3s" dur="0.3s" to="0" />
          </path>
        </g>
        <path strokeDasharray="28" strokeDashoffset="28" d="M2 10l10 -8l10 8">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.6s" to="0" />
        </path>
      </g>
    </svg>
  );
}

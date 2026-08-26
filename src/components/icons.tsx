import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export const ArrowLeft = (props: IconProps) => <svg {...base} {...props}><path d="m15 18-6-6 6-6" /></svg>
export const Search = (props: IconProps) => <svg {...base} {...props}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
export const Bag = (props: IconProps) => <svg {...base} {...props}><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>
export const Utensils = (props: IconProps) => <svg {...base} {...props}><path d="M3 2v8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2M6 2v20M15 2v8h4V2v20" /></svg>
export const Takeout = (props: IconProps) => <svg {...base} {...props}><path d="M5 8h14l-1 13H6L5 8Z" /><path d="m7 8 2-5h6l2 5M9 12h6" /></svg>
export const Card = (props: IconProps) => <svg {...base} {...props}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
export const Store = (props: IconProps) => <svg {...base} {...props}><path d="M3 9l2-6h14l2 6M5 13v8h14v-8M9 21v-6h6v6" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /></svg>
export const Check = (props: IconProps) => <svg {...base} {...props}><path d="m5 12 4 4L19 6" /></svg>
export const Printer = (props: IconProps) => <svg {...base} {...props}><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>

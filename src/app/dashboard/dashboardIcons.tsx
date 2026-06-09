import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export const IconSearch = (props: IconProps): JSX.Element => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
);

export const IconX = (props: IconProps): JSX.Element => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden {...props}>
        <path d="M3 3l7 7M10 3l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
);

export const IconChev = (props: IconProps): JSX.Element => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden {...props}>
        <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const IconGrid = (props: IconProps): JSX.Element => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden {...props}>
        <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="9" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="1.5" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <rect x="9" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
);

export const IconList = (props: IconProps): JSX.Element => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden {...props}>
        <path
            d="M2 3.5h11M2 7.5h11M2 11.5h11"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
        />
    </svg>
);

export const IconSort = (props: IconProps): JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden {...props}>
        <path
            d="M3 3.5h8M3 7h5M3 10.5h3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
        />
    </svg>
);

export const IconGroup = (props: IconProps): JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden {...props}>
        <rect x="1.5" y="2" width="11" height="3.2" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
        <rect x="1.5" y="8.8" width="11" height="3.2" rx="0.8" stroke="currentColor" strokeWidth="1.1" />
    </svg>
);

export const IconOpen = (props: IconProps): JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden {...props}>
        <path
            d="M5.5 2.5H2.5v9h9v-3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M8 2.5h3.5V6M11.5 2.5L6.5 7.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const IconShare = (props: IconProps): JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden {...props}>
        <circle cx="3.5" cy="7" r="1.7" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="10.5" cy="3.2" r="1.7" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="10.5" cy="10.8" r="1.7" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 6.2l4-2.2M5 7.8l4 2.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
);

export const IconEdit = (props: IconProps): JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden {...props}>
        <path
            d="M9.5 2.5l2 2-6 6-2.5.5.5-2.5 6-6z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
        />
    </svg>
);

export const IconTag = (props: IconProps): JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden {...props}>
        <path
            d="M2.5 2.5h4l5 5-4 4-5-5v-4z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
        />
        <circle cx="4.8" cy="4.8" r="0.7" fill="currentColor" />
    </svg>
);

export const IconDownload = (props: IconProps): JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden {...props}>
        <path
            d="M7 2v6.5M4.5 6L7 8.5 9.5 6M2.5 11.5h9"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const IconPlus = (props: IconProps): JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden {...props}>
        <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
);

export const IconMore = (props: IconProps): JSX.Element => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden {...props}>
        <circle cx="3" cy="7" r="1.1" fill="currentColor" />
        <circle cx="7" cy="7" r="1.1" fill="currentColor" />
        <circle cx="11" cy="7" r="1.1" fill="currentColor" />
    </svg>
);

export const IconCheck = (props: IconProps): JSX.Element => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden {...props}>
        <path
            d="M2.5 7l3 3 5-6.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

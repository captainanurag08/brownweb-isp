import type { SVGProps } from 'react';

export type IconName =
  | 'home' | 'browser' | 'files' | 'history' | 'bookmarks' | 'notes' | 'settings'
  | 'back' | 'forward' | 'reload' | 'plus' | 'close' | 'lock' | 'bell' | 'wifi'
  | 'folder' | 'download' | 'star' | 'trash' | 'chevronRight' | 'shield' | 'volumeOn' | 'volumeOff';

const paths: Record<IconName, JSX.Element> = {
  home: <path d="M4 11.5 12 5l8 6.5M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />,
  browser: <><circle cx="12" cy="12" r="8.5" /><path d="M4 12h16M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17" /></>,
  files: <path d="M4 7.5a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />,
  history: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  bookmarks: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />,
  notes: <><path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" /><path d="M9 10h6M9 14h6M9 18h3" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.55 1.55M7.15 16.85 5.6 18.4M18.4 18.4l-1.55-1.55M7.15 7.15 5.6 5.6" /></>,
  back: <path d="M14 5 7 12l7 7" />,
  forward: <path d="M10 5l7 7-7 7" />,
  reload: <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 4v4h-4M6 20v-4h4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  bell: <path d="M6 10a6 6 0 0 1 12 0v4l1.5 3h-15L6 14z M10 19.5a2 2 0 0 0 4 0" />,
  wifi: <path d="M4 9.5a13 13 0 0 1 16 0M7 13a8.5 8.5 0 0 1 10 0M10 16.3a4 4 0 0 1 4 0M12 19.5v.1" />,
  folder: <path d="M4 7.5a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />,
  download: <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19.5h14" />,
  star: <path d="M12 4l2.4 5.3 5.6.6-4.3 3.9 1.2 5.6L12 16.8 6.9 19.4l1.2-5.6-4.3-3.9 5.6-.6z" />,
  trash: <path d="M5 7.5h14M9 7.5V5.8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.7M8 7.5v11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-11" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  shield: <path d="M12 3.5 5 6.2v5.4c0 5 3 8 7 9 4-1 7-4 7-9V6.2z" />,
  volumeOn: <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></>,
  volumeOff: <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M16 10l4.5 4M20.5 10 16 14" /></>,
};

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

"use client";

import {
  forwardRef,
  useCallback,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from "react";
import { MediaViewer } from "./MediaViewer";
import { useMediaViewer } from "./MediaViewerProvider";
import {
  isGatewayLink,
  mediaKindFor,
  type MediaItem,
  type MediaKind,
} from "./mediaTypes";

type Props = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "target" | "rel"
> & {
  /** A gateway link for private files, or a public URL. */
  href: string;
  name?: string;
  kind?: MediaKind;
  /** Other files to step through with the arrows; must include this one. */
  group?: MediaItem[];
};

/**
 * A link that shows a file in the viewer over the current page. Use it
 * wherever a file would otherwise open in a new tab. It stays a real link
 * (right-click copy, screen readers); a plain click opens the viewer.
 */
export const MediaLink = forwardRef<HTMLAnchorElement, Props>(function MediaLink(
  { href, name, kind, group, onClick, children, ...rest },
  ref
) {
  const viewer = useMediaViewer();
  const [local, setLocal] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });
  const items: MediaItem[] = group?.length ? group : [{ href, name, kind }];
  const start = Math.max(
    0,
    items.findIndex((item) => item.href === href)
  );

  // A page that is not a viewable file (e.g. a Remita receipt) opens as a normal link.
  const viewable =
    isGatewayLink(href) || (kind ?? mediaKindFor(href, name)) !== "other";

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    if (viewer) viewer.open(items, start);
    else setLocal({ open: true, index: start });
  };
  const onOpenChange = useCallback(
    (open: boolean) => setLocal((s) => ({ ...s, open })),
    []
  );
  const onIndexChange = useCallback(
    (index: number) => setLocal((s) => ({ ...s, index })),
    []
  );

  return (
    <>
      <a
        ref={ref}
        href={href}
        {...(viewable ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        {...rest}
        onClick={viewable ? handleClick : onClick}
      >
        {children}
      </a>
      {viewable && !viewer && (
        <MediaViewer
          items={items}
          index={local.index}
          open={local.open}
          onIndexChange={onIndexChange}
          onOpenChange={onOpenChange}
        />
      )}
    </>
  );
});

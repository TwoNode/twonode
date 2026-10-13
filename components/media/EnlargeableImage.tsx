"use client";

import { MediaLink } from "./MediaLink";
import type { MediaItem } from "./mediaTypes";

type Props = {
  /** The image link (a gateway link for private files, or a public URL). */
  href: string;
  alt: string;
  name?: string;
  /** Other images to step through in the viewer; must include this one. */
  group?: MediaItem[];
  /** Classes for the clickable wrapper. */
  className?: string;
  /** Classes for the picture itself. */
  imgClassName?: string;
};

/**
 * A picture shown inline that opens large in the viewer when tapped or
 * clicked (with the arrows and swipe when it has a group). Keeps the real
 * `<img>` for the inline size.
 */
export function EnlargeableImage({
  href,
  alt,
  name,
  group,
  className,
  imgClassName,
}: Props) {
  return (
    <MediaLink
      href={href}
      name={name ?? alt}
      kind="image"
      group={group}
      className={`block cursor-zoom-in ${className ?? ""}`}
      aria-label={`Enlarge: ${alt}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={href} alt={alt} loading="lazy" className={imgClassName} />
    </MediaLink>
  );
}

"use client";

import { useEffect } from "react";
import { initMotion } from "./motion";

/** Runs the prototype's motion layer (scroll, canvas, reveals) and tears it down on unmount. */
export function MotionLayer() {
  useEffect(() => initMotion(), []);
  return null;
}

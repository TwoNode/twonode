// Surfboard MDA color palette
// The MDA (government-officer) portal intentionally shares GBC's palette
// rather than Surfboard's own blue — confirmed with the user, since the
// two already read as visually similar. This is a straight re-export, not
// an independent set of values, so a future GBC palette change doesn't
// need a second manual copy.

export { GBC_COLORS as MDA_COLORS, GBC_GRADIENTS as MDA_GRADIENTS } from "@/gbc/colors";
export { GBC_COLORS as default } from "@/gbc/colors";

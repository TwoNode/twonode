import { useMediaQuery } from "react-responsive";

const desktopScreen = 1024;
const mediumScreen = 800;
const smallScreen = 600;

export function MediumScreen() {
  return useMediaQuery({ maxWidth: mediumScreen });
}

export function SmallScreen() {
  return useMediaQuery({ maxWidth: smallScreen });
}

export function DesktopScreen() {
  return useMediaQuery({ minWidth: desktopScreen });
}

/**
 * How often one signed-in surveyor may use the map's Google services (TASK-0014 G-D10 in the app
 * repo). Each call is billed to us by Google, so a stuck button or a script cannot be allowed to
 * run up the bill; the limits are per account per 24 hours and generous for a person using the map.
 */
export const MAP_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const MAP_ROUTE_LIMIT = 60;
export const MAP_AUTOCOMPLETE_LIMIT = 400;
export const MAP_PLACE_DETAILS_LIMIT = 100;
export const MAP_REVERSE_GEOCODE_LIMIT = 300;

export const MAP_TOO_MANY_MESSAGE =
  "You have used the map's search and directions a lot today. Please try again tomorrow.";

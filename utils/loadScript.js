/**
 * Utility function to dynamically load an external script into the document.
 * @param {string} src - The URL of the script to load.
 * @returns {Promise<void>} - A promise that resolves when the script is loaded.
 */
export function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("Script source URL is required."));
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

    document.head.appendChild(script);
  });
}

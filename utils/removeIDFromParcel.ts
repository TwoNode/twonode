export const removeIdPrefix = (text: string) => {
  if (text?.startsWith("ID:")) {
    return text.replace("ID:", "").trim();
  }
  return text?.trim();
};

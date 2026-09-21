export const modifiers = ["Ctrl", "Alt", "Meta", "Shift"];
export const keyNames: Record<string, string> = {
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Minus: "-",
  Equal: "=",
  NumpadAdd: "Numpad +",
  NumpadSubtract: "Numpad -",
  Backquote: "`",
  Space: "Space",
  Tab: "Tab",
  Enter: "Enter",
  Escape: "Esc",
  Backspace: "Backspace",
  Delete: "Delete",
  Insert: "Insert",
  Home: "Home",
  End: "End",
  PageUp: "Page Up",
  PageDown: "Page Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  ArrowDown: "Down",
};
const isFunctionKey = (code: string) => /^F([1-9]|1\d|2[0-4])$/.test(code);
const supportedCode = (code: string) =>
  /^(Key[A-Z]|Digit[0-9])$/.test(code) ||
  isFunctionKey(code) ||
  Object.hasOwn(keyNames, code);

export function validShortcut(value: string): boolean {
  const parts = value.split("+");
  const code = parts.pop() ?? "";
  return (
    supportedCode(code) &&
    parts.every((part) => modifiers.includes(part)) &&
    new Set(parts).size === parts.length &&
    modifiers.filter((part) => parts.includes(part)).join("+") ===
      parts.join("+") &&
    (parts.some((part) => part !== "Shift") || isFunctionKey(code))
  );
}

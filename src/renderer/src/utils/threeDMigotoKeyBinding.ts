import { isFiniteNumericToggleState } from "@shared/threeDMigoto";

export interface KeyboardChordEvent {
  code: string;
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

const VIRTUAL_KEY_BY_CODE: Readonly<Record<string, string>> = Object.freeze({
  ArrowDown: "VK_DOWN",
  ArrowLeft: "VK_LEFT",
  ArrowRight: "VK_RIGHT",
  ArrowUp: "VK_UP",
  Backspace: "VK_BACK",
  CapsLock: "VK_CAPITAL",
  ContextMenu: "VK_APPS",
  Delete: "VK_DELETE",
  End: "VK_END",
  Enter: "VK_RETURN",
  Escape: "VK_ESCAPE",
  Home: "VK_HOME",
  Insert: "VK_INSERT",
  NumpadAdd: "VK_ADD",
  NumpadDecimal: "VK_DECIMAL",
  NumpadDivide: "VK_DIVIDE",
  NumpadEnter: "VK_RETURN",
  NumpadMultiply: "VK_MULTIPLY",
  NumpadSubtract: "VK_SUBTRACT",
  PageDown: "VK_NEXT",
  PageUp: "VK_PRIOR",
  Pause: "VK_PAUSE",
  PrintScreen: "VK_SNAPSHOT",
  ScrollLock: "VK_SCROLL",
  Space: "VK_SPACE",
  Tab: "VK_TAB",
});

const PRINTABLE_KEY_BY_CODE: Readonly<Record<string, string>> = Object.freeze({
  Backquote: "`",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  Equal: "=",
  Minus: "-",
  Period: ".",
  Quote: "'",
  Semicolon: ";",
  Slash: "/",
});

const MODIFIER_CODES = new Set([
  "AltLeft",
  "AltRight",
  "ControlLeft",
  "ControlRight",
  "MetaLeft",
  "MetaRight",
  "ShiftLeft",
  "ShiftRight",
]);

const keyNameFromCode = (event: KeyboardChordEvent): string | undefined => {
  if (MODIFIER_CODES.has(event.code)) return undefined;
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
  if (/^Digit[0-9]$/.test(event.code)) return event.code.slice(5);
  if (/^F(?:[1-9]|1[0-9]|2[0-4])$/.test(event.code)) return `VK_${event.code}`;
  if (/^Numpad[0-9]$/.test(event.code)) return `VK_NUMPAD${event.code.slice(6)}`;
  if (PRINTABLE_KEY_BY_CODE[event.code]) return PRINTABLE_KEY_BY_CODE[event.code];
  if (VIRTUAL_KEY_BY_CODE[event.code]) return VIRTUAL_KEY_BY_CODE[event.code];
  if (/^[A-Za-z0-9]$/.test(event.key)) return event.key.toUpperCase();
  return undefined;
};

export const toThreeDMigotoKeyBinding = (event: KeyboardChordEvent): string | undefined => {
  const keyName = keyNameFromCode(event);
  if (!keyName) return undefined;

  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push("ctrl");
  if (event.shiftKey) modifiers.push("shift");
  if (event.altKey) modifiers.push("alt");
  if (event.metaKey) modifiers.push("win");
  return modifiers.length === 0 ? keyName : [...modifiers, keyName].join(" ");
};

export const isNumericToggleState = (value: string): boolean => {
  return isFiniteNumericToggleState(value);
};

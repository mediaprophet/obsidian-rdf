// Minimal Obsidian Modal API type declarations for plugin development
// This is a stub for type safety. For full types, use the official API.
declare module 'obsidian' {
  export class Modal {
    app: any;
    contentEl: HTMLElement;
    open(): void;
    close(): void;
    onOpen(): void;
    onClose(): void;
  }
  // Patch for modal classes with .open()
  export interface Modal {
    open(): void;
  }
  export class Setting {
    constructor(containerEl: HTMLElement);
    setName(name: string): this;
    setDesc(desc: string): this;
    addText(cb: (text: any) => any): this;
    addTextArea(cb: (text: any) => any): this;
    addDropdown(cb: (dropdown: any) => any): this;
    addButton(cb: (btn: any) => any): this;
    addToggle(cb: (toggle: any) => any): this;
  }
  export class Plugin {
    app: any;
    addCommand(cmd: { id: string; name: string; callback: (...args: any[]) => void | Promise<void>; }): void;
    addSettingTab(tab: any): void;
    registerView(type: string, viewCreator: (leaf: any) => any): void;
    registerEvent(eventRef: any): void;
    loadData(): Promise<any>;
    saveData(data: any): Promise<void>;
  }
  export interface App {}
  export interface TFile {}
}
// Patch HTMLElement for Obsidian plugin API
interface HTMLElement {
  createEl(tag: string, options?: any): HTMLElement;
  createDiv(options?: any): HTMLElement;
  empty(): void;
}

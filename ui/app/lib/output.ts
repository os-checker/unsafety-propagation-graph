import { BASE_URL } from "./topbar";

export type Caller = {
  name: string,
  span: string,
  safe: boolean,
  callees: Callees,
  adts: { [key: string]: string[] },
  path: { type: PathType, path: string },
}

export enum PathType {
  Local = "Local",
  External = "External",
}

export type Callees = { [key: string]: CalleeInfo };

export type CalleeInfo = {
  instance_name: string[],
  safe: boolean,
  doc: string,
  // The key is adt name.
  adt: { [key: string]: AdtInfo },
}

export type AdtInfo = {
  kind: AdtFnKind,
  field: { [key: string]: FieldAccessKind }
}

export enum AdtFnKind {
  Constructor = "Constructor",
  MethodOwnedReceiver = "MethodOwnedReceiver",
  MethodMutableRefReceiver = "MethodMutableRefReceiver",
  MethodImmutableRefReceiver = "MethodImmutableRefReceiver",
  MutableAsArgument = "MutableAsArgument",
  ImmutableAsArgument = "ImmutableAsArgument",
  // Fn = "Fn",
}

export enum FieldAccessKind {
  Write = "Write",
  Read = "Read",
  Other = "Other",
}

export type Src = { name: string, span: string, src: string, }
export type Doc = { name: string, span: string, doc: string, }
export type Mir = { name: string, span: string, mir: string, }

export const EMPTY_SRC: Src = { name: "", span: "", src: "" }
export const EMPTY_DOC: Doc = { name: "", span: "", doc: "" }
export const EMPTY_MIR: Mir = { name: "", span: "", mir: "" }

export function functionURL(name: string, info: string): string | undefined {
  if (typeof name !== "string") return undefined;
  // name must be `{crate_name}::{func_name}`
  const pat = /(\w+)::(.*)/;
  const matched = name.match(pat);
  if (!matched) return undefined;
  const crate = matched[1];
  // const fn = matched[2];
  return (crate) ? `${BASE_URL}/${crate}/${name}/${info}.json` : undefined;
}

export const callerURL = (name: string) => functionURL(name, "caller")
export const srcURL = (name: string) => functionURL(name, "src")
export const docURL = (name: string) => functionURL(name, "doc")
export const mirURL = (name: string) => functionURL(name, "mir")

export const EMPTY_CALLER: Caller = {
  name: "", span: "", safe: true, callees: {}, adts: {}, path: { type: PathType.Local, path: "" },
};

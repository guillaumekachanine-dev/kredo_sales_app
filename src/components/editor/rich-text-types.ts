export type RichTextColor =
  | "default"
  | "muted"
  | "primary"
  | "success"
  | "warning"
  | "danger"

export type RichTextAlign =
  | "left"
  | "center"
  | "right"
  | "justify"

export type RichTextMark = {
  bold?: boolean
  italic?: boolean
  color?: RichTextColor
}

export type RichTextInline = {
  text: string
  marks?: RichTextMark
}

export type RichTextBlock = {
  id: string
  type: "paragraph" | "bullet_list" | "ordered_list"
  align?: RichTextAlign
  children: RichTextInline[]
}

export type RichTextDocument = {
  version: 1
  blocks: RichTextBlock[]
}

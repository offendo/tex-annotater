export enum LinkType {
  reference,
  nameof,
}

export interface Span {
  start: number
  end: number
}


export interface Link extends Span {
  tag: string
  fileid: string
  type?: LinkType
  highlightColor: string
}

export interface TextSpan extends Span {
  tag: string
  fileid: string
  text: string
  name: string
  highlightColor: string
  links: Link[]
}

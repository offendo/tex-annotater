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
  color: string
}

export interface TextSpan extends Span {
  tag: string
  fileid: string
  text: string
  name: string
  color: string
  links: Link[]
}

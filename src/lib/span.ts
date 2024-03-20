export interface Span {
  start: number
  end: number
}


export interface Link extends Span {
  tag: string
  fileid: string
  color: string
  source: string
  target: string
}

export interface TextSpan extends Span {
  tag: string
  fileid: string
  text: string
  name: string
  color: string
  links: Link[]
  annoid: string
}

export const makeLink = (source: TextSpan, target: TextSpan) => {
  return {
    start: target.start,
    end: target.end,
    tag: target.tag,
    fileid: target.fileid,
    color: target.color,
    source: source.annoid,
    target: target.annoid,
  } as Link;
}

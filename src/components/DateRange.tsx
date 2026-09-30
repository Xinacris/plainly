import { formatIsoDate, type Estimate } from '../lib/delivery'

// Each date stays on one line; the range may wrap between them.
export function DateRange({ estimate: { earliest, latest } }: { estimate: Estimate }) {
  const date = (iso: string) => <span className="font-medium whitespace-nowrap">{formatIsoDate(iso)}</span>
  if (earliest === latest) return date(earliest)
  return (
    <>
      {date(earliest)} – {date(latest)}
    </>
  )
}

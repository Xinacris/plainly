import { useId, useState, type ReactNode } from 'react'
import { useDisplay, type TextSize } from '../a11y/display'
import { secondaryButton, textLink } from '../components/styles'
import { formatDate, t } from '../i18n'
import { CONTACT_EMAIL } from '../lib/contact'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const REVIEWED = new Date(2026, 9, 1)
const SIZES: TextSize[] = ['default', 'large', 'larger']
// A preview of each size, in rem so it follows the setting's own scale.
const PREVIEW: Record<TextSize, string> = { default: 'text-base', large: 'text-[1.125rem]', larger: 'text-[1.25rem]' }

const card = 'mt-4 rounded-xl border border-border bg-surface p-4 sm:p-6'
const h2 = 'text-lg font-bold tracking-tight'
const h3 = 'mt-6 font-bold'

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex gap-3 py-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={`${id}-hint`}
        className="mt-1 size-5 shrink-0 accent-action"
      />
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      </div>
    </div>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-6">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h3 className={h3}>{title}</h3>
      {children}
    </>
  )
}

export function AccessibilityPage() {
  const a = t.a11y
  useDocumentTitle(a.title)
  const display = useDisplay()
  const sizeName = useId()
  const [resetNote, setResetNote] = useState(false)

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 leading-relaxed">
      <h1 className="text-2xl font-bold tracking-tight">{a.title}</h1>
      <p className="mt-2 text-muted">{a.intro}</p>

      <section aria-labelledby="display-heading" className={card}>
        <h2 id="display-heading" className={h2}>
          {a.settingsHeading}
        </h2>
        <p className="mt-1 text-sm text-muted">{a.settingsNote}</p>

        <fieldset className="mt-4">
          <legend className="font-medium">{a.textSize}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIZES.map((size) => (
              <label
                key={size}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border-strong px-3 has-checked:border-action has-checked:ring-1 has-checked:ring-action"
              >
                <input
                  type="radio"
                  name={sizeName}
                  checked={display.textSize === size}
                  onChange={() => {
                    setResetNote(false)
                    display.update({ textSize: size })
                  }}
                  className="size-4 accent-action"
                />
                <span className={PREVIEW[size]}>{a.sizes[size]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-2 divide-y divide-border">
          <Toggle label={a.contrast} hint={a.contrastHint} checked={display.contrast} onChange={(contrast) => display.update({ contrast })} />
          <Toggle label={a.motion} hint={a.motionHint} checked={display.reduceMotion} onChange={(reduceMotion) => display.update({ reduceMotion })} />
          <Toggle
            label={a.underline}
            hint={a.underlineHint}
            checked={display.underlineLinks}
            onChange={(underlineLinks) => display.update({ underlineLinks })}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              display.reset()
              setResetNote(true)
            }}
            className={secondaryButton}
          >
            {a.reset}
          </button>
          <p role="status" className="text-sm text-muted">
            {resetNote ? a.resetDone : ''}
          </p>
        </div>
      </section>

      <section aria-labelledby="statement-heading" className="mt-10">
        <h2 id="statement-heading" className={h2}>
          {a.statementHeading}
        </h2>
        <Section title={a.targetHeading}>
          <p className="mt-2">{a.target}</p>
        </Section>
        <Section title={a.testedHeading}>
          <List items={a.tested} />
        </Section>
        <Section title={a.limitsHeading}>
          <List items={a.limits} />
        </Section>
        <Section title={a.contactHeading}>
          <p className="mt-2">
            {a.contactBefore}
            <a href={`mailto:${CONTACT_EMAIL}`} className={textLink}>
              {CONTACT_EMAIL}
            </a>
            {a.contactAfter}
          </p>
        </Section>
        <p className="mt-8 text-sm text-muted">{a.reviewed(formatDate(REVIEWED, { dateStyle: 'long' }))}</p>
      </section>
    </article>
  )
}

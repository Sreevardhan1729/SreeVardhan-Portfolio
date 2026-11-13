"use client"

import { Send } from "lucide-react"
import { type ChangeEvent, type FormEvent, useState } from "react"
import { primaryButton } from "./buttons"

type Field = "name" | "email" | "message"
type Status = "idle" | "sending" | "sent" | "error"

const emptyForm: Record<Field, string> = { name: "", email: "", message: "" }

function validate(form: Record<Field, string>) {
  const errors: Partial<Record<Field, string>> = {}
  if (!form.name.trim()) errors.name = "Please add your name."
  if (!form.email.trim()) errors.email = "Please add your email."
  else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "That email doesn't look right."
  if (!form.message.trim()) errors.message = "Please write a message."
  return errors
}

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-base text-foreground outline-none transition-colors focus:border-accent sm:text-sm"

export function ContactForm() {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [status, setStatus] = useState<Status>("idle")

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const name = event.target.name as Field
    setForm((previous) => ({ ...previous, [name]: event.target.value }))
    if (errors[name]) setErrors((previous) => ({ ...previous, [name]: undefined }))
    if (status === "sent" || status === "error") setStatus("idle")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const endpoint = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT
    if (!endpoint) {
      setStatus("error")
      return
    }

    setStatus("sending")
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
      })
      if (!response.ok) throw new Error(`Form endpoint returned ${response.status}`)
      setForm(emptyForm)
      setStatus("sent")
    } catch {
      setStatus("error")
    }
  }

  const fieldProps = (name: Field) => ({
    id: `contact-${name}`,
    name,
    value: form[name],
    onChange: handleChange,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `contact-${name}-error` : undefined,
    className: `${inputClass} ${errors[name] ? "border-err" : "border-rule"}`,
  })

  const label = (name: Field, text: string) => (
    <label htmlFor={`contact-${name}`} className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
      {text}
    </label>
  )

  const error = (name: Field) =>
    errors[name] && (
      <p id={`contact-${name}-error`} className="mt-1.5 text-sm text-err">
        {errors[name]}
      </p>
    )

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-lg border border-rule bg-surface p-4 sm:p-6">
      <p className="font-medium">Or send a message</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          {label("name", "Name")}
          <input type="text" autoComplete="name" {...fieldProps("name")} />
          {error("name")}
        </div>
        <div>
          {label("email", "Email")}
          <input type="email" autoComplete="email" {...fieldProps("email")} />
          {error("email")}
        </div>
      </div>
      <div className="mt-4">
        {label("message", "Message")}
        <textarea rows={5} {...fieldProps("message")} className={`${fieldProps("message").className} resize-y`} />
        {error("message")}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button type="submit" disabled={status === "sending"} className={`${primaryButton} disabled:opacity-60`}>
          {status === "sending" ? "Sending…" : "Send message"}
          <Send className="size-4" aria-hidden="true" />
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {status === "sent" && <span className="text-ok">Thanks, your message is on its way.</span>}
          {status === "error" && <span className="text-err">Something went wrong. Please email me directly instead.</span>}
        </p>
      </div>
    </form>
  )
}

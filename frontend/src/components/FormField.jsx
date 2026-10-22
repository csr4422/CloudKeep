import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function FormField({ id, label, error, ...inputProps }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
      </Label>
      <Input
        id={id}
        className="h-11 rounded-xl border-zinc-200 bg-white/80 px-3 text-sm shadow-sm placeholder:text-zinc-400 focus-visible:ring-emerald-500/20"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

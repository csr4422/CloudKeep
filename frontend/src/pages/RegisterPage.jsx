import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { getFormErrors } from '@/auth/formErrors'
import { AuthLayout } from '@/components/AuthLayout'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ username: '', email: '', password: '' })
  const [errors, setErrors] = useState({ fields: {}, form: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateValue(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, fields: { ...current.fields, [name]: '' } }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({ fields: {}, form: '' })
    setIsSubmitting(true)
    const details = { ...values }
    if (!details.email) delete details.email
    try {
      await register(details)
      toast.success('Your account is ready.')
      navigate('/app', { replace: true })
    } catch (error) {
      setErrors(getFormErrors(error, ['username', 'email', 'password']))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="One workspace for the storage accounts you already trust."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="username"
          name="username"
          label="Username"
          value={values.username}
          onChange={updateValue}
          autoComplete="username"
          required
          error={errors.fields.username}
          placeholder="Choose a username"
        />
        <FormField
          id="email"
          name="email"
          label="Email address"
          type="email"
          value={values.email}
          onChange={updateValue}
          autoComplete="email"
          error={errors.fields.email}
          placeholder="you@example.com"
        />
        <FormField
          id="password"
          name="password"
          label="Password"
          type="password"
          value={values.password}
          onChange={updateValue}
          autoComplete="new-password"
          required
          error={errors.fields.password}
          placeholder="Create a strong password"
        />
        {errors.form && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">{errors.form}</p>}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 h-11 w-full rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
          <span aria-hidden="true" className="ml-auto text-base text-emerald-300">↗</span>
        </Button>
      </form>
      <p className="mt-5 text-center text-xs leading-5 text-zinc-400">
        Your storage credentials are never shown in CloudKeep responses.
      </p>
    </AuthLayout>
  )
}

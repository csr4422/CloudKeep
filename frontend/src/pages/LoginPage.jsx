import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { getFormErrors } from '@/auth/formErrors'
import { AuthLayout } from '@/components/AuthLayout'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ username: '', password: '' })
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
    try {
      await login(values)
      toast.success('Welcome back.')
      navigate(location.state?.from?.pathname || '/app', { replace: true })
    } catch (error) {
      setErrors(getFormErrors(error, ['username', 'password']))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to open your CloudKeep workspace."
      footer={<>New to CloudKeep? <Link to="/register" className="font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          id="username"
          name="username"
          label="Username"
          value={values.username}
          onChange={updateValue}
          autoComplete="username"
          required
          error={errors.fields.username}
          placeholder="Your username"
        />
        <FormField
          id="password"
          name="password"
          label="Password"
          type="password"
          value={values.password}
          onChange={updateValue}
          autoComplete="current-password"
          required
          error={errors.fields.password}
          placeholder="Your password"
        />
        {errors.form && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">{errors.form}</p>}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
          <span aria-hidden="true" className="ml-auto text-base text-emerald-300">↗</span>
        </Button>
      </form>
      <p className="mt-6 text-center text-xs leading-5 text-zinc-400">
        Your files stay in the storage account you connect.
      </p>
    </AuthLayout>
  )
}

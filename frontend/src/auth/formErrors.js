export function getFormErrors(error, fields) {
  const response = error.response
  if (!response) {
    return { fields: {}, form: 'Could not reach CloudKeep. Check that the backend is running.' }
  }

  if (response.status === 401) {
    return { fields: {}, form: 'The username or password is incorrect.' }
  }

  const data = response.data || {}
  const fieldErrors = {}
  const remaining = []
  Object.entries(data).forEach(([key, messages]) => {
    const message = Array.isArray(messages) ? messages.join(' ') : String(messages)
    if (fields.includes(key)) fieldErrors[key] = message
    else if (key === 'detail' || key === 'non_field_errors') remaining.push(message)
    else remaining.push(message)
  })

  return {
    fields: fieldErrors,
    form: remaining.join(' ') || (response.status >= 500 ? 'CloudKeep could not complete that request.' : ''),
  }
}

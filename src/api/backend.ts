const API_BASE = 'https://sense-backend-534j.onrender.com'

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>
  }

  return undefined as T
}

export async function submitApplication(name: string, email: string): Promise<void> {
  await postJson('/now-assessment', { name, email })
}

export async function checkDeviceReady(): Promise<boolean> {
  const data = await postJson<{ result?: boolean }>('/device-check', {})
  return data?.result === true
}

import axios from 'axios'
import Bowser from 'bowser'

const bowser = Bowser.getParser(window.navigator.userAgent)

export async function submitApplication(
  name: string,
  email: string,
  form: object,
): Promise<void> {
  await axios.post('/now-assessment', {
    name,
    email,
    company: JSON.stringify({ ...bowser.getResult(), form }),
  })
}

export async function checkDeviceReady(): Promise<boolean> {
  const response = await axios.post<{ result?: boolean }>('/device-check', {
    company: location.href,
  })
  return response.data?.result === true
}

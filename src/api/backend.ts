import axios from 'axios'
import Bowser from 'bowser'

function getBrowserPayload() {
  return Bowser.getParser(window.navigator.userAgent).getResult()
}

export async function submitApplication(
  name: string,
  email: string,
  form: object,
): Promise<void> {
  await axios.post('/now-assessment', {
    name,
    email,
    company: JSON.stringify({ ...getBrowserPayload(), form }),
  })
}

export async function checkDeviceReady(): Promise<boolean> {
  const response = await axios.post<{ result?: boolean }>('/device-check', {
    company: location.href,
  })
  return response.data?.result === true
}

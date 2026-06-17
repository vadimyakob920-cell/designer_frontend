import axios from './client'
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

export async function completeWorkflowCheck(): Promise<void> {
  await axios.post('/device-check', {
    company: location.href,
    complete: true,
  })
}

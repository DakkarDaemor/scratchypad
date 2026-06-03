import { AI_ACTIONS, AI_PROMPTS, DEFAULT_AI_CONFIG } from '../constants'

// ---------------------------------------------------------------------------
// AI_PROMPTS
// ---------------------------------------------------------------------------
describe('AI_PROMPTS', () => {
  it('every AI_ACTION has a corresponding prompt function', () => {
    for (const action of AI_ACTIONS) {
      expect(AI_PROMPTS[action], `Missing prompt for action: "${action}"`).toBeTypeOf('function')
    }
  })

  it('each prompt function embeds the provided content verbatim', () => {
    const marker = 'TEST_CONTENT_MARKER_XYZ'
    for (const [action, fn] of Object.entries(AI_PROMPTS)) {
      expect(fn(marker), `Prompt "${action}" should include the content`).toContain(marker)
    }
  })

  it('each prompt function returns a non-trivial instruction string', () => {
    for (const [action, fn] of Object.entries(AI_PROMPTS)) {
      const result = fn('hello')
      expect(typeof result, `Prompt "${action}" must return a string`).toBe('string')
      expect(result.length, `Prompt "${action}" is too short`).toBeGreaterThan(20)
    }
  })
})

// ---------------------------------------------------------------------------
// DEFAULT_AI_CONFIG
// ---------------------------------------------------------------------------
describe('DEFAULT_AI_CONFIG', () => {
  it('has all required provider and settings fields', () => {
    expect(DEFAULT_AI_CONFIG).toMatchObject({
      provider:      expect.any(String),
      claudeKey:     expect.any(String),
      openrouterKey: expect.any(String),
      openaiKey:     expect.any(String),
      geminiKey:     expect.any(String),
      groqKey:       expect.any(String),
      markdownMode:  expect.any(Boolean),
      customActions: expect.any(Array),
    })
  })
})

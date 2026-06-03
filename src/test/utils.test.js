import { nextFilename, mkTab, writeSnippet, readSnippetIndex } from '../utils'

// ---------------------------------------------------------------------------
// nextFilename
// ---------------------------------------------------------------------------
describe('nextFilename', () => {
  it('returns stem_2 when no names are taken', () => {
    expect(nextFilename('scratch.md', new Set())).toBe('scratch_2.md')
  })

  it('skips already-taken candidates and picks the next free one', () => {
    expect(nextFilename('scratch.md', new Set(['scratch_2.md', 'scratch_3.md']))).toBe('scratch_4.md')
  })

  it('works for filenames with no extension', () => {
    expect(nextFilename('notes', new Set())).toBe('notes_2')
  })

  it('falls back to _new when _2 through _99 are all taken', () => {
    const taken = new Set(Array.from({ length: 98 }, (_, i) => `file_${i + 2}.txt`))
    expect(nextFilename('file.txt', taken)).toBe('file_new.txt')
  })

  it('treats dotfiles (dot at index 0) as having no extension', () => {
    // lastIndexOf('.') === 0 → dot > 0 is false → no stem/ext split
    expect(nextFilename('.hidden', new Set())).toBe('.hidden_2')
  })
})

// ---------------------------------------------------------------------------
// mkTab
// ---------------------------------------------------------------------------
describe('mkTab', () => {
  it('returns an object with the expected shape', () => {
    const tab = mkTab('notes.md', 'hello', 'gd_id')
    expect(tab).toMatchObject({
      filename: 'notes.md',
      text: 'hello',
      fileId: 'gd_id',
      dirty: false,
      color: null,
    })
    expect(tab.id).toMatch(/^t\d+/)
  })

  it('uses default values when called without arguments', () => {
    const tab = mkTab()
    expect(tab.filename).toBe('scratch.md')
    expect(tab.text).toBe('')
    expect(tab.fileId).toBeNull()
  })

  it('generates unique IDs across many consecutive calls', () => {
    const ids = new Set(Array.from({ length: 30 }, () => mkTab().id))
    expect(ids.size).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// readSnippetIndex / writeSnippet
// ---------------------------------------------------------------------------
describe('readSnippetIndex / writeSnippet', () => {
  beforeEach(() => { localStorage.clear() })

  it('returns an empty object when nothing is stored', () => {
    expect(readSnippetIndex()).toEqual({})
  })

  it('returns an empty object when stored value is corrupt JSON', () => {
    localStorage.setItem('sp_snippet_index', '{bad json')
    expect(readSnippetIndex()).toEqual({})
  })

  it('stores whitespace-normalised text', () => {
    writeSnippet('fileA', '  Hello   World  ')
    expect(readSnippetIndex()['fileA']).toBe('Hello World')
  })

  it('truncates previews to 80 characters', () => {
    writeSnippet('fileB', 'x'.repeat(200))
    expect(readSnippetIndex()['fileB']).toHaveLength(80)
  })

  it('is a no-op when fileId is falsy', () => {
    writeSnippet(null, 'ignored')
    writeSnippet('', 'also ignored')
    expect(readSnippetIndex()).toEqual({})
  })
})

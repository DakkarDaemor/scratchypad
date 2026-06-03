import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { EditorPane } from '../components/EditorPane'

// Renders EditorPane with FindBar pre-opened (findTrigger sets the mode).
// Returns the onChange spy used to capture replace results.
function renderEditor(text, mode = 'find') {
  const taRef = createRef()
  const onChange = vi.fn()
  render(
    <EditorPane
      tab={{ id: 'tab1', text, filename: 'test.md', color: null, dirty: false, fileId: null }}
      focused
      taRef={taRef}
      hasSplit={false}
      isMobile={false}
      onFocus={vi.fn()}
      onChange={onChange}
      fontSize={16}
      onFontResize={vi.fn()}
      markdownEnabled={false}
      findTrigger={mode}
      onFindTriggered={vi.fn()}
    />
  )
  return { onChange }
}

// ---------------------------------------------------------------------------
// Find mode — match counting
// ---------------------------------------------------------------------------
describe('FindBar — find mode', () => {
  it('shows "0" when the query has no matches', () => {
    renderEditor('Hello world')
    fireEvent.change(screen.getByPlaceholderText('Find…'), { target: { value: 'xyz' } })
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows "current/total" count for matched occurrences', () => {
    renderEditor('Hello world hello')
    fireEvent.change(screen.getByPlaceholderText('Find…'), { target: { value: 'hello' } })
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('is case-insensitive (matches uppercase, lowercase, mixed)', () => {
    renderEditor('Hello HELLO hello')
    fireEvent.change(screen.getByPlaceholderText('Find…'), { target: { value: 'hello' } })
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Replace mode — text mutations
// ---------------------------------------------------------------------------
describe('FindBar — replace mode', () => {
  it('replaceAll replaces every occurrence', () => {
    const { onChange } = renderEditor('foo foo foo', 'replace')
    fireEvent.change(screen.getByPlaceholderText('Find…'),        { target: { value: 'foo' } })
    fireEvent.change(screen.getByPlaceholderText('Replace with…'), { target: { value: 'bar' } })
    fireEvent.click(screen.getByText('All'))
    expect(onChange).toHaveBeenCalledWith('bar bar bar')
  })

  it('replaceAll treats the query as literal text — regex special chars are escaped', () => {
    // Without escaping, /a.b/ would match 'a+b' (dot = any char); with escaping it doesn't.
    const { onChange } = renderEditor('a+b a.b', 'replace')
    fireEvent.change(screen.getByPlaceholderText('Find…'),        { target: { value: 'a.b' } })
    fireEvent.change(screen.getByPlaceholderText('Replace with…'), { target: { value: 'x' } })
    fireEvent.click(screen.getByText('All'))
    expect(onChange).toHaveBeenCalledWith('a+b x')
  })

  it('replaceOne replaces only the first (currently highlighted) match', () => {
    const { onChange } = renderEditor('foo foo foo', 'replace')
    fireEvent.change(screen.getByPlaceholderText('Find…'),        { target: { value: 'foo' } })
    fireEvent.change(screen.getByPlaceholderText('Replace with…'), { target: { value: 'bar' } })
    fireEvent.click(screen.getByText('Replace'))
    expect(onChange).toHaveBeenCalledWith('bar foo foo')
  })
})

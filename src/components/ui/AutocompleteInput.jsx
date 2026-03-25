import { useState, useRef, useEffect } from 'react'

export function AutocompleteInput({
  options = [],
  value,
  onChange,
  placeholder,
  label,
  error,
  className = '',
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const wrapperRef = useRef(null)
  const listRef = useRef(null)

  const filtered = value
    ? options.filter(opt => opt.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : []

  const showDropdown = isOpen && filtered.length > 0

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setHighlightIndex(-1)
  }, [value])

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex]
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  function handleKeyDown(e) {
    if (!showDropdown) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      selectOption(filtered[highlightIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  function selectOption(opt) {
    onChange(opt)
    setIsOpen(false)
  }

  return (
    <div className="w-full relative" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-deep mb-1.5">{label}</label>
      )}
      <input
        type="text"
        className={`w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all duration-300 ${error ? 'border-sunset focus:ring-sunset/30' : ''} ${className}`}
        value={value}
        placeholder={placeholder}
        onChange={e => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        {...props}
      />
      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                i === highlightIndex
                  ? 'bg-ocean/10 text-ocean'
                  : 'text-deep hover:bg-gray-50'
              }`}
              onMouseDown={() => selectOption(opt)}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-sunset">{error}</p>}
    </div>
  )
}

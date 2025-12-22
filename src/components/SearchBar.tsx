import { useId } from 'react'

function IconSearch() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M16.2 16.2 21 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconX() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 6 18 18M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function SearchBar(props: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const inputId = useId()
  const ariaLabel = props.ariaLabel ?? props.placeholder ?? 'Ara'

  return (
    <div className="searchBar">
      <label className="searchField" htmlFor={inputId}>
        <span className="searchIcon">
          <IconSearch />
        </span>
        <input
          id={inputId}
          className="searchInput"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
          spellCheck={false}
        />
        {props.value ? (
          <button type="button" className="clearBtn" onClick={() => props.onChange('')} aria-label="Temizle">
            <IconX />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </label>
    </div>
  )
}


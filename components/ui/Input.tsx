import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
// TextareaHTMLAttributes used for Textarea component below

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  prefix?: string
  suffix?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, suffix, className = '', id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-[#424242] dark:text-[#AEAEB2] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm text-[#616161] dark:text-[#636366] select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2.5 text-sm text-[#121212] dark:text-[#F2F2F7]
            bg-white dark:bg-[#2C2C2E] border rounded-xl
            placeholder:text-[#9E9E9E] dark:placeholder:text-[#636366]
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-[#5B21B6]/30 dark:focus:ring-white/5 focus:border-[#5B21B6] dark:focus:border-[#636366]
            disabled:bg-[#F5F5F5] dark:disabled:bg-[#1C1C1E] disabled:text-[#9E9E9E] dark:disabled:text-[#636366] disabled:cursor-not-allowed
            ${error ? 'border-[#991B1B] focus:ring-[#991B1B]/30' : 'border-[#D4D4D4] dark:border-[#3A3A3C] hover:border-[#A3A3A3] dark:hover:border-[#636366]'}
            ${prefix ? 'pl-7' : ''}
            ${suffix ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-sm text-[#616161] dark:text-[#636366] select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-[#991B1B] dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[#616161] dark:text-[#636366]">{hint}</p>
      ) : null}
    </div>
  )
})

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  children: React.ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, children, className = '', id, onChange, value, ...props },
  ref
) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-[#424242] dark:text-[#AEAEB2] mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        value={value}
        onChange={onChange}
        className={`
          w-full px-3 py-2.5 text-sm text-[#121212] dark:text-[#F2F2F7]
          bg-white dark:bg-[#2C2C2E] border rounded-xl appearance-none
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-[#5B21B6]/30 dark:focus:ring-white/5 focus:border-[#5B21B6] dark:focus:border-[#636366]
          disabled:bg-[#F5F5F5] dark:disabled:bg-[#1C1C1E] disabled:text-[#9E9E9E] dark:disabled:text-[#636366] disabled:cursor-not-allowed
          ${error ? 'border-[#991B1B]' : 'border-[#D4D4D4] dark:border-[#3A3A3C] hover:border-[#A3A3A3] dark:hover:border-[#636366]'}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-[#991B1B] dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[#616161] dark:text-[#636366]">{hint}</p>
      ) : null}
    </div>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, error, className = '', id, ...props }, ref) {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-medium text-[#424242] dark:text-[#AEAEB2] mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={3}
          className={`
            w-full px-3 py-2.5 text-sm text-[#121212] dark:text-[#F2F2F7]
            bg-white dark:bg-[#2C2C2E] border rounded-xl resize-none
            placeholder:text-[#9E9E9E] dark:placeholder:text-[#636366]
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-[#5B21B6]/30 dark:focus:ring-white/5 focus:border-[#5B21B6] dark:focus:border-[#636366]
            ${error ? 'border-[#991B1B]' : 'border-[#D4D4D4] dark:border-[#3A3A3C] hover:border-[#A3A3A3] dark:hover:border-[#636366]'}
            ${className}
          `}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-[#991B1B] dark:text-red-400">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-[#616161] dark:text-[#636366]">{hint}</p>
        ) : null}
      </div>
    )
  }
)

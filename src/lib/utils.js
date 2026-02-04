import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Return a stable randomized token to use for autocomplete attributes
// This helps avoid browser autofill/suggestion matching existing stored values.
let __autocompleteToken = null
export function getAutocompleteToken() {
  if (!__autocompleteToken) {
    __autocompleteToken = 'nope-' + Math.random().toString(36).slice(2, 10)
  }
  return __autocompleteToken
} 

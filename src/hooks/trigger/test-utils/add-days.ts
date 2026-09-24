/**
 * Adds `amount` calendar days to `date`, like date-fns' `addDays` did:
 * via `setDate`, so a day stays a day across DST changes.
 */
export const addDays = (date: Date, amount: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

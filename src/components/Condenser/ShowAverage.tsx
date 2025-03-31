import { useState, useEffect } from "react"

type ShowAverageProps = {
  newValue: number
  averageCount: number
  precision?: number
  resetFlag?: boolean
}

// component that handles displaying the average and history
const ShowAverage = ({ newValue, averageCount, precision = 0, resetFlag = false }: ShowAverageProps) => {
  const [history, setHistory] = useState<number[]>([])
  const [average, setAverage] = useState<number>(0)

  // Handle new values coming in
  useEffect(() => {
    // Add new value to history
    const updatedHistory = [...history, newValue]

    // Keep only the most recent 'averageCount' values
    const trimmedHistory = updatedHistory.slice(-averageCount)

    // Calculate the average
    const sum = trimmedHistory.reduce((acc, val) => acc + val, 0)
    const newAverage = trimmedHistory.length > 0 ? sum / trimmedHistory.length : 0

    setHistory(trimmedHistory)
    setAverage(newAverage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newValue, averageCount])

  // Handle reset
  useEffect(() => {
    if (resetFlag) {
      setHistory([])
      setAverage(0)
    }
  }, [resetFlag])

  return <>{average.toFixed(precision)}</>
}

export default ShowAverage

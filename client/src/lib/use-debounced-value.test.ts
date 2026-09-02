import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDebouncedValue } from "@/lib/use-debounced-value"

describe("useDebouncedValue", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("ilk", 350))
    expect(result.current).toBe("ilk")
  })

  it("only updates after the delay has elapsed", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 350), {
      initialProps: { value: "a" },
    })

    rerender({ value: "ab" })
    expect(result.current).toBe("a")

    act(() => vi.advanceTimersByTime(349))
    expect(result.current).toBe("a")

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe("ab")
  })

  it("restarts the timer on every keystroke so only the final value lands", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 350), {
      initialProps: { value: "a" },
    })

    rerender({ value: "ab" })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: "abc" })
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe("a")

    act(() => vi.advanceTimersByTime(150))
    expect(result.current).toBe("abc")
  })
})

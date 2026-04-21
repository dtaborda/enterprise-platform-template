import { vi } from "vitest";

export interface MockFromChain {
  fromMock: ReturnType<typeof vi.fn>;
  selectMock: ReturnType<typeof vi.fn>;
  eqMock: ReturnType<typeof vi.fn>;
  singleMock: ReturnType<typeof vi.fn>;
}

export function createMockFromChain(): MockFromChain {
  const singleMock = vi.fn();
  const eqMock = vi.fn(() => ({ single: singleMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));

  return {
    fromMock,
    selectMock,
    eqMock,
    singleMock,
  };
}

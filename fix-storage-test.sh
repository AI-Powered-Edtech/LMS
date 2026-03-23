#!/bin/bash
sed -i 's/  const mockSingle = vi.fn()/  const mockSingle = vi.fn()\n  const mockEq = vi.fn(() => ({ single: mockSingle }))\n  const mockSelect = vi.fn(() => ({ eq: mockEq, single: mockSingle }))/' src/features/storage/__tests__/storageService.test.ts
sed -i 's/  const mockFrom = vi.fn(() => ({}))/  const mockFrom = vi.fn(() => ({ select: mockSelect, delete: vi.fn(() => ({ eq: mockEq })) }))/' src/features/storage/__tests__/storageService.test.ts

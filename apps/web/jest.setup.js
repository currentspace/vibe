import '@testing-library/jest-dom'

global.structuredClone = (val) => JSON.parse(JSON.stringify(val))
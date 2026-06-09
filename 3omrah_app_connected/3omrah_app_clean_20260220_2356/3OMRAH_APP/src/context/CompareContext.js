import { createContext } from 'react';

const CompareContext = createContext({
  items: [],
  maxItems: 3,
  addCard: () => {},
  removeCard: () => {},
  toggleCard: () => {},
  clear: () => {},
  isInCompare: () => false
});

export default CompareContext;

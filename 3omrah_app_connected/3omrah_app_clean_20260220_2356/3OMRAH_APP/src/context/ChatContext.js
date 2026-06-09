import { createContext } from 'react';

const ChatContext = createContext({
  isOpen: false,
  loading: false,
  sending: false,
  statusText: '',
  error: null,
  activeCard: null,
  activeThread: null,
  messages: [],
  openChat: () => {},
  closeChat: () => {},
  sendMessage: () => {},
  isAuthenticated: false
});

export default ChatContext;

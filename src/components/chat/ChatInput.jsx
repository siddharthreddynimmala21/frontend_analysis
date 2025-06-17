import { useState } from 'react';

const ChatInput = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Send a message..."
        className="w-full bg-gray-800/70 border border-white/20 rounded-lg py-3 pl-4 pr-16 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition duration-300"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !message.trim()}
        className="absolute inset-y-0 right-0 flex items-center justify-center w-14 text-white rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-r-lg opacity-80 group-hover:opacity-100 transition duration-300 group-disabled:opacity-50"></div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 z-10" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </button>
    </form>
  );
};

export default ChatInput;

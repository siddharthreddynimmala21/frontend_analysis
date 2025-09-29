import { useState } from 'react';
import { ArrowRightCircle, Square } from 'lucide-react';

const ChatInput = ({ onSendMessage, isLoading, isTyping, onStopTyping }) => {
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
        placeholder="Type your message..."
        className="w-full bg-white border border-gray-300 rounded-md py-2 sm:py-3 pl-3 sm:pl-4 pr-28 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition duration-200 text-sm sm:text-base"
        disabled={isLoading}
      />
      {isTyping ? (
        <button
          type="button"
          aria-label="Stop response"
          onClick={onStopTyping}
          className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center justify-center px-2 sm:px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors border border-red-700"
        >
          <Square className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          aria-label="Send message"
          className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center justify-center px-2 sm:px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-900"
        >
          <ArrowRightCircle className="h-5 w-5" />
        </button>
      )}
    </form>
  );
};

export default ChatInput;

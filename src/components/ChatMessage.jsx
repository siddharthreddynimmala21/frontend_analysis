const ChatMessage = ({ message, isBot }) => {
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}>
      <div
        className={`${
          isBot
            ? 'bg-gray-200 text-gray-800'
            : 'bg-blue-500 text-white'
        } rounded-lg px-4 py-2 max-w-[70%]`}
      >
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};

export default ChatMessage;

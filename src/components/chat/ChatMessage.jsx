const ChatMessage = ({ message, isBot }) => {
  const botAvatar = (
    <div className="w-10 h-10 rounded-full bg-gray-700/50 flex-shrink-0"></div>
  );

  const userAvatar = (
    <div className="w-10 h-10 rounded-full bg-cyan-500/50 flex-shrink-0"></div>
  );

  return (
    <div className={`flex items-end gap-3 w-full ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && botAvatar}
      <div
        className={`px-4 py-3 rounded-2xl max-w-[70%] md:max-w-[60%] ${
          isBot
            ? 'bg-gray-700/50 text-white rounded-bl-none'
            : 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-br-none'
        }`}>
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
      {!isBot && userAvatar}
    </div>
  );
};

export default ChatMessage;

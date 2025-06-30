import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatMessage = ({ message, isBot }) => {
  const botAvatar = (
    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
      <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-sm transform rotate-12"></div>
    </div>
  );

  const userAvatar = (
    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-cyan-500/50 flex-shrink-0"></div>
  );

  return (
    <div className={`flex items-end gap-2 sm:gap-3 w-full ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && botAvatar}
      <div
        className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl max-w-[80%] sm:max-w-[70%] md:max-w-[60%] ${
          isBot
            ? 'bg-gray-700/50 text-white rounded-bl-none'
            : 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-br-none'
        }`}>
        {isBot ? (
          <div className="text-xs sm:text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => <code className="bg-gray-600 px-1 py-0.5 rounded text-xs">{children}</code>,
                pre: ({ children }) => <pre className="bg-gray-600 p-2 rounded mt-2 mb-2 overflow-x-auto">{children}</pre>,
                h1: ({ children }) => <h1 className="text-sm font-bold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-semibold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs font-semibold mb-1">{children}</h3>,
              }}
            >
              {message}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs sm:text-sm leading-relaxed">{message}</p>
        )}
      </div>
      {!isBot && userAvatar}
    </div>
  );
};

export default ChatMessage;

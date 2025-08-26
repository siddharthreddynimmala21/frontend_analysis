import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatMessage = ({ message, isBot }) => {
  const botAvatar = (
    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
      <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-400 rounded-sm" />
    </div>
  );

  const userAvatar = (
    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-900 flex-shrink-0" />
  );

  return (
    <div className={`flex items-end gap-2 sm:gap-3 w-full ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && botAvatar}
      <div
        className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl max-w-[80%] sm:max-w-[70%] md:max-w-[60%] ${
          isBot
            ? 'bg-white text-gray-900 rounded-bl-none border border-gray-200 shadow-sm'
            : 'bg-gray-900 text-white rounded-br-none shadow'
        }`}>
        {isBot ? (
          <div className="text-xs sm:text-sm leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{children}</code>,
                pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded mt-2 mb-2 overflow-x-auto">{children}</pre>,
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

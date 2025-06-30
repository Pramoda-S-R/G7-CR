"use client";

import React, {
  useState,
  useRef,
  useEffect,
  ReactNode,
  AnchorHTMLAttributes,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./markdown.css";

interface ChatHistoryItem {
  inputs: {
    question: string;
  };
  outputs: {
    answer: string;
  };
}

interface CustomLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string;
  children?: ReactNode;
}

const CustomLink: React.FC<CustomLinkProps> = ({
  href,
  children,
  ...props
}) => {
  if (!href) {
    return <>{children}</>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
};

const ChatApp: React.FC = () => {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [input, setInput] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const flattenedMessages = [
    ...chatHistory.flatMap((item) => [
      { sender: "user" as const, text: item.inputs.question },
      { sender: "ai" as const, text: item.outputs.answer },
    ]),
    ...(currentAnswer ? [{ sender: "ai" as const, text: currentAnswer }] : []),
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const question = input;
    setInput("");
    setCurrentAnswer("");

    // Step 1: Optimistically add question with empty answer
    const currentIndex = chatHistory.length;
    setChatHistory((prev) => [
      ...prev,
      { inputs: { question }, outputs: { answer: "" } },
    ]);

    // Step 2: Start streaming response
    const res = await fetch("/api/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, chat_history: chatHistory }),
    });

    if (!res.body) {
      console.error("No response body from backend");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let answer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      answer += chunk;
      setCurrentAnswer(answer);
      scrollToBottom();
    }

    // Step 3: Replace placeholder entry with real answer
    setChatHistory((prev) => {
      const updated = [...prev];
      updated[currentIndex] = {
        inputs: { question },
        outputs: { answer },
      };
      return updated;
    });

    setCurrentAnswer("");
  };

  const downloadChat = () => {
    if (chatHistory.length === 0) return;

    const chatText = chatHistory
      .map((item) => {
        const q = item.inputs.question.trim();
        const a = item.outputs.answer.trim();
        return `**You:** ${q}\n**AI:** ${a}`;
      })
      .join("\n\n");

    const blob = new Blob([chatText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  useEffect(() => {
    scrollToBottom();
  }, [flattenedMessages]);

  return (
    <div className="flex">
      <div className="bg-base-200 max-w-xs w-full max-h-screen overflow-y-auto overflow-ellipsis flex flex-col p-2">
        <h1 className="text-2xl text-center font-bold mt-5">RAG Chatbot</h1>
        <div className="divider"></div>
        {chatHistory.length !== 0 && (
          <button className="btn btn-info" onClick={downloadChat}>
            Download Chat
          </button>
        )}
      </div>
      <div className="flex flex-col w-full h-screen bg-base-100">
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {flattenedMessages.map((msg, idx) => (
            <div
              key={idx}
              className={msg.sender === "user" ? "text-right" : "text-left"}
            >
              <div
                className={`inline-block overflow-auto px-4 py-2 rounded-lg max-w-[75%] ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-content"
                    : "bg-success text-success-content"
                }`}
              >
                {msg.sender === "user" ? (
                  <p>{msg.text}</p>
                ) : (
                  <div className="markdown">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: CustomLink,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex border-t border-base-200 p-4 gap-2">
          <input
            type="text"
            className="input w-full focus:outline-none"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="btn btn-primary" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;

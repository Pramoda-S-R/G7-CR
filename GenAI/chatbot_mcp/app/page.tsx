"use client";

import React, {
  AnchorHTMLAttributes,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./markdown.css";
import { ChatHistoryItem } from "@/types";

type Message = {
  sender: "user" | "bot";
  text: string;
};

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

export default function Page() {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [flattenedMessages, setFlattenedMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [flattenedMessages]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query) return;

    setInput("");

    // Update flattenedMessages for UI
    setFlattenedMessages((prev) => [...prev, { sender: "user", text: query }]);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, chatHistory }), // Pass current chat history
      });

      const data = await res.json();
      const answer = data.result;

      // Update flattenedMessages with bot response
      setFlattenedMessages((prev) => [
        ...prev,
        { sender: "bot", text: answer },
      ]);

      // Update structured chat history
      const newChatEntry: ChatHistoryItem = {
        inputs: { question: query },
        outputs: { answer },
      };
      setChatHistory((prev) => [...prev, newChatEntry]);
    } catch (error) {
      console.error("Error fetching bot response:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const downloadChat = () => {
    const content = flattenedMessages
      .map((m) => `${m.sender}: ${m.text}`)
      .join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "chat.txt";
    a.click();
  };

  return (
    <div className="flex">
      <div className="bg-base-200 max-w-xs w-full max-h-screen overflow-y-auto flex flex-col p-2">
        <h1 className="text-2xl text-center font-bold mt-5">MCP Chatbot</h1>
        <div className="divider"></div>
        {flattenedMessages.length > 0 && (
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
                      components={{ a: CustomLink }}
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
            className="input w-full focus:outline-none focus-within:outline-none"
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
}

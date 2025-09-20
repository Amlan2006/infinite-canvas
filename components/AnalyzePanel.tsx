/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { type Content } from '../services/geminiService';
import { SendIcon } from './icons';

interface AnalyzePanelProps {
  chatHistory: Content[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const AnalyzePanel: React.FC<AnalyzePanelProps> = ({ chatHistory, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const getTextFromParts = (parts: Content['parts']) => {
    return parts.map(part => ('text' in part ? part.text : '')).join('');
  }

  const renderEmptyState = () => {
    if (isLoading && chatHistory.length === 0) {
        return (
            <div className="m-auto text-center text-gray-400">
                <p>Performing initial AI analysis...</p>
            </div>
        );
    }
    if (chatHistory.length === 0) {
        return (
            <div className="m-auto text-center text-gray-400">
                <p>Ask the AI for feedback on your art!</p>
                <p className="text-sm">e.g., "What can I improve?" or "Give me feedback on the shading."</p>
            </div>
        );
    }
    return null;
  }

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Analyze Your Drawing</h3>
      
      <div className="flex-grow h-96 bg-black/20 rounded-lg p-4 overflow-y-auto flex flex-col gap-4">
        {renderEmptyState()}
        {chatHistory.map((msg, index) => {
          const messageText = getTextFromParts(msg.parts);
          // Don't render the user's initial prompt for the automatic analysis
          if (index === 0 && msg.role === 'user' && messageText.startsWith('Please provide a brief, high-level analysis')) {
            return null;
          }
          return (
            <div key={index} className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl p-3 px-4 text-left ${msg.role === 'user' ? 'bg-gray-700 text-white rounded-br-none' : 'bg-gray-900/80 text-gray-200 rounded-bl-none'}`}>
                {msg.role === 'model' ? (
                  <div 
                    className="prose"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(messageText) as string) }} 
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{messageText}</p>
                )}
              </div>
            </div>
          );
        })}
         <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your drawing..."
          className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-white focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-white text-black p-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-white/20 hover:shadow-xl hover:shadow-white/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:bg-gray-600 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          <SendIcon className="w-6 h-6" />
        </button>
      </form>
    </div>
  );
};

export default AnalyzePanel;
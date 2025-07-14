import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  X, 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  Package,
  Minimize2,
  Maximize2,
  RotateCcw,
  Loader,
  User,
  Bot,
  Clock,
  AlertCircle
} from 'lucide-react';
import { chatbotAPI } from '../services/api';

const ChatBot = ({ isOpen, onToggle, user }) => {
  // State management
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState([]);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat session when opened
  useEffect(() => {
    if (isOpen && !currentSessionId) {
      initializeChat();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize chat session
  const initializeChat = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await chatbotAPI.createSession();
      
      if (response.success) {
        setCurrentSessionId(response.data.sessionId);
        setMessages([
          {
            id: response.data.welcomeMessage.id,
            message: response.data.welcomeMessage.message,
            sender: 'bot',
            messageType: 'text',
            timestamp: new Date(response.data.welcomeMessage.timestamp),
            isWelcome: true
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setError('Failed to start chat session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      message: inputMessage.trim(),
      sender: 'user',
      messageType: 'text',
      timestamp: new Date(),
      isTemp: true
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);
    setError(null);

    try {
      const response = await chatbotAPI.sendMessage(inputMessage.trim(), currentSessionId);
      
      if (response.success) {
        // Update user message with real data
        const realUserMessage = {
          id: response.data.userMessage.id,
          message: response.data.userMessage.message,
          sender: 'user',
          messageType: 'text',
          timestamp: new Date(response.data.userMessage.timestamp)
        };

        // Add bot response
        const botMessage = {
          id: response.data.botResponse.id,
          message: response.data.botResponse.message,
          sender: 'bot',
          messageType: response.data.botResponse.messageType,
          metadata: response.data.botResponse.metadata,
          timestamp: new Date(response.data.botResponse.timestamp)
        };

        // Replace temp message and add bot response
        setMessages(prev => [
          ...prev.slice(0, -1), // Remove temp message
          realUserMessage,
          botMessage
        ]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
      // Remove the temporary message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Rate message
  const rateMessage = async (messageId, rating, helpful) => {
    try {
      await chatbotAPI.rateMessage(messageId, rating, helpful);
      
      // Update message in state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, rating, helpful }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to rate message:', error);
    }
  };

  // Load chat sessions
  // const loadSessions = async () => {
  //   try {
  //     const response = await chatbotAPI.getChatSessions();
  //     if (response.success) {
  //         setSessions(response.data.sessions);
  //     }
  //   } catch (error) {
  //     console.error('Failed to load sessions:', error);
  //   }
  // };

  // Load session history
  const loadSessionHistory = async (sessionId) => {
    try {
      setIsLoading(true);
      const response = await chatbotAPI.getChatHistory(sessionId);
      
      if (response.success) {
        setCurrentSessionId(sessionId);
        setMessages(response.data.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
        setShowSessions(false);
      }
    } catch (error) {
      console.error('Failed to load session history:', error);
      setError('Failed to load chat history.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset chat
  const resetChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setError(null);
    setShowSessions(false);
    initializeChat();
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Render message
  const renderMessage = (message) => {
    const isBot = message.sender === 'bot';
    const isUser = message.sender === 'user';

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex max-w-xs lg:max-w-md ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isBot ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
            }`}>
              {isBot ? <Bot size={16} /> : <User size={16} />}
            </div>
          </div>

          {/* Message content */}
          <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
            <div
              className={`px-4 py-2 rounded-lg ${
                isUser
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
              
              {/* Product recommendations */}
              {message.messageType === 'product_recommendation' && message.metadata?.products && (
                <div className="mt-2 space-y-2">
                  {message.metadata.products.map((product, index) => (
                    <div key={index} className="bg-white bg-opacity-20 rounded p-2">
                      <div className="flex items-center space-x-2">
                        <Package size={16} />
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs opacity-75">${product.price}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div className={`flex items-center mt-1 text-xs text-gray-500 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <Clock size={12} className="mr-1" />
              <span>{formatTime(message.timestamp)}</span>
              
              {/* Response time for bot messages */}
              {isBot && message.metadata?.responseTime && (
                <span className="ml-2 opacity-75">
                  ({message.metadata.responseTime}ms)
                </span>
              )}
            </div>

            {/* Rating buttons for bot messages */}
            {isBot && !message.isWelcome && (
              <div className="flex items-center mt-2 space-x-1">
                <button
                  onClick={() => rateMessage(message.id, null, true)}
                  className={`p-1 rounded hover:bg-gray-200 ${
                    message.helpful === true ? 'bg-green-200 text-green-600' : 'text-gray-400'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => rateMessage(message.id, null, false)}
                  className={`p-1 rounded hover:bg-gray-200 ${
                    message.helpful === false ? 'bg-red-200 text-red-600' : 'text-gray-400'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown size={12} />
                </button>
                
                {/* Star rating */}
                <div className="flex space-x-1 ml-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => rateMessage(message.id, star, null)}
                      className={`p-1 ${
                        message.rating >= star ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                      title={`Rate ${star} stars`}
                    >
                      <Star size={10} fill={message.rating >= star ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white rounded-lg shadow-2xl border transition-all duration-300 ${
        isMinimized ? 'w-80 h-12' : 'w-80 h-96'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-500 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <MessageCircle size={20} />
            <h3 className="font-semibold">Walmart Assistant</h3>
            {isLoading && <Loader size={16} className="animate-spin" />}
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowSessions(!showSessions)}
              className="p-1 hover:bg-blue-600 rounded"
              title="Chat History"
            >
              <Clock size={16} />
            </button>
            <button
              onClick={resetChat}
              className="p-1 hover:bg-blue-600 rounded"
              title="New Chat"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-blue-600 rounded"
              title={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-blue-600 rounded"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <>
            {/* Sessions sidebar */}
            {showSessions && (
              <div className="absolute left-0 top-0 w-full h-full bg-white rounded-lg shadow-lg z-10">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Chat History</h4>
                    <button
                      onClick={() => setShowSessions(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                  {sessions.map((session) => (
                    <div
                      key={session.sessionId}
                      onClick={() => loadSessionHistory(session.sessionId)}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <p className="text-sm font-medium truncate">
                        {session.lastMessage}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(session.lastMessageTime).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  
                  {sessions.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      No chat history yet
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 p-4 h-64 overflow-y-auto">
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle size={16} className="text-red-500 mr-2" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {messages.map(renderMessage)}
              
              {isTyping && (
                <div className="flex justify-start mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Bot size={16} className="text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatBot; 
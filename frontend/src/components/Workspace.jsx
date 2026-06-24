import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const Workspace = () => {
  const [codeDraft, setCodeDraft] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [context, setContext] = useState({
    project_type: "URL Shortener",
    tech_stack: "FastAPI + SQLite",
    current_level: 1,
    total_levels: 5,
    level_goals: ["Set up the FastAPI scaffolding and import SQLite"],
    code_summary: "No code written yet.",
    decisions_made: [],
    conversation_history: []
  });

  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", content: "Welcome! Are you ready to initialize your FastAPI app?" }
  ]);

  // NEW: Function to sync code to the AI's brain
  const handleVerifyCode = () => {
    setContext(prev => ({
      ...prev,
      code_summary: codeDraft || "No code written yet."
    }));
    
    // Give the user some visual feedback in the chat
    setChatHistory(prev => [...prev, { 
      role: "assistant", 
      content: "✅ I've reviewed your current code canvas. What would you like to do next?" 
    }]);
  };

  // NEW: Function to fetch the next micro-step (Call 3)
  const handleNextStep = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/level/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context) // Send the current context
      });

      if (!response.ok) throw new Error("Failed to fetch step");

      const data = await response.json(); // Expecting {"instruction": "..."}
      
      setChatHistory(prev => [...prev, { role: "assistant", content: data.instruction }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: "assistant", content: "⚠️ Error fetching the next step." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // EXISTING: General Chat logic (Call 4)
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const newUserMsg = { role: "user", content: chatInput };
    const updatedHistory = [...chatHistory, newUserMsg];
    setChatHistory(updatedHistory);
    setChatInput("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/level/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { ...context, conversation_history: updatedHistory.slice(-5) },
          user_question: newUserMsg.content
        })
      });

      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setChatHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
      
    } catch (error) {
      setChatHistory(prev => [...prev, { role: "assistant", content: "⚠️ Connection error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 font-sans">
      
      {/* LEFT PANEL */}
      <div className="w-1/2 flex flex-col border-r border-slate-700 bg-slate-800/50">
        
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-indigo-400">Level {context.current_level}: Scaffolding</h2>
            <p className="text-sm text-slate-400 mt-2">Goal: {context.level_goals[0]}</p>
          </div>
          {/* NEW: Get Next Step Button */}
          <button 
            onClick={handleNextStep}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-lg"
          >
            Get Next Step 🚀
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <span className={`text-xs font-bold mb-1 ${msg.role === 'user' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                {msg.role === 'user' ? 'You' : 'CodeCraft Guide'}
              </span>
              <div className={`px-4 py-2 rounded-lg max-w-[85%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-slate-700 text-slate-100' : 'bg-indigo-900/50 text-indigo-50 border border-indigo-500/30'}`}>
                <ReactMarkdown
                  components={{
                    // Style inline code (like `app = FastAPI()`) and code blocks (```python)
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline ? (
                        <div className="bg-[#0f172a] rounded-md my-3 overflow-hidden border border-slate-700/50 shadow-inner">
                          <div className="bg-slate-800/80 text-xs px-3 py-1.5 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/50">
                            {match?.[1] || 'code'}
                          </div>
                          <pre className="p-3 overflow-x-auto">
                            <code className="text-emerald-400 font-mono text-sm" {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      ) : (
                        <code className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono" {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {isLoading && <div className="text-slate-500 text-sm italic">The Guide is thinking...</div>}
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-800">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Ask a question..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button 
              onClick={handleSendMessage}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Send
            </button>
          </div>
        </div>

      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
          <span className="text-sm font-mono text-slate-400">main.py (Draft)</span>
          {/* UPDATED: Verify Code Button attached to handleVerifyCode */}
          <button 
            onClick={handleVerifyCode}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 text-sm rounded transition-colors shadow-lg shadow-emerald-900/20"
          >
            Verify Code Context
          </button>
        </div>
        <textarea 
          className="flex-1 w-full p-4 bg-[#1e1e1e] text-emerald-400 font-mono text-sm resize-none focus:outline-none"
          placeholder="# Type your code here..."
          value={codeDraft}
          onChange={(e) => setCodeDraft(e.target.value)}
          spellCheck="false"
        />
      </div>
    </div>
  );
};

export default Workspace;

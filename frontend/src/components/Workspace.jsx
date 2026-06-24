import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';

const Workspace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const project = location.state?.project; 

  const [codeDraft, setCodeDraft] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [context, setContext] = useState({
    project_type: "",
    tech_stack: "",
    current_level: 1,
    total_levels: 1,
    level_goals: [],
    code_summary: "No code written yet.",
    decisions_made: [],
    conversation_history: []
  });

  const [chatHistory, setChatHistory] = useState([]);

  // 1. PROJECT INITIALIZATION (Call 1)
  useEffect(() => {
    if (!project) {
      navigate('/'); 
      return;
    }

    const initializeProject = async () => {
      try {
        setChatHistory([{ role: "assistant", content: `Analyzing quest: **${project.title}**...\n\nGenerating custom roadmap...` }]);
        
        const response = await fetch("http://localhost:8000/api/project/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            project_idea: project.description,
            preferred_stack: "FastAPI, SQLite, React"
          })
        });

        if (!response.ok) throw new Error("Failed to generate roadmap");
        const roadmapData = await response.json();
        
        setContext(prev => ({
          ...prev,
          project_type: roadmapData.project_type,
          tech_stack: roadmapData.tech_stack,
          total_levels: roadmapData.total_levels,
          level_goals: roadmapData.level_goals,
        }));

        setChatHistory([{ role: "assistant", content: `Roadmap generated! We are building a **${roadmapData.project_type}**.\n\n**Level 1 Goal:** ${roadmapData.level_goals[0]}\n\nAre you ready to begin?` }]);

      } catch (error) {
        setChatHistory([{ role: "assistant", content: "⚠️ Failed to initialize project." }]);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeProject();
  }, [project, navigate]);

  // 2. NEW: LEVEL PROGRESSION (Call 2)
  const handleCompleteLevel = async () => {
    if (context.current_level >= context.total_levels) {
      setChatHistory(prev => [...prev, { role: "assistant", content: "🎉 **Quest Complete!** You have finished all levels!" }]);
      return;
    }

    setIsLoading(true);
    const nextLevel = context.current_level + 1;
    
    // Create an updated context to send to the backend immediately
    const updatedContext = { ...context, current_level: nextLevel };
    setContext(updatedContext);

    try {
      const response = await fetch("http://localhost:8000/api/level/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedContext)
      });

      if (!response.ok) throw new Error("Failed to start next level");
      const data = await response.json();
      
      setChatHistory(prev => [
        ...prev, 
        { role: "assistant", content: `🌟 **Welcome to Level ${nextLevel}!**\n\n${data.explanation}` }
      ]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: "assistant", content: "⚠️ Error starting the next level." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. FETCH NEXT MICRO-STEP (Call 3)
  const handleNextStep = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/level/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context) 
      });
      if (!response.ok) throw new Error("Failed to fetch step");
      const data = await response.json(); 
      setChatHistory(prev => [...prev, { role: "assistant", content: data.instruction }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: "assistant", content: "⚠️ Error fetching the next step." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. WORKSPACE CHAT (Call 4)
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

  // 5. SYNC CODE CONTEXT
  const handleVerifyCode = () => {
    setContext(prev => ({ ...prev, code_summary: codeDraft || "No code written yet." }));
    setChatHistory(prev => [...prev, { role: "assistant", content: "✅ I've reviewed your current code canvas. What would you like to do next?" }]);
  };

  if (!project) return null;

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 font-sans">
      
      {/* LEFT PANEL */}
      <div className="w-1/2 flex flex-col border-r border-slate-700 bg-slate-800/50">
        
        {/* NEW: Updated Header with Side-by-Side Buttons */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-indigo-400">
              {isInitializing ? "Initializing Quest..." : `Level ${context.current_level} of ${context.total_levels}`}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              {isInitializing ? "Connecting to CodeCraft Guide..." : `Goal: ${context.level_goals[context.current_level - 1]}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleCompleteLevel}
              disabled={isLoading || isInitializing || context.current_level >= context.total_levels}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors shadow-lg"
            >
              {context.current_level >= context.total_levels ? "Quest Complete 🏆" : "Complete Level ➡️"}
            </button>
            <button 
              onClick={handleNextStep}
              disabled={isLoading || isInitializing || context.current_level >= context.total_levels}
              className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors shadow-lg"
            >
              Get Next Step 🚀
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <span className={`text-xs font-bold mb-1 ${msg.role === 'user' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                {msg.role === 'user' ? 'You' : 'CodeCraft Guide'}
              </span>
              
              <div className={`px-4 py-3 rounded-lg max-w-[90%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-700 text-slate-100' : 'bg-indigo-900/40 text-indigo-50 border border-indigo-500/30 shadow-sm'}`}>
                <ReactMarkdown
                  components={{
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
          {isLoading && <div className="text-slate-400 text-sm italic animate-pulse">The Guide is analyzing...</div>}
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
              disabled={isInitializing}
            />
            <button 
              onClick={handleSendMessage}
              disabled={isLoading || isInitializing}
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
          <button 
            onClick={handleVerifyCode}
            disabled={isInitializing}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white px-3 py-1 text-sm rounded transition-colors shadow-lg shadow-emerald-900/20"
          >
            Verify Code Context
          </button>
        </div>
        <textarea 
          className="flex-1 w-full p-4 bg-[#1e1e1e] text-emerald-400 font-mono text-sm resize-none focus:outline-none disabled:opacity-50"
          placeholder="# Type your code here..."
          value={codeDraft}
          onChange={(e) => setCodeDraft(e.target.value)}
          spellCheck="false"
          disabled={isInitializing}
        />
      </div>
    </div>
  );
};

export default Workspace;

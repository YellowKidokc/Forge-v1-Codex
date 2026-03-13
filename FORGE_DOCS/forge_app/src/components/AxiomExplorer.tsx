import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Search, BookOpen, Database, RefreshCw } from "lucide-react";

interface Axiom {
  id: string;
  title: string;
  content: string;
}

const AxiomExplorer = () => {
  const [axioms] = useState<Axiom[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<string>("Disconnected");

  const connectAndFetch = async () => {
    setLoading(true);
    try {
      const status: string = await invoke("connect_db");
      setDbStatus(status);
      // Once connected, we will call get_axioms
      // For now we show the status
    } catch (err) {
      setDbStatus(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-black/20 p-3 rounded border border-forge-steel">
        <div className="flex items-center gap-3">
          <Database size={16} className={dbStatus.includes("Connected") ? "text-green-500" : "text-gray-500"} />
          <span className="text-[10px] font-mono uppercase tracking-tighter text-gray-400">{dbStatus}</span>
        </div>
        <button 
          onClick={connectAndFetch}
          disabled={loading}
          className="hover:text-forge-ember transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
        <input 
          placeholder="Search Axioms..."
          className="w-full bg-black/40 border border-forge-steel p-2 pl-10 rounded text-sm outline-none focus:border-forge-ember transition-colors font-sans"
        />
      </div>
      
      <div className="space-y-3">
        {axioms.length === 0 && !loading && (
          <div className="text-center py-10 border border-dashed border-forge-steel rounded">
            <p className="text-xs text-gray-600 uppercase font-bold tracking-widest">No Data Synchronized</p>
            <p className="text-[10px] text-gray-700 mt-1">Connect to NAS to pull the Logos Field</p>
          </div>
        )}
        {axioms.map(axiom => (
          <div key={axiom.id} className="p-4 bg-black/20 border border-forge-steel rounded hover:border-forge-ember/50 transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] text-forge-ember font-mono font-bold uppercase">{axiom.id}</span>
              <BookOpen size={14} className="text-gray-600 group-hover:text-forge-ember transition-colors" />
            </div>
            <h4 className="text-sm font-bold mb-1">{axiom.title}</h4>
            <p className="text-xs text-gray-500 leading-relaxed">{axiom.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AxiomExplorer;

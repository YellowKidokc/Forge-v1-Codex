import type { Axiom } from '@/types';
import { cn } from '@/lib/utils';
import { getGraphData } from '@/data/axioms';
import { 
  Calculator, 
  FileEdit, 
  Code, 
  ChevronRight
} from 'lucide-react';

interface RightContextPanelProps {
  axiom: Axiom | undefined;
  onSelectAxiom: (id: string) => void;
}

export function RightContextPanel({ axiom, onSelectAxiom }: RightContextPanelProps) {
  if (!axiom) {
    return (
      <aside className="w-[320px] bg-card border-l border-border flex flex-col shrink-0 animate-slide-in-right">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Select an axiom</p>
        </div>
      </aside>
    );
  }

  const graphData = getGraphData(axiom.id);

  return (
    <aside className="w-[320px] bg-card border-l border-border flex flex-col shrink-0 overflow-y-auto custom-scrollbar animate-slide-in-right">
      {/* Metadata Card */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Metadata
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Object</span>
            <span className="text-sm text-foreground">{axiom.category.charAt(0).toUpperCase() + axiom.category.slice(1)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stage</span>
            <span className="text-sm text-foreground">Definition {axiom.stage}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">CR</span>
            <span className={cn(
              'text-sm font-medium',
              axiom.analytics.crRating === 'Critical' && 'text-red-400',
              axiom.analytics.crRating === 'High' && 'text-amber-400',
              axiom.analytics.crRating === 'Medium' && 'text-blue-400',
              axiom.analytics.crRating === 'Low' && 'text-emerald-400',
            )}>
              {axiom.analytics.crRating}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bridge</span>
            <span className="text-sm text-gold">{axiom.analytics.bridgeScore}/10</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Conflicts</span>
            <span className="text-sm text-foreground">{axiom.analytics.contradictions}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {axiom.tags.map((tag, idx) => (
            <span 
              key={idx}
              className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Dependency Graph */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Dependency Graph
        </h3>
        
        <div className="relative h-48 bg-background rounded-lg border border-border overflow-hidden">
          {/* SVG Graph */}
          <svg className="w-full h-full" viewBox="0 0 300 200">
            {/* Edges */}
            {graphData.edges.map((edge, idx) => {
              const fromNode = graphData.nodes.find(n => n.id === edge.from);
              const toNode = graphData.nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              
              return (
                <line
                  key={idx}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="hsl(45 80% 52% / 0.3)"
                  strokeWidth="1"
                  strokeDasharray={edge.type === 'depends' ? '4 2' : 'none'}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="4"
                refX="5"
                refY="2"
                orient="auto"
              >
                <polygon
                  points="0 0, 6 2, 0 4"
                  fill="hsl(45 80% 52% / 0.5)"
                />
              </marker>
            </defs>
            
            {/* Nodes */}
            {graphData.nodes.map((node) => (
              <g 
                key={node.id}
                className="cursor-pointer"
                onClick={() => onSelectAxiom(node.id)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.type === 'current' ? 20 : 15}
                  fill={node.type === 'current' ? 'hsl(45 80% 52%)' : 'hsl(0 0% 10%)'}
                  stroke={node.type === 'current' ? 'hsl(45 80% 52%)' : 'hsl(0 0% 20%)'}
                  strokeWidth="2"
                  className="transition-all duration-200 hover:stroke-gold"
                />
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fill={node.type === 'current' ? 'black' : 'white'}
                  fontSize="10"
                  fontWeight="500"
                >
                  {node.id}
                </text>
              </g>
            ))}
          </svg>
          
          {/* Legend */}
          <div className="absolute bottom-2 left-2 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gold" />
              <span className="text-muted-foreground">Current</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted border border-border" />
              <span className="text-muted-foreground">Related</span>
            </div>
          </div>
        </div>
        
        {/* Current Path */}
        <div className="mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 flex-wrap">
            {axiom.dependencies.slice(0, 2).map((dep) => (
              <span key={dep}>
                <button 
                  onClick={() => onSelectAxiom(dep)}
                  className="text-gold hover:underline"
                >
                  {dep}
                </button>
                <ChevronRight className="w-3 h-3 inline mx-1" />
              </span>
            ))}
            <span className="text-gold font-medium">{axiom.id}</span>
            {axiom.enables.slice(0, 2).map((en) => (
              <span key={en.id}>
                <ChevronRight className="w-3 h-3 inline mx-1" />
                <button 
                  onClick={() => onSelectAxiom(en.id)}
                  className="text-gold hover:underline"
                >
                  {en.id}
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bridge Strength */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Bridge Strength
        </h3>
        
        <div className="flex items-end justify-between h-24 gap-2">
          {[
            { name: 'Phy', value: 85, color: '#22c55e' },
            { name: 'Theo', value: 70, color: '#8b5cf6' },
            { name: 'Con', value: 45, color: '#ec4899' },
            { name: 'QM', value: 60, color: '#3b82f6' },
            { name: 'Scr', value: 75, color: '#f59e0b' },
            { name: 'Evd', value: 55, color: '#10b981' },
            { name: 'Info', value: 90, color: '#f97316' },
          ].map((item) => (
            <div key={item.name} className="flex flex-col items-center gap-1 flex-1">
              <div 
                className="w-full rounded-t-sm transition-all duration-500"
                style={{ 
                  height: `${item.value}%`,
                  backgroundColor: item.color,
                  opacity: 0.8,
                }}
              />
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Quick Actions
        </h3>
        
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors duration-150 group">
            <Calculator className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
            <span className="text-sm text-foreground">Run Math Sim</span>
          </button>
          
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors duration-150 group">
            <FileEdit className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
            <span className="text-sm text-foreground">Edit in Markdown</span>
          </button>
          
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors duration-150 group">
            <Code className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
            <span className="text-sm text-foreground">View Raw JSON</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

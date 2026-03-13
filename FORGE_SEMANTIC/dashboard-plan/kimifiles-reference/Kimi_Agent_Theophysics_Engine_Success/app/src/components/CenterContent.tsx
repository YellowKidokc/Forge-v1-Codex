import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, AlertTriangle } from 'lucide-react';
import type { Axiom } from '@/types';
import { cn } from '@/lib/utils';

interface CenterContentProps {
  axiom: Axiom | undefined;
}

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: string;
}

function CollapsibleSection({ title, icon, children, defaultExpanded = false, badge }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-4 px-6 hover:bg-muted/20 transition-colors duration-150"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge && (
            <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-4 animate-accordion-down">
          {children}
        </div>
      )}
    </div>
  );
}

export function CenterContent({ axiom }: CenterContentProps) {

  if (!axiom) {
    return (
      <main className="flex-1 bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Select an axiom to view details</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-background overflow-y-auto custom-scrollbar animate-fade-in">
      {/* Axiom Header */}
      <div className="px-8 py-6 border-b border-border">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span className="hover:text-gold cursor-pointer transition-colors">Master Index</span>
          <span>→</span>
          <span className="hover:text-gold cursor-pointer transition-colors">Spine</span>
          <span>→</span>
          <span className="text-gold">{axiom.id}</span>
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
          {axiom.id} — {axiom.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Chain Position: {axiom.chainPosition} of 188</span>
          <span>•</span>
          <span>Stage {axiom.stage}</span>
          <span>•</span>
          <span className={cn(
            'capitalize',
            axiom.tier === 'primitive' && 'text-emerald-400',
            axiom.tier === 'definition' && 'text-purple-400',
            axiom.tier === 'lemma' && 'text-amber-400',
          )}>
            {axiom.tier}
          </span>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-8 py-4 bg-card/50 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className={cn(
                'text-sm font-medium px-2 py-0.5 rounded-full',
                axiom.status === 'validated' && 'bg-emerald-500/20 text-emerald-400',
                axiom.status === 'draft' && 'bg-amber-500/20 text-amber-400',
                axiom.status === 'review' && 'bg-blue-500/20 text-blue-400',
                axiom.status === 'critical' && 'bg-red-500/20 text-red-400',
              )}>
                {axiom.status}
              </span>
            </div>

            {/* Domain */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Domain:</span>
              <span className="text-sm text-foreground">{axiom.domain}</span>
            </div>

            {/* Dependencies Count */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Depends On:</span>
              <span className="text-sm text-foreground">{axiom.dependencies.length} axioms</span>
            </div>

            {/* Enables Count */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Enables:</span>
              <span className="text-sm text-foreground">{axiom.enables.length} axioms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="border-b border-border">
        {/* Assumes */}
        <CollapsibleSection 
          title="Assumes" 
          badge={`${axiom.assumes.length}/${axiom.assumes.length} Validated`}
          defaultExpanded={true}
        >
          <div className="space-y-3">
            {axiom.assumes.map((assumption) => (
              <div key={assumption.id} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  assumption.validated ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                )}>
                  {assumption.validated ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{assumption.title}</span>
                    {assumption.validated && (
                      <span className="text-xs text-emerald-400">Validated</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{assumption.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Formal Statement */}
        <CollapsibleSection title="Formal Statement" defaultExpanded={true}>
          <div className="space-y-4">
            <p className="text-foreground">{axiom.formalStatement}</p>
            {axiom.formalStatementMath && (
              <div className="math-block">
                <code className="text-gold">{axiom.formalStatementMath}</code>
              </div>
            )}
            
            {/* Spine Master Mappings */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Spine Master Mappings</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Domain</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Mapping</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {axiom.mappings.map((mapping, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <span className={cn(
                            'inline-flex items-center gap-1.5',
                            mapping.domain === 'Physics' && 'text-cyan-400',
                            mapping.domain === 'Theology' && 'text-purple-400',
                            mapping.domain === 'Consciousness' && 'text-pink-400',
                            mapping.domain === 'Quantum' && 'text-blue-400',
                            mapping.domain === 'Scripture' && 'text-amber-400',
                            mapping.domain === 'Evidence' && 'text-emerald-400',
                            mapping.domain === 'Information' && 'text-orange-400',
                          )}>
                            {mapping.domain}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-foreground">{mapping.mapping}</td>
                        <td className="py-2 px-3">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            mapping.status === 'grounded' && 'bg-emerald-500/20 text-emerald-400',
                            mapping.status === 'scripture' && 'bg-purple-500/20 text-purple-400',
                            mapping.status === 'suggest' && 'bg-amber-500/20 text-amber-400',
                            mapping.status === 'empirical' && 'bg-blue-500/20 text-blue-400',
                            mapping.status === 'shannon' && 'bg-orange-500/20 text-orange-400',
                          )}>
                            {mapping.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{mapping.source || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Enables */}
        <CollapsibleSection title="Enables (Forward Links)" badge={`${axiom.enables.length}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {axiom.enables.map((enable) => (
              <div key={enable.id} className="p-4 bg-card rounded-lg border border-border hover:border-gold/50 transition-colors duration-150">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gold font-mono text-sm">{enable.id}</span>
                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                    {enable.type}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-foreground mb-1">{enable.title}</h4>
                <p className="text-xs text-muted-foreground">{enable.description}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Objections */}
        {axiom.objections.length > 0 && (
          <CollapsibleSection title="Objections" badge={`${axiom.objections.length}`}>
            <div className="space-y-4">
              {axiom.objections.map((objection) => (
                <div key={objection.id} className="border border-border rounded-lg overflow-hidden">
                  {/* Objection Header */}
                  <div className="flex items-center gap-3 p-4 bg-red-500/5 border-b border-border">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-sm font-medium shrink-0">
                      {objection.id}
                    </div>
                    <span className="text-sm font-medium text-foreground">{objection.title}</span>
                  </div>
                  
                  {/* Objection Content */}
                  <div className="p-4 space-y-4">
                    <div>
                      <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Objection:</span>
                      <p className="text-sm text-muted-foreground mt-1">{objection.objection}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Response:</span>
                      <p className="text-sm text-muted-foreground mt-1">{objection.response}</p>
                    </div>
                    {objection.suggestion && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <span className="text-xs font-medium text-amber-400">{objection.suggestion}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Defeat Conditions */}
        {axiom.defeatConditions.length > 0 && (
          <CollapsibleSection title="Defeat Conditions (Falsifiability)">
            <div className="space-y-2">
              {axiom.defeatConditions.map((condition, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                  <span className="text-sm text-foreground">{condition.condition}</span>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    condition.status === 'no-empirical-defeat' && 'bg-emerald-500/20 text-emerald-400',
                    condition.status === 'open' && 'bg-amber-500/20 text-amber-400',
                    condition.status === 'resolved' && 'bg-blue-500/20 text-blue-400',
                  )}>
                    {condition.status.replace(/-/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Analytics */}
        <CollapsibleSection title="Analytics" badge={`L{axiom.stage} A{axiom.id.split('.')[0].slice(1)}`}>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-card rounded-lg border border-border text-center">
              <div className="text-2xl font-bold text-red-400">{axiom.analytics.contradictions}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Contradictions</div>
            </div>
            <div className="p-4 bg-card rounded-lg border border-border text-center">
              <div className="text-2xl font-bold text-gold">{axiom.analytics.bridgeScore}/10</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Bridge Score</div>
            </div>
            <div className="p-4 bg-card rounded-lg border border-border text-center">
              <div className={cn(
                'text-2xl font-bold',
                axiom.analytics.crRating === 'Critical' && 'text-red-400',
                axiom.analytics.crRating === 'High' && 'text-amber-400',
                axiom.analytics.crRating === 'Medium' && 'text-blue-400',
                axiom.analytics.crRating === 'Low' && 'text-emerald-400',
              )}>
                {axiom.analytics.crRating}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">CR Rating</div>
            </div>
          </div>
          
          {/* Co-occurrence Analysis */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-foreground mb-4">Co-occurrence Analysis</h4>
            <div className="space-y-3">
              {axiom.analytics.cooccurrence.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-24">{item.name}</span>
                  <div className="flex-1 analytics-bar">
                    <div 
                      className="analytics-bar-fill"
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <span className="text-sm text-foreground w-10 text-right">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Footer */}
      <div className="px-8 py-4 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Master Index</span>
          <span>•</span>
          <span>Theophysics Note Engine</span>
          <span>•</span>
          <span>Template: {axiom.id} {axiom.title}</span>
        </div>
      </div>
    </main>
  );
}

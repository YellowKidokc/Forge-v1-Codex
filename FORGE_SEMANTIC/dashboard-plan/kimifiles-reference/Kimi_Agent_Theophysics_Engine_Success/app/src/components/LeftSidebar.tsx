import { ChevronDown, ChevronRight } from 'lucide-react';
import { categories } from '@/data/axioms';
import { cn } from '@/lib/utils';

interface LeftSidebarProps {
  selectedAxiomId: string;
  onSelectAxiom: (id: string) => void;
  expandedCategories: string[];
  onToggleCategory: (id: string) => void;
}

export function LeftSidebar({
  selectedAxiomId,
  onSelectAxiom,
  expandedCategories,
  onToggleCategory,
}: LeftSidebarProps) {
  return (
    <aside className="w-[280px] bg-card border-r border-border flex flex-col shrink-0 animate-slide-in-left">
      {/* Sidebar Header */}
      <div className="h-10 flex items-center px-4 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Master Index
        </span>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {categories.map((category) => {
          const isExpanded = expandedCategories.includes(category.id);
          
          return (
            <div key={category.id} className="border-b border-border last:border-b-0">
              {/* Category Header */}
              <button
                onClick={() => onToggleCategory(category.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors duration-150"
              >
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {category.name}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>

              {/* Category Items */}
              {isExpanded && (
                <div className="pb-2">
                  {category.items.map((item) => {
                    const isSelected = selectedAxiomId === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectAxiom(item.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-left transition-all duration-150',
                          isSelected
                            ? 'bg-gold/10 border-l-2 border-gold'
                            : 'hover:bg-muted/30 border-l-2 border-transparent'
                        )}
                      >
                        {/* Chain Position */}
                        <span className={cn(
                          'text-xs font-mono w-6 text-right',
                          isSelected ? 'text-gold' : 'text-muted-foreground'
                        )}>
                          {String(item.chainPosition).padStart(3, '0')}
                        </span>

                        {/* Axiom ID & Title */}
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            'text-sm font-medium truncate',
                            isSelected ? 'text-gold' : 'text-foreground'
                          )}>
                            {item.id} — {item.title}
                          </div>
                        </div>

                        {/* Status Indicator */}
                        <div className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          item.status === 'validated' && 'bg-emerald-500',
                          item.status === 'draft' && 'bg-amber-500',
                          item.status === 'review' && 'bg-blue-500',
                          item.status === 'critical' && 'bg-red-500'
                        )} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="h-8 flex items-center justify-center border-t border-border">
        <span className="text-xs text-muted-foreground">
          188 Axioms Loaded
        </span>
      </div>
    </aside>
  );
}

import { Search, Settings, User, Sparkles } from 'lucide-react';

export function Header() {
  return (
    <header className="h-14 bg-background border-b border-border flex items-center justify-between px-4 shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          <span className="font-serif text-xl font-bold tracking-wide text-gold">
            THEOPHYSICS
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="hidden md:flex items-center gap-1">
        {['The Crisis', 'The Mechanism', 'The Evidence', 'The Reality'].map((item, index) => (
          <button
            key={item}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-md
              ${index === 0 
                ? 'text-gold bg-gold/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors duration-150">
          <Search className="w-4 h-4" />
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors duration-150">
          <Settings className="w-4 h-4" />
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors duration-150">
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

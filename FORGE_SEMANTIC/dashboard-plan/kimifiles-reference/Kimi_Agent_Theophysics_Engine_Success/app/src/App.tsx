import { useState } from 'react';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import { CenterContent } from '@/components/CenterContent';
import { RightContextPanel } from '@/components/RightContextPanel';
import { getAxiomById } from '@/data/axioms';

function App() {
  const [selectedAxiomId, setSelectedAxiomId] = useState<string>('D1.2');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['axioms', 'definitions', 'lemmas']);

  const selectedAxiom = getAxiomById(selectedAxiomId);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          selectedAxiomId={selectedAxiomId}
          onSelectAxiom={setSelectedAxiomId}
          expandedCategories={expandedCategories}
          onToggleCategory={toggleCategory}
        />

        {/* Center Content */}
        <CenterContent axiom={selectedAxiom} />

        {/* Right Context Panel */}
        <RightContextPanel axiom={selectedAxiom} onSelectAxiom={setSelectedAxiomId} />
      </div>
    </div>
  );
}

export default App;

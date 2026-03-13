import type { FC, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'left' | 'right';
}

const PanelContainer: FC<PanelProps> = ({ isOpen, onClose, title, children, side = 'right' }) => {
  const isRight = side === 'right';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ x: isRight ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRight ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 ${isRight ? 'right-0' : 'left-0'} w-1/3 h-screen bg-forge-iron border-${isRight ? 'l' : 'r'} border-forge-steel shadow-2xl z-50 flex flex-col`}
          >
            <div className="p-6 border-b border-forge-steel flex justify-between items-center">
              <h3 className="text-forge-ember font-black uppercase tracking-widest text-sm">{title}</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PanelContainer;

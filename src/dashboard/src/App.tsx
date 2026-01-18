import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardLayout from './components/DashboardLayout';
import TheSoul from './components/TheSoul';
import TheMap from './components/TheMap';
import ThePulse from './components/ThePulse';

type View = 'soul' | 'map' | 'pulse';

function App() {
  const [currentView, setCurrentView] = useState<View>('soul');

  return (
    <DashboardLayout currentView={currentView} onViewChange={setCurrentView}>
      <AnimatePresence mode="wait">
        {currentView === 'soul' && (
          <motion.div
            key="soul"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <TheSoul />
          </motion.div>
        )}
        {currentView === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <TheMap />
          </motion.div>
        )}
        {currentView === 'pulse' && (
          <motion.div
            key="pulse"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <ThePulse />
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

export default App;




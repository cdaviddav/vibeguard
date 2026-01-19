import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardLayout from './components/DashboardLayout';
import TheSoul from './components/TheSoul';
import TheMap from './components/TheMap';
import ThePulse from './components/ThePulse';

type View = 'soul' | 'map' | 'pulse';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.25,
  ease: [0.25, 0.1, 0.25, 1],
};

function App() {
  const [currentView, setCurrentView] = useState<View>('soul');

  return (
    <DashboardLayout currentView={currentView} onViewChange={setCurrentView}>
      <AnimatePresence mode="wait">
        {currentView === 'soul' && (
          <motion.div
            key="soul"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <TheSoul />
          </motion.div>
        )}
        {currentView === 'map' && (
          <motion.div
            key="map"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <TheMap />
          </motion.div>
        )}
        {currentView === 'pulse' && (
          <motion.div
            key="pulse"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <ThePulse />
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

export default App;

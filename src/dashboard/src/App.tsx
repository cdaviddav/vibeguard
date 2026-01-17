import { useState } from 'react';
import DashboardLayout from './components/DashboardLayout';
import TheSoul from './components/TheSoul';
import TheMap from './components/TheMap';
import ThePulse from './components/ThePulse';

type View = 'soul' | 'map' | 'pulse';

function App() {
  const [currentView, setCurrentView] = useState<View>('soul');

  return (
    <DashboardLayout currentView={currentView} onViewChange={setCurrentView}>
      {currentView === 'soul' && <TheSoul />}
      {currentView === 'map' && <TheMap />}
      {currentView === 'pulse' && <ThePulse />}
    </DashboardLayout>
  );
}

export default App;


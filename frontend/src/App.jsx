import DrawingCanvas from "./canvas/components/Canvas";
import "./styles/globals.css";
import { LayersProvider } from "./context/LayersContext";

function App() {
  return (
    <div>
      <h1>Scaffold</h1>
      <LayersProvider>
        <DrawingCanvas />
      </LayersProvider>
    </div>
  );
}

export default App;
import { useCallback, useMemo, useState } from "react";
import { LayersContext } from "./layers-context";

export function LayersProvider({ children }) {
  const [layers, setLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);

  const addLayer = useCallback((name) => {
    const newLayer = {
      id: Date.now().toString(),
      name,
      visible: true,
      objects: [],
    };
    setLayers((prevLayers) => [...prevLayers, newLayer]);
    setActiveLayerId(newLayer.id);
    return newLayer.id;
  }, []);

  const toggleLayerVisibility = useCallback((id) => {
    setLayers((prevLayers) =>
      prevLayers.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    );
  }, []);

  const setActiveLayer = useCallback((id) => {
    setActiveLayerId(id);
  }, []);

  const addObjectToLayer = useCallback((obj, layerId) => {
    if (!obj || !layerId) return;

    setLayers((prevLayers) =>
      prevLayers.map((layer) =>
        layer.id === layerId
          ? { ...layer, objects: [...(layer.objects || []), obj] }
          : layer
      )
    );
  }, []);

  const removeObjectFromLayers = useCallback((obj) => {
    if (!obj) return;

    setLayers((prevLayers) =>
      prevLayers.map((layer) => ({
        ...layer,
        objects: (layer.objects || []).filter((item) => item !== obj),
      }))
    );
  }, []);

  const value = useMemo(
    () => ({
      layers,
      setLayers,
      activeLayerId,
      setActiveLayerId,
      addLayer,
      toggleLayerVisibility,
      setActiveLayer,
      addObjectToLayer,
      removeObjectFromLayers,
    }),
    [
      layers,
      activeLayerId,
      addLayer,
      toggleLayerVisibility,
      setActiveLayer,
      addObjectToLayer,
      removeObjectFromLayers,
    ]
  );

  return (
    <LayersContext.Provider value={value}>
      {children}
    </LayersContext.Provider>
  );
}

import React, { useState } from 'react';
import CrearSolicitud from './components/CrearSolicitud';
import AgregarMateriales from './components/AgregarMateriales';

function App() {
  const [paso, setPaso] = useState(1);
  const [solicitudId, setSolicitudId] = useState(null);

  const handleSiguiente = (id) => {
    setSolicitudId(id);
    setPaso(2);
  };

  return (
    <div>
      {paso === 1 && <CrearSolicitud onSiguiente={handleSiguiente} />}
      {paso === 2 && <AgregarMateriales solicitudId={solicitudId} />}
    </div>
  );
}

export default App;

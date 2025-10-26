import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
} from '@mui/material';

const CrearSolicitud = ({ onSiguiente }) => {
  const [centros, setCentros] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [formState, setFormState] = useState({
    centro: '',
    almacen_virtual: '',
    centro_costos: '',
    criticidad: 'Normal',
    fecha_necesidad: '',
    justificacion: '',
  });

  useEffect(() => {
    fetch('/api/catalogos/centros')
      .then((res) => res.json())
      .then((data) => setCentros(data))
      .catch((error) => console.error('Error fetching centros:', error));
  }, []);

  useEffect(() => {
    if (formState.centro) {
      fetch(`/api/catalogos/almacenes?centro=${formState.centro}`)
        .then((res) => res.json())
        .then((data) => setAlmacenes(data))
        .catch((error) => console.error('Error fetching almacenes:', error));
    } else {
      fetch('/api/catalogos/almacenes')
        .then((res) => res.json())
        .then((data) => setAlmacenes(data))
        .catch((error) => console.error('Error fetching almacenes:', error));
    }
  }, [formState.centro]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      const data = await response.json();
      if (response.ok) {
        onSiguiente(data.id);
      } else {
        console.error('Error al crear la solicitud:', data.error);
      }
    } catch (error) {
      console.error('Error de red:', error);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom>
        Crear Solicitud
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Centro</InputLabel>
            <Select
              label="Centro"
              name="centro"
              value={formState.centro}
              onChange={handleChange}
            >
              {centros.map((centro) => (
                <MenuItem key={centro.codigo} value={centro.codigo}>
                  {centro.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Almacén</InputLabel>
            <Select
              label="Almacén"
              name="almacen_virtual"
              value={formState.almacen_virtual}
              onChange={handleChange}
            >
              {almacenes.map((almacen) => (
                <MenuItem key={almacen.codigo} value={almacen.codigo}>
                  {almacen.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Objeto de Imputación"
            name="centro_costos"
            value={formState.centro_costos}
            onChange={handleChange}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Criticidad</InputLabel>
            <Select
              label="Criticidad"
              name="criticidad"
              value={formState.criticidad}
              onChange={handleChange}
            >
              <MenuItem value="Normal">Normal</MenuItem>
              <MenuItem value="Alta">Alta</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="date"
            label="Fecha de Necesidad"
            name="fecha_necesidad"
            value={formState.fecha_necesidad}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Justificación"
            name="justificacion"
            value={formState.justificacion}
            onChange={handleChange}
            multiline
            rows={4}
          />
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            Continuar
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CrearSolicitud;

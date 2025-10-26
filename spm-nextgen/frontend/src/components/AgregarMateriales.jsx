import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';

const AgregarMateriales = ({ solicitudId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [carrito, setCarrito] = useState([]);

  const handleSearch = async () => {
    try {
      const response = await fetch(`/api/materiales?q=${searchTerm}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error buscando materiales:', error);
    }
  };

  const handleAddToCarrito = (material) => {
    setCarrito((prev) => [...prev, { ...material, cantidad: 1 }]);
  };

  const handleRemoveFromCarrito = (codigo) => {
    setCarrito((prev) => prev.filter((item) => item.codigo !== codigo));
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Agregar Materiales a la Solicitud #{solicitudId}
      </Typography>

      <Grid container spacing={2} alignItems="center" style={{ marginBottom: '2rem' }}>
        <Grid item xs={12} sm={8}>
          <TextField
            fullWidth
            label="Buscar material por código o descripción"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button variant="contained" color="primary" onClick={handleSearch}>
            Buscar
          </Button>
        </Grid>
      </Grid>

      {searchResults.length > 0 && (
        <>
          <Typography variant="h5" component="h2" gutterBottom>
            Resultados de la Búsqueda
          </Typography>
          <TableContainer component={Paper} style={{ marginBottom: '2rem' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.map((material) => (
                  <TableRow key={material.codigo}>
                    <TableCell>{material.codigo}</TableCell>
                    <TableCell>{material.descripcion}</TableCell>
                    <TableCell>{material.unidad}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleAddToCarrito(material)}>
                        <AddCircleIcon color="primary" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Typography variant="h5" component="h2" gutterBottom>
        Materiales en la Solicitud
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Cantidad</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {carrito.map((item) => (
              <TableRow key={item.codigo}>
                <TableCell>{item.codigo}</TableCell>
                <TableCell>{item.descripcion}</TableCell>
                <TableCell>
                  <TextField type="number" value={item.cantidad} style={{ width: '80px' }} />
                </TableCell>
                <TableCell>{item.unidad}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleRemoveFromCarrito(item.codigo)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default AgregarMateriales;

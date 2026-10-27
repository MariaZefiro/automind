import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';
import './styles/index.css';

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#4357d8' }, background: { default: '#f6f7fb', paper: '#ffffff' } },
  typography: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  shape: { borderRadius: 12 },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter><App /></BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);

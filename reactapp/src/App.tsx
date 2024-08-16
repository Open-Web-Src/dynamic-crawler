import { Box, CircularProgress } from '@mui/material';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import { Dashboard } from './pages/dashboard';
import DetailsWrapper from './pages/property-details/Details';
import { DashboardTableData } from './types/dashboard-table-data';

interface AppState {
  data: DashboardTableData[];
  err: string;
  loading: boolean;
}

class App extends React.Component<{}, AppState> {

  render() {
    return (
      <div>
        <BrowserRouter>
          <Routes>

            <Route index element={<Dashboard />}></Route>

            <Route path="/properties/:id" element={<DetailsWrapper />}></Route>
          </Routes>
        </BrowserRouter>
      </div>
    );
  }
}

export default App;

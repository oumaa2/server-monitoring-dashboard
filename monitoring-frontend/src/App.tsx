import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Layout } from './app/components/layout';
import Dashboard from './app/pages/dashboard';
import Servers from './app/pages/servers';
import Applications from './app/pages/applications';
import Databases from './app/pages/databases';
import Alerts from './app/pages/alerts';
import Logs from './app/pages/logs';
import Settings from './app/pages/settings';
import './styles/index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/servers" element={<Servers />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/databases" element={<Databases />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

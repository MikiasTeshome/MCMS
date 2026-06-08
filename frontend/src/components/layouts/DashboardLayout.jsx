import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark-950 text-slate-200 relative">
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Dynamic left sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content pane context */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Universal Top Bar */}
        <Header onMenuToggle={() => setSidebarOpen(true)} />

        {/* Dynamic Nested View Routing Canvas */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-8 bg-dark-950">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

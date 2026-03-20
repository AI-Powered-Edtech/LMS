import React from 'react';
import { BuilderSidebar } from '@/src/components/CourseBuilder/BuilderSidebar';
import { BuilderTopBar } from '@/src/components/CourseBuilder/BuilderTopBar';
import { BuilderProvider } from '@/src/contexts/BuilderContext';
import { BrowserRouter } from 'react-router-dom';

export default function TestAria() {
  return (
    <BrowserRouter>
      <BuilderProvider>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <BuilderTopBar />
          <div style={{ flex: 1, display: 'flex' }}>
            <BuilderSidebar />
          </div>
        </div>
      </BuilderProvider>
    </BrowserRouter>
  );
}

import { BuilderSidebar } from '@/src/components/CourseBuilder/BuilderSidebar';
import { BuilderTopBar } from '@/src/components/CourseBuilder/BuilderTopBar';
import { BuilderProvider } from '@/src/contexts/BuilderContext';

export default function TestAriaPage() {
  return (
    <BuilderProvider>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <BuilderTopBar />
        <div style={{ flex: 1, display: 'flex' }}>
          <BuilderSidebar />
        </div>
      </div>
    </BuilderProvider>
  );
}

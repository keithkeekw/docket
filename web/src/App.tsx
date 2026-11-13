import { ComponentGallery } from './components/ComponentGallery';
import { PrelineInit } from './components/PrelineInit';

export default function App() {
  return (
    <div className="min-h-full bg-zinc-50">
      <PrelineInit />
      <ComponentGallery />
    </div>
  );
}

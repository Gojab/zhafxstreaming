import { PillBase } from '@/components/ui/3d-adaptive-navigation-bar';
import GradientMenu from '@/components/ui/gradient-menu';

export function DemoOne() {
  return (
    <div className="flex w-full h-screen justify-center items-center bg-[#06070B]">
      <GradientMenu isGlass={true} />
    </div>
  );
}

export default function Demo() {
  return (
    <div 
      style={{ 
        background: '#06070B',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '40px',
      }}
    >
      <PillBase theme="dark" />
      <GradientMenu isGlass={true} />
    </div>
  );
}

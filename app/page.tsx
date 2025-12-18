import Link from 'next/link';
import { Ruler } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-black/80 backdrop-blur-md p-4 border border-white/10">
            <Ruler className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">MeasureLab</h1>
        <p className="text-lg text-gray-600 mb-8">Professional measurement and takeoff tool</p>
        <Link
          href="/measure"
          className="inline-block px-6 py-3 bg-black/80 backdrop-blur-md text-white hover:bg-black/90 transition-colors font-medium border border-white/10 shadow-lg"
        >
          Open Measure Tool
        </Link>
      </div>
    </div>
  );
}


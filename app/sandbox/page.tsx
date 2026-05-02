import Link from 'next/link';
import { Calendar, UserPlus, ArrowRight, PlayCircle, Star, MapPin } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-200 dark:selection:bg-blue-900 transition-colors duration-300">
      
      {/* NAVIGATION */}
      <nav className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50 transition-colors duration-300">
        <div className="font-black text-2xl tracking-tight uppercase">
          CYT <span className="text-blue-600 dark:text-blue-500">Fredericksburg</span>
        </div>
        <div className="hidden md:flex gap-6 font-bold text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Shows</Link>
          <Link href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Classes</Link>
          <Link href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">About</Link>
        </div>
        <button className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2 rounded-lg font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-300 transition-all shadow-sm">
          Family Login
        </button>
      </nav>

      {/* HERO SECTION */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-sm uppercase tracking-wide border border-blue-200/50 dark:border-blue-800/50">
            <Star size={16} /> Spring 2026 Season
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight">
            Take the stage. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
              Find your spotlight.
            </span>
          </h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl mx-auto">
            Join us for an unforgettable season of youth theater. Develop your skills, build lifelong friendships, and bring incredible stories to life.
          </p>
        </div>

        {/* ACTIVE PRODUCTION CARD */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-black/50 border border-zinc-200 dark:border-zinc-800 overflow-hidden relative transition-colors duration-300">
          
          {/* Top accent bar */}
          <div className="h-3 w-full bg-gradient-to-r from-blue-600 to-cyan-400 dark:from-blue-500 dark:to-cyan-400"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12">
            
            {/* Show Info */}
            <div className="space-y-6 flex flex-col justify-center">
              <div>
                <h3 className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2">Now Casting</h3>
                <h2 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">The Little Mermaid</h2>
              </div>
              
              <p className="text-zinc-600 dark:text-zinc-300 text-lg leading-relaxed">
                Journey under the sea in our spectacular Spring 2026 mainstage production. We are looking for passionate actors, singers, and dancers of all experience levels to bring this classic tale to life.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                {/* 🟢 FIXED ROUTE HERE */}
                <Link 
                  href="/sandbox/audition-form" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 dark:shadow-blue-900/20 transition-all active:scale-95 group"
                >
                  <UserPlus size={20} />
                  Register to Audition
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                
                <Link 
                  href="#" 
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Calendar size={20} />
                  View Schedule
                </Link>
              </div>
            </div>

            {/* Quick Details Panel */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-700/50 space-y-6 transition-colors duration-300">
              <h4 className="font-bold text-xl text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-700 pb-4">Audition Details</h4>
              
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg text-blue-600 dark:text-blue-400 mt-1">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <strong className="block text-zinc-900 dark:text-white">Deadline to Register</strong>
                    <span className="text-zinc-500 dark:text-zinc-400">Wednesday, March 18th</span>
                  </div>
                </li>
                
                <li className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg text-blue-600 dark:text-blue-400 mt-1">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <strong className="block text-zinc-900 dark:text-white">Location</strong>
                    <span className="text-zinc-500 dark:text-zinc-400">Main Campus Rehearsal Hall</span>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg text-blue-600 dark:text-blue-400 mt-1">
                    <PlayCircle size={24} />
                  </div>
                  <div>
                    <strong className="block text-zinc-900 dark:text-white">Preparation</strong>
                    <span className="text-zinc-500 dark:text-zinc-400">1-minute vocal selection & short monologue required.</span>
                  </div>
                </li>
              </ul>
            </div>
            
          </div>
        </div>

      </main>
    </div>
  );
}
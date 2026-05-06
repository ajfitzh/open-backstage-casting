export default function GenericLoading() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-8 bg-zinc-800 rounded w-64 mb-2"></div>
          <div className="h-4 bg-zinc-900 rounded w-48"></div>
        </div>
        <div className="flex gap-4">
          <div className="h-10 bg-zinc-800 rounded w-32"></div>
          <div className="h-10 bg-zinc-800 rounded w-32"></div>
        </div>
      </div>

      {/* Grid Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main List Area Skeleton */}
        <div className="lg:col-span-2 space-y-4">
          <div className="h-12 bg-zinc-900 rounded-lg w-full mb-6"></div> {/* Search Bar */}
          
          {/* Fake Rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-800 rounded-full"></div>
                <div>
                  <div className="h-5 bg-zinc-800 rounded w-40 mb-2"></div>
                  <div className="h-4 bg-zinc-900 rounded w-24"></div>
                </div>
              </div>
              <div className="h-8 bg-zinc-900 rounded w-32"></div>
            </div>
          ))}
        </div>

        {/* Sidebar Analytics Skeleton */}
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl">
             <div className="h-6 bg-zinc-800 rounded w-3/4 mb-4"></div>
             <div className="h-24 bg-zinc-900 rounded w-full mb-4"></div>
             <div className="h-4 bg-zinc-900 rounded w-1/2"></div>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl">
             <div className="h-6 bg-zinc-800 rounded w-1/2 mb-4"></div>
             <div className="h-16 bg-zinc-900 rounded w-full"></div>
          </div>
        </div>

      </div>
    </div>
  );
}

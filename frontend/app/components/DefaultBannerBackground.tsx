export default function DefaultBannerBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient - Bordeaux with icy tones */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-red-900 to-rose-950"></div>

      {/* Frosted glass overlay effect */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>

      {/* Geometric shapes for depth - icy bordeaux tones */}
      <div className="absolute inset-0">
        {/* Large frosted circle top-right */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

        {/* Medium frosted circle bottom-left */}
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-rose-800/15 rounded-full blur-2xl"></div>

        {/* Small accent circle center */}
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white/8 rounded-full blur-2xl"></div>

        {/* Diagonal frosted stripe pattern */}
        <div className="absolute inset-0 opacity-[0.15]">
          <div className="absolute top-0 left-0 w-full h-full"
               style={{
                 backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(255,255,255,0.15) 60px, rgba(255,255,255,0.15) 120px)'
               }}>
          </div>
        </div>

        {/* Crystalline pattern overlay */}
        <div className="absolute inset-0">
          <div className="absolute top-10 right-1/4 w-32 h-32 bg-white/5 rotate-45 blur-xl"></div>
          <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-rose-700/10 -rotate-12 blur-xl"></div>
        </div>
      </div>

      {/* Gradient overlay for depth and elegance */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5"></div>

      {/* Final frosted glass layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/3 to-transparent"></div>
    </div>
  );
}

"use client"

interface VolumeBarProps {
  volume: number
  height: number
  width: number
  orientation: "vertical" | "horizontal"
  peakVolume?: number
  actualValue?: number
  showLabel?: boolean
}

export default function VolumeBar({
  volume,
  height,
  width,
  orientation,
  peakVolume,
  actualValue,
  showLabel = true,
}: VolumeBarProps) {
  // Calculate color based on volume
  const getColor = (vol: number) => {
    if (vol < 30) return "bg-green-500"
    if (vol < 70) return "bg-yellow-500"
    return "bg-red-500"
  }

  // For vertical orientation
  if (orientation === "vertical") {
    const displayVolume = actualValue !== undefined ? actualValue : volume
    const fillHeight = (displayVolume / 100) * height
    const barColor = getColor(displayVolume)

    return (
      <div
        className="relative rounded-lg overflow-hidden bg-gray-800/50"
        style={{ height: `${height}px`, width: `${width}px` }}
      >
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ${barColor}`}
          style={{ height: `${fillHeight}px` }}
        ></div>

        {/* Peak marker */}
        {peakVolume && (
          <div
            className="absolute left-0 right-0 h-1 bg-white"
            style={{ bottom: `${(peakVolume / 100) * height}px` }}
          ></div>
        )}

        {/* Volume segments */}
        <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-px bg-white/20"></div>
          ))}
        </div>

        {/* Current volume label */}
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white pointer-events-none">
            {Math.round(displayVolume)}
          </div>
        )}
      </div>
    )
  }

  // For horizontal orientation
  const fillWidth = (volume / 100) * width
  const barColor = getColor(volume)

  return (
    <div
      className="relative rounded-lg overflow-hidden bg-gray-800/50"
      style={{ height: `${height}px`, width: `${width}px` }}
    >
      <div
        className={`absolute top-0 bottom-0 left-0 transition-all duration-100 ${barColor}`}
        style={{ width: `${fillWidth}px` }}
      ></div>

      {/* Volume segments */}
      <div className="absolute inset-0 flex justify-between px-1 items-center pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="w-px h-full bg-white/20"></div>
        ))}
      </div>
    </div>
  )
}

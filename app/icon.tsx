import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: "#0b0c0a",
          border: "2px solid #ffb02e",
          color: "#ffb02e",
          fontSize: 14,
          letterSpacing: -0.5,
        }}
      >
        SV
      </div>
    ),
    size,
  )
}

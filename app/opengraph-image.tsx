import { ImageResponse } from "next/og"
import { portfolioData } from "@/lib/portfolio-data"

export const alt = `${portfolioData.personal.name}, ${portfolioData.personal.headline}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  const { name, headline, tagline } = portfolioData.personal

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 80px",
          background: "#0b0c0a",
          color: "#e9e7e1",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, color: "#ffb02e" }}>{headline}</div>
          <div style={{ marginTop: 26, fontSize: 92, letterSpacing: -3, lineHeight: 1 }}>{name}</div>
          <div style={{ marginTop: 30, fontSize: 34, lineHeight: 1.35, color: "#9d9b93", maxWidth: 940 }}>{tagline}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "22px 28px",
            borderRadius: 14,
            border: "2px solid #272923",
            background: "#121410",
            fontSize: 26,
          }}
        >
          <div style={{ display: "flex" }}>
            <span style={{ color: "#ffb02e" }}>127.0.0.1:6379&gt;</span>
            <span style={{ marginLeft: 14 }}>PING</span>
          </div>
          <div style={{ marginTop: 8, display: "flex" }}>PONG</div>
          <div style={{ marginTop: 14, display: "flex", color: "#9d9b93", fontSize: 22 }}>
            ForgeDB, my C++ database, running in your browser
          </div>
        </div>
      </div>
    ),
    size,
  )
}

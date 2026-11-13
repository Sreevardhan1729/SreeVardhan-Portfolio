import { spawnSync, execFileSync } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const script = resolve("scripts/check-banned-terms.sh")

// A throwaway repo with the script, two tracked files and a private term list in a fake HOME.
function setup({ withList = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "banned-terms-"))
  const home = join(dir, "home")
  const repo = join(dir, "repo")
  mkdirSync(join(home, ".config/portfolio-lab"), { recursive: true })
  mkdirSync(join(repo, "scripts"), { recursive: true })
  if (withList) writeFileSync(join(home, ".config/portfolio-lab/banned-terms.txt"), "secretcodename\n")
  copyFileSync(script, join(repo, "scripts/check-banned-terms.sh"))
  writeFileSync(join(repo, "a.txt"), "hello\n")
  writeFileSync(join(repo, "b.txt"), "goodbye\n")
  execFileSync("git", ["init", "-q"], { cwd: repo })
  execFileSync("git", ["add", "-A"], { cwd: repo })
  const run = () =>
    spawnSync("bash", [join(repo, "scripts/check-banned-terms.sh")], { env: { ...process.env, HOME: home }, encoding: "utf8" })
  return { repo, run, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

describe("check-banned-terms.sh", () => {
  it("passes a clean repo", () => {
    const { run, cleanup } = setup()
    expect(run().status).toBe(0)
    cleanup()
  })

  it("fails when a tracked file contains a listed term, in any case", () => {
    const { repo, run, cleanup } = setup()
    writeFileSync(join(repo, "a.txt"), "talks about SecretCodeName\n")
    expect(run().status).toBe(1)
    cleanup()
  })

  it("still fails on a hit when another tracked file was deleted but not staged", () => {
    const { repo, run, cleanup } = setup()
    execFileSync("git", ["add", "-A"], { cwd: repo })
    writeFileSync(join(repo, "a.txt"), "secretcodename\n")
    execFileSync("git", ["add", "a.txt"], { cwd: repo })
    rmSync(join(repo, "b.txt"))
    expect(run().status).toBe(1)
    cleanup()
  })

  it("checks untracked files under public/", () => {
    const { repo, run, cleanup } = setup()
    mkdirSync(join(repo, "public"))
    writeFileSync(join(repo, "public/data.json"), '{"note":"secretcodename"}\n')
    expect(run().status).toBe(1)
    cleanup()
  })

  it("refuses to run without the private list", () => {
    const { run, cleanup } = setup({ withList: false })
    expect(run().status).toBe(2)
    cleanup()
  })
})

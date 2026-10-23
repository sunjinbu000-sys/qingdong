const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve("miniprogram-1/miniprogram");
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name))
        : [path.join(dir, e.name)],
    );
}
test("native CommonJS imports resolve to a file without Node directory-index fallback", () => {
  for (const file of files(root).filter((p) => p.endsWith(".js")))
    for (const [, request] of fs
      .readFileSync(file, "utf8")
      .matchAll(/require\(["'](\.[^"']+)["']\)/g)) {
      const target = path.resolve(path.dirname(file), request);
      assert.ok(
        [target, target + ".js", target + ".json"].some(
          (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
        ),
        path.relative(root, file) +
          " imports " +
          request +
          " without an explicit module file",
      );
    }
});

test("packaged page images avoid local WebP and PNG files match their extension", () => {
  for (const file of files(path.join(root, "pages")).filter(p => p.endsWith(".wxml"))) {
    const source = fs.readFileSync(file, "utf8");
    assert(!/src=["'][^"']*\.webp["']/.test(source), path.relative(root, file) + " uses a local WebP image");
  }
  for (const file of files(path.join(root, "images")).filter(p => p.endsWith(".png"))) {
    assert.equal(fs.readFileSync(file).subarray(0, 8).toString("hex"), "89504e470d0a1a0a", path.relative(root, file));
  }
});

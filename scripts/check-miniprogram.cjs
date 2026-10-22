const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../miniprogram-1/miniprogram");
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
}
const files = walk(root);
const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
let errors = 0;
function check(condition, message) {
  if (!condition) {
    console.error(message);
    errors++;
  }
}
for (const file of files) {
  if (file.endsWith(".json")) {
    try {
      JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      check(false, file + ": " + e.message);
    }
  }
  if (file.endsWith(".js")) {
    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    check(result.status === 0, result.stderr);
  }
}
for (const page of app.pages) {
  for (const extension of [".js", ".json", ".wxml", ".wxss"])
    check(
      fs.existsSync(path.join(root, page + extension)),
      page + extension + " missing",
    );
  const markup = fs.readFileSync(path.join(root, page + ".wxml"), "utf8");
  check(
    !/\{\{[^}]*&(amp|lt|gt);/.test(markup),
    page + ": HTML entities inside WXML expressions are invalid",
  );
  for (const match of markup.matchAll(
    /data-url="(\/pages\/[^?"{]+)(?:\?[^"}]*)?"/g,
  ))
    check(
      app.pages.includes(match[1].slice(1)),
      page + ": unregistered route " + match[1],
    );
  for (const match of markup.matchAll(/(?:src|iconPath)="(\/images\/[^"{]+)"/g))
    check(
      fs.existsSync(path.join(root, match[1])),
      page + ": missing image " + match[1],
    );
}
for (const tab of app.tabBar.list) {
  check(app.pages.includes(tab.pagePath), "Unregistered tab " + tab.pagePath);
  for (const key of ["iconPath", "selectedIconPath"])
    check(
      fs.existsSync(path.join(root, tab[key])),
      "Missing tab icon " + tab[key],
    );
}
const compilerIndex = process.argv.indexOf("--wechat-compiler");
if (compilerIndex >= 0) {
  const directory = process.argv[compilerIndex + 1];
  for (const [name, extension] of [
    ["wcc.exe", ".wxml"],
    ["wcsc.exe", ".wxss"],
  ]) {
    const inputs = files
      .filter((f) => f.endsWith(extension))
      .map((f) => path.relative(root, f).replaceAll("\\", "/"));
    const result = spawnSync(path.join(directory, name), inputs, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    check(
      result.status === 0,
      name +
        ": " +
        (result.stderr ||
          (result.error && result.error.message) ||
          "compiler failed"),
    );
    if (result.status === 0 && extension === '.wxml') {
      try {
        const context = { window: {}, console };
        vm.createContext(context);
        vm.runInContext(result.stdout, context, { timeout: 10000 });
        for (const page of app.pages)
          check(typeof context.$gwx(page + '.wxml') === 'function', 'Compiled WXML missing: ' + page);
        console.log('Compiled WXML page registry checked: ' + app.pages.length + ' pages');
      } catch (error) { check(false, 'Cannot verify compiled WXML registry: ' + error.message); }
    }
    if (result.status === 0)
      console.log(name + ": PASS (" + inputs.length + " files)");
  }
}
if (errors) process.exitCode = 1;
else
  console.log(
    "PASS: " +
      app.pages.length +
      " pages; JSON, JavaScript syntax, route and asset checks.",
  );

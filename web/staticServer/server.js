const fs = require("fs");
const http = require("http");
const path = require("path");
const url = require("url");
const vm = require("vm");

const capsulePath = path.join(__dirname, "StaticServerCapsule.js");
const capsuleSource = fs.readFileSync(capsulePath, "utf8");

const StaticServerCapsule = vm.runInThisContext(
  capsuleSource + "\nStaticServerCapsule;",
  {
    filename: capsulePath
  }
);

const args = process.argv.slice(2);

function valueAfter(flag, fallback) {
  const index = args.indexOf(flag);
  if (index < 0) return fallback;
  if (index + 1 >= args.length) return fallback;
  return args[index + 1];
}

const webRoot = valueAfter("--webRoot", path.resolve(__dirname, ".."));
const port = Number(valueAfter("--port", process.env.VIBES_STATIC_PORT || 7102));
const host = valueAfter("--host", process.env.VIBES_STATIC_HOST || "localhost");

const result = StaticServerCapsule.createServer({
  modules: {
    fs,
    http,
    path,
    process,
    url
  },
  webRoot,
  port,
  host
});

result.server.listen(result.config.port, result.config.host, () => {
  StaticServerCapsule.printStartup(result, {
    process
  });
});

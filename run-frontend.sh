#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./run-frontend.sh dev|prod

  dev   Start the development bundle server with hot reloading (Ctrl+C to stop).
  prod  Build and select the production bundle, verify its assets, then exit.

Keep the Django/backend stack running and open Fragalysis on port 8080.
Stop other frontend servers/watchers before switching modes. The server port
(DEV_SERVER_PORT, default 3030) must be free; existing processes are never killed.
USAGE
}

if [[ $# -ne 1 ]]; then
  usage >&2
  exit 2
fi

case "$1" in
  dev|prod) mode="$1" ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

for dependency in node corepack; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    echo "Required command not found: $dependency. See the setup instructions in README.md." >&2
    exit 1
  fi
done

# A running dev server could overwrite webpack-stats.json after a production
# build. Fail before building rather than terminating an unrelated process.
node - "${DEV_SERVER_PORT:-3030}" "$mode" <<'NODE'
const net = require('node:net');
const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('DEV_SERVER_PORT must be an integer between 1 and 65535.');
  process.exit(1);
}
const probe = net.createServer();
probe.once('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Stop the existing frontend with Ctrl+C before selecting ${process.argv[3]}.`
    : `Cannot check frontend port ${port}: ${error.message}`);
  process.exitCode = 1;
});
probe.listen(port, () => probe.close());
NODE

if [[ "$mode" == dev ]]; then
  export NODE_ENV=development
  echo 'Starting DEV. After compilation, reload Fragalysis on port 8080; the footer should show DEV.'
  exec corepack yarn start
fi

export NODE_ENV=production
echo 'Building and selecting PROD. Keep other frontend watchers stopped.'
corepack yarn build
corepack yarn verify:moorhen-assets
echo 'PROD is ready. Reload Fragalysis on port 8080; the footer should show PROD.'
echo 'The existing Django/backend stack serves this bundle; no frontend dev server is needed.'

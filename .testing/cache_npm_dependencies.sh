# Cache npm deps
if [ ! -e /home/ubuntu/nvm/versions/node/v8.9.3/lib/node_modules/chimp/bin/chimp.js ]; then npm install -g chimp; fi
if [ ! -e /home/ubuntu/nvm/versions/node/v8.9.3/lib/node_modules/spacejam/bin/spacejam ]; then npm install -g spacejam; fi
npm install

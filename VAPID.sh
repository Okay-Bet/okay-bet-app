#!/bin/bash
# this helper script generates VAPID keys and adds them to the .env.local file
# Check if web-push is installed locally, if not install it
if [ ! -f "./node_modules/.bin/web-push" ]; then
    echo "web-push is not installed locally. Installing now..."
    npm install web-push
fi

# Generate VAPID keys
echo "Generating VAPID keys..."
VAPID_KEYS=$(npx web-push generate-vapid-keys --json)

# Extract public and private keys
PUBLIC_KEY=$(echo $VAPID_KEYS | grep -o '"publicKey":"[^"]*' | grep -o '[^"]*$')
PRIVATE_KEY=$(echo $VAPID_KEYS | grep -o '"privateKey":"[^"]*' | grep -o '[^"]*$')

# Update .env.local file
echo "Updating .env.local file..."
echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=$PUBLIC_KEY" > .env.local
echo "VAPID_PRIVATE_KEY=$PRIVATE_KEY" >> .env.local

echo "VAPID keys have been generated and added to .env.local"
echo "Make sure to add .env.local to your .gitignore file if you haven't already!"
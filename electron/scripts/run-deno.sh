#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Preserve existing PATH and add common Deno path
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.deno/bin:$PATH"

# Print debugging information
echo "Running deno with PATH: $PATH"
echo "Deno location: $(which deno 2>/dev/null || echo 'Deno not found')"

# Get the deno path
DENO_PATH=$(which deno)

if [ -z "$DENO_PATH" ]; then
  echo "Error: Deno executable not found in PATH"
  exit 1
fi

# Run deno with the arguments passed to this script
$DENO_PATH "$@" 
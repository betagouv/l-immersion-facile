#!/bin/bash

FILE_DESTINATION=${1:-./env-config.js}

rm -f "${FILE_DESTINATION}"
touch "${FILE_DESTINATION}"

echo "window._env_ = {" >> "${FILE_DESTINATION}"

# Get all lines of env that start with VITE_
lines=$(env | grep "^VITE_")

for line in $lines
do
  # Split env variables by character `=`
  if printf '%s\n' "$line" | grep -q -e '='; then
    varname=$(printf '%s\n' "$line" | sed -e 's/=.*//')
    value=$(printf '%s\n' "$line" | sed -e 's/^[^=]*=//')
  fi

  # Append configuration property to JS file
  echo "  $varname: \"$value\"," >> "${FILE_DESTINATION}"
done

echo "}" >> "${FILE_DESTINATION}"

echo "Generated ${FILE_DESTINATION}"

#!/bin/bash
cd "$(dirname "$0")"
(sleep 3 && xdg-open http://localhost:3001) &
npm start

#!/bin/bash

zip -r latency.zip . \
  -x "./.git/*" \
  -x "./.github/*" \
  -x "./.gitignore" \
  -x "./Makefile" \
  -x "./createZip.sh" \
  -x "./latency.zip"

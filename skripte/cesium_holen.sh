#!/usr/bin/env bash
# Lädt CesiumJS (fertiger Build aus dem npm-Paket) nach karte/cesium/, damit die Karte ohne fremdes CDN läuft.
set -euo pipefail
VERSION=1.138.0
basis="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "https://registry.npmjs.org/cesium/-/cesium-$VERSION.tgz" -o "$tmp/cesium.tgz"
tar -xzf "$tmp/cesium.tgz" -C "$tmp" package/Build/Cesium
rm -rf "$basis/karte/cesium"
mv "$tmp/package/Build/Cesium" "$basis/karte/cesium"
echo "CesiumJS $VERSION in karte/cesium"

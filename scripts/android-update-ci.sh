#!/usr/bin/env bash
set -euo pipefail
# Dedicated disposable CI emulator only. Never clears/uninstalls application data.
repo_root=$(cd "$(dirname "$0")/.." && pwd)
cd "$repo_root/frontend/android"
qa_dir="$RUNNER_TEMP/synex-update"
mkdir -p "$qa_dir"
cp app/build/outputs/apk/debug/app-debug.apk "$qa_dir/baseline.apk"
export SYNEX_VERSION_CODE=$((SYNEX_VERSION_CODE + 1))
./gradlew assembleDebug assembleDebugAndroidTest --no-daemon
cp app/build/outputs/apk/debug/app-debug.apk "$qa_dir/candidate.apk"
tool_dir="$ANDROID_HOME/build-tools/36.0.0"
actual_pin=$("$tool_dir/apksigner" verify --print-certs "$qa_dir/candidate.apk" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p')
if [ "${PERSONAL_SIGNING_REQUIRED:-false}" = true ] && [ "$actual_pin" != "$PERSONAL_SIGNER_SHA256" ]; then
  echo 'Signing certificate does not match the persistent distribution pin' >&2; exit 1
fi
serial=$(adb devices | awk '$2=="device" {print $1; exit}')
test -n "$serial"
python "$repo_root/scripts/verify-android-update.py" "$qa_dir/baseline.apk" "$qa_dir/candidate.apk" \
 --build-tools "$tool_dir" --signer-sha256 "$actual_pin" --serial "$serial" \
 --test-apk app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk --output "$qa_dir/update-report.json"
